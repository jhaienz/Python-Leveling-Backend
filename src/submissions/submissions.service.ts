import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { CreateSubmissionDto } from './dto';
import { ChallengesService } from '../challenges/challenges.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../ai/ai.service';
import { SubmissionStatus } from '../common/enums';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    private challengesService: ChallengesService,
    private usersService: UsersService,
    private aiService: AiService,
  ) {}

  async create(
    createSubmissionDto: CreateSubmissionDto,
    user: UserDocument,
  ): Promise<SubmissionDocument> {
    const challenge = await this.challengesService.findById(createSubmissionDto.challengeId);

    if (!challenge.isActive) {
      throw new BadRequestException('This challenge is not currently active');
    }

    // Check rate limiting (max 5 submissions per hour for this challenge)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSubmissions = await this.submissionModel.countDocuments({
      userId: user._id,
      challengeId: challenge._id,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentSubmissions >= 5) {
      throw new BadRequestException(
        'You have reached the maximum of 5 submissions per hour for this challenge',
      );
    }

    // Create submission
    const submission = new this.submissionModel({
      userId: user._id,
      challengeId: challenge._id,
      code: createSubmissionDto.code,
      status: SubmissionStatus.PENDING,
    });

    await submission.save();

    // Process submission asynchronously
    this.processSubmission(submission._id.toString(), challenge, user).catch((err) => {
      console.error('Error processing submission:', err);
    });

    return submission;
  }

  private async processSubmission(
    submissionId: string,
    challenge: Awaited<ReturnType<typeof this.challengesService.findById>>,
    user: UserDocument,
  ): Promise<void> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) return;

    try {
      // Update status to evaluating
      submission.status = SubmissionStatus.EVALUATING;
      await submission.save();

      // Evaluate code with AI
      const result = await this.aiService.evaluateCode({
        code: submission.code,
        problemStatement: challenge.problemStatement,
        evaluationPrompt: challenge.evaluationPrompt,
        testCases: challenge.testCases,
        starterCode: challenge.starterCode,
      });

      // Update submission with results
      submission.aiScore = result.score;
      submission.aiFeedback = result.feedback;
      submission.aiAnalysis = result.analysis;
      submission.aiSuggestions = result.suggestions;
      submission.status = result.passed ? SubmissionStatus.PASSED : SubmissionStatus.FAILED;
      submission.evaluatedAt = new Date();

      // Award XP and coins if passed
      if (result.passed) {
        const rewards = this.calculateRewards(challenge, result.score);
        submission.xpEarned = rewards.xp;
        submission.coinsEarned = rewards.coins;

        // Add XP to user (this may trigger level ups)
        const { levelsGained } = await this.usersService.addXp(
          user._id.toString(),
          rewards.xp,
        );

        // Add coins for challenge completion
        await this.usersService.addCoins(user._id.toString(), rewards.coins);

        // Add coins for any level ups
        for (const level of levelsGained) {
          const levelCoins = this.usersService.getCoinsForLevelUp(level);
          await this.usersService.addCoins(user._id.toString(), levelCoins);
        }
      }

      await submission.save();
    } catch (error) {
      submission.status = SubmissionStatus.ERROR;
      submission.aiFeedback = 'An error occurred during evaluation. Please try again.';
      await submission.save();
    }
  }

  private calculateRewards(
    challenge: { baseXpReward: number; bonusCoins: number; difficulty: number },
    aiScore: number,
  ): { xp: number; coins: number } {
    const baseXp = challenge.baseXpReward;
    const baseCoins = challenge.bonusCoins;

    // AI Score bonus (0-50% extra XP based on code quality)
    const aiScoreMultiplier = aiScore / 100;
    const aiBonus = Math.floor(baseXp * 0.5 * aiScoreMultiplier);

    // Difficulty multiplier (1.0 to 1.8)
    const difficultyMultiplier = 1 + (challenge.difficulty - 1) * 0.2;

    // Calculate totals
    const totalXp = Math.floor((baseXp + aiBonus) * difficultyMultiplier);
    const totalCoins = Math.floor(baseCoins * difficultyMultiplier);

    return { xp: totalXp, coins: totalCoins };
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ submissions: SubmissionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('challengeId', 'title difficulty')
        .exec(),
      this.submissionModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { submissions, total };
  }

  async findById(id: string, userId?: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel
      .findById(id)
      .populate('challengeId', 'title difficulty problemStatement')
      .exec();

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // If userId provided, check ownership
    if (userId && submission.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this submission');
    }

    return submission;
  }

  async findByChallenge(
    challengeId: string,
    page = 1,
    limit = 20,
  ): Promise<{ submissions: SubmissionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find({ challengeId: new Types.ObjectId(challengeId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name studentId')
        .exec(),
      this.submissionModel.countDocuments({
        challengeId: new Types.ObjectId(challengeId),
      }),
    ]);

    return { submissions, total };
  }

  async getSubmissionStats(userId: string) {
    const submissions = await this.submissionModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();

    const stats = {
      total: submissions.length,
      passed: submissions.filter((s) => s.status === SubmissionStatus.PASSED).length,
      failed: submissions.filter((s) => s.status === SubmissionStatus.FAILED).length,
      pending: submissions.filter(
        (s) =>
          s.status === SubmissionStatus.PENDING ||
          s.status === SubmissionStatus.EVALUATING,
      ).length,
      totalXpEarned: submissions.reduce((sum, s) => sum + (s.xpEarned || 0), 0),
      totalCoinsEarned: submissions.reduce((sum, s) => sum + (s.coinsEarned || 0), 0),
      averageScore:
        submissions.length > 0
          ? Math.round(
              submissions.reduce((sum, s) => sum + (s.aiScore || 0), 0) /
                submissions.filter((s) => s.aiScore !== undefined).length,
            )
          : 0,
    };

    return stats;
  }
}

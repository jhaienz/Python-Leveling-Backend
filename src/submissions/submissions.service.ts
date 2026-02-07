import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { CreateSubmissionDto, ReviewSubmissionDto } from './dto';
import { ChallengesService } from '../challenges/challenges.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../ai/ai.service';
import { SubmissionStatus } from '../common/enums';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    private challengesService: ChallengesService,
    private usersService: UsersService,
    private aiService: AiService,
  ) {}

  async create(
    createSubmissionDto: CreateSubmissionDto,
    user: UserDocument,
  ): Promise<SubmissionDocument> {
    const challenge = await this.challengesService.findById(
      createSubmissionDto.challengeId,
    );

    if (!challenge.isActive) {
      throw new BadRequestException('This challenge is not currently active');
    }

    // Check if user already has a submission for this challenge
    const existingSubmission = await this.submissionModel.findOne({
      userId: user._id,
      challengeId: challenge._id,
    });

    if (existingSubmission) {
      throw new BadRequestException(
        'You have already submitted a solution for this challenge. Only one submission per challenge is allowed.',
      );
    }

    // Create submission with explanation
    const submission = new this.submissionModel({
      userId: user._id,
      challengeId: challenge._id,
      code: createSubmissionDto.code,
      explanation: createSubmissionDto.explanation,
      explanationLanguage:
        createSubmissionDto.explanationLanguage || 'Not specified',
      status: SubmissionStatus.PENDING,
      isReviewed: false,
    });

    await submission.save();

    // Submission stored - admin will trigger AI evaluation manually
    return submission;
  }

  async analyzeSubmission(submissionId: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel
      .findById(submissionId)
      .populate('userId')
      .exec();

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException(
        'This submission has already been analyzed',
      );
    }

    const challenge = await this.challengesService.findById(
      submission.challengeId.toString(),
    );

    const user = submission.userId as unknown as UserDocument;

    // Process the submission
    await this.processSubmission(submissionId, challenge, user);

    // Return updated submission
    const updated = await this.submissionModel.findById(submissionId).exec();
    if (!updated) {
      throw new NotFoundException('Submission not found after processing');
    }
    return updated;
  }

  async findPendingAnalysis(
    page = 1,
    limit = 20,
  ): Promise<{ submissions: SubmissionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const query = {
      status: SubmissionStatus.PENDING,
    };

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name studentId')
        .populate('challengeId', 'title difficulty')
        .exec(),
      this.submissionModel.countDocuments(query),
    ]);

    return { submissions, total };
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
      submission.status = SubmissionStatus.ONGOING;
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
      submission.status = result.passed
        ? SubmissionStatus.COMPLETED
        : SubmissionStatus.FAILED;
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
      submission.aiFeedback =
        'An error occurred during evaluation. Please try again.';
      await submission.save();
    }
  }

  private calculateRewards(
    challenge: { baseXpReward: number; bonusCoins: number; difficulty: number },
    _aiScore: number,
  ): { xp: number; coins: number } {
    // Return exact values set on the challenge
    return {
      xp: challenge.baseXpReward,
      coins: challenge.bonusCoins,
    };
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
      this.submissionModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
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
      passed: submissions.filter((s) => s.status === SubmissionStatus.COMPLETED)
        .length,
      failed: submissions.filter((s) => s.status === SubmissionStatus.FAILED)
        .length,
      pending: submissions.filter(
        (s) =>
          s.status === SubmissionStatus.PENDING ||
          s.status === SubmissionStatus.ONGOING,
      ).length,
      totalXpEarned: submissions.reduce((sum, s) => sum + (s.xpEarned || 0), 0),
      totalCoinsEarned: submissions.reduce(
        (sum, s) => sum + (s.coinsEarned || 0),
        0,
      ),
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

  async reviewSubmission(
    submissionId: string,
    reviewDto: ReviewSubmissionDto,
    reviewer: UserDocument,
  ): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.isReviewed) {
      throw new BadRequestException(
        'This submission has already been reviewed',
      );
    }

    // Update review fields
    submission.isReviewed = true;
    submission.reviewedBy = reviewer._id;
    submission.reviewedAt = new Date();
    submission.explanationScore = reviewDto.explanationScore;
    submission.reviewerFeedback = reviewDto.feedback;
    submission.bonusXpFromReview = reviewDto.bonusXp || 0;
    submission.bonusCoinsFromReview = reviewDto.bonusCoins || 0;

    // Award bonus XP and coins to the student
    if (reviewDto.bonusXp && reviewDto.bonusXp > 0) {
      await this.usersService.addXp(
        submission.userId.toString(),
        reviewDto.bonusXp,
      );
    }

    if (reviewDto.bonusCoins && reviewDto.bonusCoins > 0) {
      await this.usersService.addCoins(
        submission.userId.toString(),
        reviewDto.bonusCoins,
      );
    }

    await submission.save();

    return submission;
  }

  async findPendingReviews(
    page = 1,
    limit = 20,
  ): Promise<{ submissions: SubmissionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const query = {
      isReviewed: false,
      status: { $in: [SubmissionStatus.COMPLETED, SubmissionStatus.FAILED] },
    };

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name studentId')
        .populate('challengeId', 'title difficulty')
        .exec(),
      this.submissionModel.countDocuments(query),
    ]);

    return { submissions, total };
  }
}

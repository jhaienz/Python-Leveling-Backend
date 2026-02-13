import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import {
  Submission,
  SubmissionDocument,
} from '../submissions/schemas/submission.schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { getTierForLevel } from '../common/enums';

@Injectable()
export class UsersService {
  private timezone: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    private configService: ConfigService,
  ) {
    this.timezone = this.configService.get<string>('TIMEZONE', 'Asia/Manila');
  }

  async createUser(displayName: string, email: string) {
    const user = new this.userModel({
      displayName: displayName,
      email: email,
    });

    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return user;
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(),
    ]);

    return { users, total };
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByStudentId(studentId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ studentId }).exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { lastLoginAt: new Date() })
      .exec();
  }

  async addXp(
    userId: string,
    xpAmount: number,
  ): Promise<{ user: UserDocument; levelsGained: number[] }> {
    const user = await this.findById(userId);

    let newXp = user.xp + xpAmount;
    let newLevel = user.level;
    const levelsGained: number[] = [];

    const MAX_LEVEL = 60;

    while (newLevel < MAX_LEVEL) {
      const xpRequired = this.getXpRequiredForLevel(newLevel);
      if (newXp >= xpRequired) {
        newXp -= xpRequired;
        newLevel++;
        levelsGained.push(newLevel);
      } else {
        break;
      }
    }

    user.xp = newXp;
    user.level = newLevel;
    await user.save();

    return { user, levelsGained };
  }

  async addCoins(userId: string, amount: number): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $inc: { coins: amount } }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deductCoins(userId: string, amount: number): Promise<UserDocument> {
    const user = await this.findById(userId);

    if (user.coins < amount) {
      throw new ConflictException('Insufficient coins');
    }

    user.coins -= amount;
    await user.save();

    return user;
  }

  async getLeaderboard(limit = 10): Promise<UserDocument[]> {
    return this.userModel
      .find()
      .sort({ level: -1, xp: -1 })
      .limit(limit)
      .exec();
  }

  async getWeeklyLeaderboard(
    limit = 10,
  ): Promise<
    Array<{ user: UserDocument; weeklyXp: number; submissionCount: number }>
  > {
    const { startOfWeek, endOfWeek } = this.getCurrentWeekRange();

    // Aggregate XP earned from submissions this week
    const weeklyStats = await this.submissionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      {
        $group: {
          _id: '$userId',
          weeklyXp: {
            $sum: {
              $add: [
                { $ifNull: ['$xpEarned', 0] },
                { $ifNull: ['$bonusXpFromReview', 0] },
              ],
            },
          },
          submissionCount: { $sum: 1 },
        },
      },
      {
        $match: {
          weeklyXp: { $gt: 0 },
        },
      },
      {
        $sort: { weeklyXp: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    // Get user details for each entry
    const results = await Promise.all(
      weeklyStats.map(async (stat) => {
        const user = await this.userModel.findById(stat._id).exec();
        return {
          user: user!,
          weeklyXp: stat.weeklyXp,
          submissionCount: stat.submissionCount,
        };
      }),
    );

    return results.filter((r) => r.user !== null);
  }

  getCurrentWeekRange(): { startOfWeek: Date; endOfWeek: Date } {
    const now = new Date();
    // Get date components in the configured timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(
      parts.find((p) => p.type === 'year')?.value || String(now.getFullYear()),
    );
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1');
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');

    // Create date in local timezone
    const localDate = new Date(year, month - 1, day);

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = localDate.getDay();

    // Calculate start of week (Saturday)
    const daysToSaturday = (dayOfWeek + 1) % 7;
    const startOfWeek = new Date(localDate);
    startOfWeek.setDate(localDate.getDate() - daysToSaturday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of week (Sunday 23:59:59)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 1);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  getCurrentWeekInfo(): { year: number; weekNumber: number } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(
      parts.find((p) => p.type === 'year')?.value || String(now.getFullYear()),
    );
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1');
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');

    const localDate = new Date(year, month - 1, day);
    const weekNumber = this.getISOWeekNumber(localDate);

    return { year, weekNumber };
  }

  private getISOWeekNumber(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNum = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 1);
    if (firstThursday.getDay() !== 4) {
      firstThursday.setMonth(0, 1 + ((4 - firstThursday.getDay() + 7) % 7));
    }
    const weekNum =
      1 +
      Math.ceil(
        (target.getTime() - firstThursday.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
    return weekNum;
  }

  getXpRequiredForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  getCoinsForLevelUp(level: number): number {
    const baseCoins = 50;
    const tierBonus = Math.floor(level / 10) * 25;
    const milestoneBonus = level % 10 === 0 ? 100 : 0;
    return baseCoins + tierBonus + milestoneBonus;
  }

  getProfileWithStats(user: UserDocument) {
    const tier = getTierForLevel(user.level);
    const xpRequired = this.getXpRequiredForLevel(user.level);
    const xpProgress = Math.round((user.xp / xpRequired) * 100);

    return {
      id: user._id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      level: user.level,
      xp: user.xp,
      xpRequired,
      xpProgress,
      coins: user.coins,
      tier: tier.name,
      tierColor: tier.color,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

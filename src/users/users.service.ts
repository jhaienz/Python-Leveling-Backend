import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { getTierForLevel } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      $or: [
        { studentId: createUserDto.studentId },
        ...(createUserDto.email ? [{ email: createUserDto.email }] : []),
      ],
    });

    if (existingUser) {
      if (existingUser.studentId === createUserDto.studentId) {
        throw new ConflictException('Student ID already registered');
      }
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = new this.userModel({
      studentId: createUserDto.studentId,
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash,
    });

    return user.save();
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
      studentId: user.studentId,
      name: user.name,
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

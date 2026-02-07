import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from './schemas/challenge.schema';
import { CreateChallengeDto, UpdateChallengeDto } from './dto';

@Injectable()
export class ChallengesService {
  private timezone: string;

  constructor(
    @InjectModel(Challenge.name)
    private challengeModel: Model<ChallengeDocument>,
    private configService: ConfigService,
  ) {
    this.timezone = this.configService.get<string>('TIMEZONE', 'Asia/Manila');
  }

  async create(
    createChallengeDto: CreateChallengeDto,
  ): Promise<ChallengeDocument> {
    const existingCount = await this.challengeModel.countDocuments({
      weekNumber: createChallengeDto.weekNumber,
      year: createChallengeDto.year,
    });

    if (existingCount >= 10) {
      throw new ConflictException(
        `A maximum of 10 challenges is allowed for week ${createChallengeDto.weekNumber} of ${createChallengeDto.year}`,
      );
    }

    const challenge = new this.challengeModel(createChallengeDto);
    return challenge.save();
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ challenges: ChallengeDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [challenges, total] = await Promise.all([
      this.challengeModel
        .find()
        .sort({ year: -1, weekNumber: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.challengeModel.countDocuments(),
    ]);

    return { challenges, total };
  }

  async findById(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }
    return challenge;
  }

  async findCurrentWeekChallenges(): Promise<ChallengeDocument[]> {
    const { year, weekNumber } = this.getCurrentWeekInfo();

    return this.challengeModel
      .find({ weekNumber, year, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  getCurrentWeekInfo(): { year: number; weekNumber: number } {
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
    const month = parseInt(
      parts.find((p) => p.type === 'month')?.value || '1',
    );
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');

    // Create a date in local time for week calculation
    const localDate = new Date(year, month - 1, day);
    const weekNumber = this.getISOWeekNumber(localDate);

    return { year, weekNumber };
  }

  async update(
    id: string,
    updateChallengeDto: UpdateChallengeDto,
  ): Promise<ChallengeDocument> {
    const dto = updateChallengeDto as Partial<CreateChallengeDto>;
    if (dto.weekNumber || dto.year) {
      const existingCount = await this.challengeModel.countDocuments({
        weekNumber: dto.weekNumber,
        year: dto.year,
        _id: { $ne: id },
      });

      if (existingCount >= 10) {
        throw new ConflictException(
          `A maximum of 10 challenges is allowed for week ${dto.weekNumber} of ${dto.year}`,
        );
      }
    }

    const challenge = await this.challengeModel
      .findByIdAndUpdate(id, updateChallengeDto, { new: true })
      .exec();

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  async delete(id: string): Promise<void> {
    const result = await this.challengeModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Challenge not found');
    }
  }

  async activate(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  async deactivate(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  private getISOWeekNumber(date: Date): number {
    // ISO 8601 week number calculation
    // Week 1 is the week containing the first Thursday of the year
    const target = new Date(date.valueOf());
    // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
    const dayNum = (date.getDay() + 6) % 7; // Convert Sunday=0 to Sunday=6, Monday=0
    target.setDate(target.getDate() - dayNum + 3);
    // Get first Thursday of year
    const firstThursday = new Date(target.getFullYear(), 0, 1);
    if (firstThursday.getDay() !== 4) {
      firstThursday.setMonth(0, 1 + ((4 - firstThursday.getDay() + 7) % 7));
    }
    // Calculate week number
    const weekNum =
      1 +
      Math.ceil(
        (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
    return weekNum;
  }
}

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from './schemas/challenge.schema';
import { CreateChallengeDto, UpdateChallengeDto } from './dto';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
  ) {}

  async create(createChallengeDto: CreateChallengeDto): Promise<ChallengeDocument> {
    const existingChallenge = await this.challengeModel.findOne({
      weekNumber: createChallengeDto.weekNumber,
      year: createChallengeDto.year,
    });

    if (existingChallenge) {
      throw new ConflictException(
        `A challenge already exists for week ${createChallengeDto.weekNumber} of ${createChallengeDto.year}`,
      );
    }

    const challenge = new this.challengeModel(createChallengeDto);
    return challenge.save();
  }

  async findAll(page = 1, limit = 20): Promise<{ challenges: ChallengeDocument[]; total: number }> {
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

  async findCurrentWeekChallenge(): Promise<ChallengeDocument | null> {
    const now = new Date();
    const year = now.getFullYear();
    const weekNumber = this.getWeekNumber(now);

    return this.challengeModel
      .findOne({ weekNumber, year, isActive: true })
      .exec();
  }

  async update(id: string, updateChallengeDto: UpdateChallengeDto): Promise<ChallengeDocument> {
    const dto = updateChallengeDto as Partial<CreateChallengeDto>;
    if (dto.weekNumber || dto.year) {
      const existingChallenge = await this.challengeModel.findOne({
        weekNumber: dto.weekNumber,
        year: dto.year,
        _id: { $ne: id },
      });

      if (existingChallenge) {
        throw new ConflictException(
          `A challenge already exists for week ${dto.weekNumber} of ${dto.year}`,
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

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

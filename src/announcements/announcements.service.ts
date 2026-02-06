import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
} from './schemas/announcement.schema';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name)
    private announcementModel: Model<AnnouncementDocument>,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    authorId: string,
  ): Promise<AnnouncementDocument> {
    const announcement = new this.announcementModel({
      ...dto,
      authorId: new Types.ObjectId(authorId),
      publishedAt: dto.isPublished ? new Date() : undefined,
    });

    return announcement.save();
  }

  async findAllPublished(): Promise<AnnouncementDocument[]> {
    return this.announcementModel
      .find({ isPublished: true })
      .sort({ isPinned: -1, publishedAt: -1 })
      .populate('authorId', 'name')
      .exec();
  }

  async findAllAdmin(
    page = 1,
    limit = 20,
  ): Promise<{ announcements: AnnouncementDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      this.announcementModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name')
        .exec(),
      this.announcementModel.countDocuments(),
    ]);

    return { announcements, total };
  }

  async findById(id: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel
      .findById(id)
      .populate('authorId', 'name')
      .exec();

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementDocument> {
    const updateData: Record<string, unknown> = { ...dto };

    // If being published for the first time, set publishedAt
    if (dto.isPublished === true) {
      const existing = await this.announcementModel.findById(id);
      if (existing && !existing.isPublished) {
        updateData.publishedAt = new Date();
      }
    }

    const announcement = await this.announcementModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('authorId', 'name')
      .exec();

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async delete(id: string): Promise<void> {
    const result = await this.announcementModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Announcement not found');
    }
  }

  async publish(id: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel
      .findByIdAndUpdate(
        id,
        { isPublished: true, publishedAt: new Date() },
        { new: true },
      )
      .populate('authorId', 'name')
      .exec();

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async unpublish(id: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel
      .findByIdAndUpdate(id, { isPublished: false }, { new: true })
      .populate('authorId', 'name')
      .exec();

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async togglePin(id: string): Promise<AnnouncementDocument> {
    const announcement = await this.findById(id);
    announcement.isPinned = !announcement.isPinned;
    await announcement.save();
    return announcement;
  }
}

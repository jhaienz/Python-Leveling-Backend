import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  async findAllPublished() {
    const announcements = await this.announcementsService.findAllPublished();

    return announcements.map((a) => ({
      id: a._id,
      title: a.title,
      content: a.content,
      author: a.authorId,
      isPinned: a.isPinned,
      publishedAt: a.publishedAt,
    }));
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  async findAllAdmin(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { announcements, total } = await this.announcementsService.findAllAdmin(
      parsedPage,
      parsedLimit,
    );

    return {
      data: announcements,
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.announcementsService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.announcementsService.create(dto, user._id.toString());
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    await this.announcementsService.delete(id);
    return { message: 'Announcement deleted successfully' };
  }

  @Post(':id/publish')
  @Roles(Role.ADMIN)
  async publish(@Param('id') id: string) {
    const announcement = await this.announcementsService.publish(id);
    return { message: 'Announcement published', announcement };
  }

  @Post(':id/unpublish')
  @Roles(Role.ADMIN)
  async unpublish(@Param('id') id: string) {
    const announcement = await this.announcementsService.unpublish(id);
    return { message: 'Announcement unpublished', announcement };
  }

  @Post(':id/toggle-pin')
  @Roles(Role.ADMIN)
  async togglePin(@Param('id') id: string) {
    const announcement = await this.announcementsService.togglePin(id);
    return {
      message: announcement.isPinned ? 'Announcement pinned' : 'Announcement unpinned',
      announcement,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto';
import { JwtAuthGuard, RolesGuard, WeekendOnlyGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(WeekendOnlyGuard)
  async create(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @CurrentUser() user: UserDocument,
  ) {
    const submission = await this.submissionsService.create(createSubmissionDto, user);

    return {
      id: submission._id,
      status: submission.status,
      message: 'Submission received. Evaluation in progress...',
    };
  }

  @Get()
  async findOwn(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { submissions, total } = await this.submissionsService.findByUser(
      user._id.toString(),
      parsedPage,
      parsedLimit,
    );

    return {
      data: submissions.map((s) => ({
        id: s._id,
        challengeId: s.challengeId,
        status: s.status,
        aiScore: s.aiScore,
        xpEarned: s.xpEarned,
        coinsEarned: s.coinsEarned,
        createdAt: s.createdAt,
      })),
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get('stats')
  async getStats(@CurrentUser() user: UserDocument) {
    return this.submissionsService.getSubmissionStats(user._id.toString());
  }

  @Get('challenge/:challengeId')
  @Roles(Role.ADMIN)
  async findByChallenge(
    @Param('challengeId') challengeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { submissions, total } = await this.submissionsService.findByChallenge(
      challengeId,
      parsedPage,
      parsedLimit,
    );

    return {
      data: submissions,
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const isAdmin = user.role === Role.ADMIN;
    const submission = await this.submissionsService.findById(
      id,
      isAdmin ? undefined : user._id.toString(),
    );

    return {
      id: submission._id,
      challengeId: submission.challengeId,
      code: submission.code,
      status: submission.status,
      aiScore: submission.aiScore,
      aiFeedback: submission.aiFeedback,
      aiAnalysis: submission.aiAnalysis,
      aiSuggestions: submission.aiSuggestions,
      xpEarned: submission.xpEarned,
      coinsEarned: submission.coinsEarned,
      createdAt: submission.createdAt,
      evaluatedAt: submission.evaluatedAt,
    };
  }
}

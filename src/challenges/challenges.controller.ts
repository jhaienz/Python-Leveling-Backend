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
  NotFoundException,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto, UpdateChallengeDto } from './dto';
import { JwtAuthGuard, RolesGuard, WeekendOnlyGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { Role } from '../common/enums';

@Controller('challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('current')
  @UseGuards(WeekendOnlyGuard)
  async getCurrentChallenge() {
    const challenge = await this.challengesService.findCurrentWeekChallenge();

    if (!challenge) {
      throw new NotFoundException('No active challenge for this week');
    }

    return {
      id: challenge._id,
      title: challenge.title,
      description: challenge.description,
      problemStatement: challenge.problemStatement,
      starterCode: challenge.starterCode,
      difficulty: challenge.difficulty,
      baseXpReward: challenge.baseXpReward,
      bonusCoins: challenge.bonusCoins,
      testCases: challenge.testCases.map((tc) => ({
        input: tc.input,
        // Only show first 2 test cases as examples
      })).slice(0, 2),
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { challenges, total } = await this.challengesService.findAll(
      parsedPage,
      parsedLimit,
    );

    return {
      data: challenges,
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.challengesService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createChallengeDto: CreateChallengeDto) {
    return this.challengesService.create(createChallengeDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateChallengeDto: UpdateChallengeDto,
  ) {
    return this.challengesService.update(id, updateChallengeDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    await this.challengesService.delete(id);
    return { message: 'Challenge deleted successfully' };
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  async activate(@Param('id') id: string) {
    const challenge = await this.challengesService.activate(id);
    return { message: 'Challenge activated', challenge };
  }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  async deactivate(@Param('id') id: string) {
    const challenge = await this.challengesService.deactivate(id);
    return { message: 'Challenge deactivated', challenge };
  }
}

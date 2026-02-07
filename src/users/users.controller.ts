import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, GrantCoinsDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Role } from '../common/enums';
import { UserDocument } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfileWithStats(user);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const users = await this.usersService.getLeaderboard(
      Math.min(parsedLimit, 100),
    );

    return users.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      level: user.level,
      tier: this.usersService.getProfileWithStats(user).tier,
    }));
  }

  @Get('leaderboard/weekly')
  async getWeeklyLeaderboard(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const weeklyStats = await this.usersService.getWeeklyLeaderboard(
      Math.min(parsedLimit, 100),
    );

    const weekInfo = this.usersService.getCurrentWeekInfo();

    return {
      week: weekInfo.weekNumber,
      year: weekInfo.year,
      data: weeklyStats.map((stat, index) => ({
        rank: index + 1,
        id: stat.user._id,
        name: stat.user.name,
        level: stat.user.level,
        tier: this.usersService.getProfileWithStats(stat.user).tier,
        weeklyXp: stat.weeklyXp,
        submissionCount: stat.submissionCount,
      })),
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { users, total } = await this.usersService.findAll(
      parsedPage,
      parsedLimit,
    );

    return {
      data: users,
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
    const user = await this.usersService.findById(id);
    return this.usersService.getProfileWithStats(user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return this.usersService.getProfileWithStats(user);
  }

  @Post(':id/grant-coins')
  @Roles(Role.ADMIN)
  async grantCoins(
    @Param('id') id: string,
    @Body() grantCoinsDto: GrantCoinsDto,
  ) {
    const user = await this.usersService.addCoins(id, grantCoinsDto.amount);
    return {
      message: `Granted ${grantCoinsDto.amount} coins to user`,
      newBalance: user.coins,
    };
  }
}

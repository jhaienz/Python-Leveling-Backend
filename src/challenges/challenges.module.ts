import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { WeekendOnlyGuard } from '../common/guards';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
    ]),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService, WeekendOnlyGuard],
  exports: [ChallengesService],
})
export class ChallengesModule {}

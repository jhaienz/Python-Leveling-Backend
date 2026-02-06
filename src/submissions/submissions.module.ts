import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { ChallengesModule } from '../challenges/challenges.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';
import { WeekendOnlyGuard } from '../common/guards';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    ChallengesModule,
    UsersModule,
    AiModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, WeekendOnlyGuard],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}

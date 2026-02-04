import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubmissionStatus } from '../../common/enums';
import { CodeAnalysis } from '../../ai/interfaces/code-evaluation.interface';

export type SubmissionDocument = HydratedDocument<Submission>;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true, index: true })
  challengeId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({
    type: String,
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
    index: true,
  })
  status: SubmissionStatus;

  @Prop({ min: 0, max: 100 })
  aiScore?: number;

  @Prop()
  aiFeedback?: string;

  @Prop({ type: Object })
  aiAnalysis?: CodeAnalysis;

  @Prop({ type: [String] })
  aiSuggestions?: string[];

  @Prop()
  xpEarned?: number;

  @Prop()
  coinsEarned?: number;

  @Prop()
  evaluatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

SubmissionSchema.index({ userId: 1, challengeId: 1 });
SubmissionSchema.index({ createdAt: -1 });

SubmissionSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

SubmissionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChallengeDocument = HydratedDocument<Challenge>;

export interface TestCase {
  input: string;
  expectedOutput: string;
}

@Schema({ timestamps: true })
export class Challenge {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  problemStatement: string;

  @Prop()
  starterCode?: string;

  @Prop({ type: [{ input: String, expectedOutput: String }], default: [] })
  testCases: TestCase[];

  @Prop({ required: true })
  evaluationPrompt: string;

  @Prop({ default: 1, min: 1, max: 5 })
  difficulty: number;

  @Prop({ default: 100 })
  baseXpReward: number;

  @Prop({ default: 10 })
  bonusCoins: number;

  @Prop({ required: true })
  weekNumber: number;

  @Prop({ required: true })
  year: number;

  @Prop({ default: false })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);

ChallengeSchema.index({ weekNumber: 1, year: 1 }, { unique: true });
ChallengeSchema.index({ isActive: 1 });

ChallengeSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

ChallengeSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

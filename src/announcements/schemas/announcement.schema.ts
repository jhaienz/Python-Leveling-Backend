import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AnnouncementDocument = HydratedDocument<Announcement>;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop()
  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

AnnouncementSchema.index({ isPublished: 1, publishedAt: -1 });
AnnouncementSchema.index({ isPinned: -1 });

AnnouncementSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

AnnouncementSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

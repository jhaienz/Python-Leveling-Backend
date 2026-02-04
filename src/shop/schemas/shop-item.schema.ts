import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ShopItemDocument = HydratedDocument<ShopItem>;

@Schema({ timestamps: true })
export class ShopItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  imageUrl?: string;

  @Prop({ required: true, min: 1 })
  coinPrice: number;

  @Prop({ default: null })
  stock?: number;

  @Prop({ default: 1, min: 1 })
  minLevel: number;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ShopItemSchema = SchemaFactory.createForClass(ShopItem);

ShopItemSchema.index({ isActive: 1 });
ShopItemSchema.index({ minLevel: 1 });

ShopItemSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

ShopItemSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

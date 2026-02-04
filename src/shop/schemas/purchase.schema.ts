import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema({ timestamps: true })
export class Purchase {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ShopItem', required: true })
  itemId: Types.ObjectId;

  @Prop({ default: 1, min: 1 })
  quantity: number;

  @Prop({ required: true })
  totalCost: number;

  @Prop({ unique: true, default: () => uuidv4() })
  redemptionCode: string;

  @Prop({ default: false })
  isRedeemed: boolean;

  @Prop()
  redeemedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);

PurchaseSchema.index({ redemptionCode: 1 });

PurchaseSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

PurchaseSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});

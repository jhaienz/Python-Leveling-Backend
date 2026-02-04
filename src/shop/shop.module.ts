import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShopItem, ShopItemSchema } from './schemas/shop-item.schema';
import { Purchase, PurchaseSchema } from './schemas/purchase.schema';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopItem.name, schema: ShopItemSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
    UsersModule,
    TransactionsModule,
  ],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}

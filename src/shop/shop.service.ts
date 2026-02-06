import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShopItem, ShopItemDocument } from './schemas/shop-item.schema';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';
import { CreateShopItemDto, UpdateShopItemDto } from './dto';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../common/enums';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(ShopItem.name) private shopItemModel: Model<ShopItemDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    private usersService: UsersService,
    private transactionsService: TransactionsService,
  ) {}

  async createItem(dto: CreateShopItemDto): Promise<ShopItemDocument> {
    const item = new this.shopItemModel(dto);
    return item.save();
  }

  async findAllItems(userLevel?: number): Promise<ShopItemDocument[]> {
    const query: Record<string, unknown> = { isActive: true };

    if (userLevel !== undefined) {
      query.minLevel = { $lte: userLevel };
    }

    return this.shopItemModel.find(query).sort({ coinPrice: 1 }).exec();
  }

  async findAllItemsAdmin(
    page = 1,
    limit = 20,
  ): Promise<{ items: ShopItemDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.shopItemModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.shopItemModel.countDocuments(),
    ]);

    return { items, total };
  }

  async findItemById(id: string): Promise<ShopItemDocument> {
    const item = await this.shopItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException('Shop item not found');
    }
    return item;
  }

  async updateItem(
    id: string,
    dto: UpdateShopItemDto,
  ): Promise<ShopItemDocument> {
    const item = await this.shopItemModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!item) {
      throw new NotFoundException('Shop item not found');
    }

    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const result = await this.shopItemModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Shop item not found');
    }
  }

  async purchase(
    itemId: string,
    user: UserDocument,
    quantity = 1,
  ): Promise<PurchaseDocument> {
    const item = await this.findItemById(itemId);

    if (!item.isActive) {
      throw new BadRequestException('This item is not available for purchase');
    }

    if (user.level < item.minLevel) {
      throw new BadRequestException(
        `You must be at least level ${item.minLevel} to purchase this item`,
      );
    }

    const totalCost = item.coinPrice * quantity;

    if (user.coins < totalCost) {
      throw new BadRequestException(
        `Insufficient coins. You need ${totalCost} coins but only have ${user.coins}`,
      );
    }

    if (item.stock != null && item.stock < quantity) {
      throw new BadRequestException(
        item.stock === 0
          ? 'This item is out of stock'
          : `Only ${item.stock} items available`,
      );
    }

    // Deduct coins
    await this.usersService.deductCoins(user._id.toString(), totalCost);

    // Update stock if applicable
    if (item.stock != null) {
      item.stock -= quantity;
      await item.save();
    }

    // Create purchase record
    const purchase = new this.purchaseModel({
      userId: user._id,
      itemId: item._id,
      quantity,
      totalCost,
    });

    await purchase.save();

    // Log transaction
    const updatedUser = await this.usersService.findById(user._id.toString());
    await this.transactionsService.create({
      userId: user._id.toString(),
      type: TransactionType.SHOP_PURCHASE,
      amount: -totalCost,
      balance: updatedUser.coins,
      description: `Purchased ${quantity}x ${item.name}`,
      referenceId: purchase._id.toString(),
      referenceType: 'purchase',
    });

    return purchase.populate('itemId');
  }

  async findUserPurchases(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ purchases: PurchaseDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      this.purchaseModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('itemId', 'name description imageUrl')
        .exec(),
      this.purchaseModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { purchases, total };
  }

  async redeemPurchase(purchaseId: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel
      .findById(purchaseId)
      .populate('itemId')
      .exec();

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.isRedeemed) {
      throw new ConflictException('This purchase has already been redeemed');
    }

    purchase.isRedeemed = true;
    purchase.redeemedAt = new Date();
    await purchase.save();

    return purchase;
  }

  async findPurchaseByRedemptionCode(code: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel
      .findOne({ redemptionCode: code })
      .populate('itemId')
      .populate('userId', 'name studentId')
      .exec();

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    return purchase;
  }
}

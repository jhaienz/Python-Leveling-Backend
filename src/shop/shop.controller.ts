import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopItemDto, UpdateShopItemDto, PurchaseDto } from './dto';
import { RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/enums';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('shop')
@UseGuards(RolesGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async findAllItems(@CurrentUser() user: UserDocument) {
    const items = await this.shopService.findAllItems(user.level);

    return items.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      coinPrice: item.coinPrice,
      stock: item.stock,
      minLevel: item.minLevel,
      canAfford: user.coins >= item.coinPrice,
    }));
  }

  @Get('items/admin')
  @Roles(Role.ADMIN)
  async findAllItemsAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { items, total } = await this.shopService.findAllItemsAdmin(
      parsedPage,
      parsedLimit,
    );

    return {
      data: items,
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get('items/:id')
  async findItem(@Param('id') id: string) {
    return this.shopService.findItemById(id);
  }

  @Post('items')
  @Roles(Role.ADMIN)
  async createItem(@Body() dto: CreateShopItemDto) {
    return this.shopService.createItem(dto);
  }

  @Patch('items/:id')
  @Roles(Role.ADMIN)
  async updateItem(@Param('id') id: string, @Body() dto: UpdateShopItemDto) {
    return this.shopService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @Roles(Role.ADMIN)
  async deleteItem(@Param('id') id: string) {
    await this.shopService.deleteItem(id);
    return { message: 'Item deleted successfully' };
  }

  @Post('purchase/:itemId')
  async purchase(
    @Param('itemId') itemId: string,
    @Body() dto: PurchaseDto,
    @CurrentUser() user: UserDocument,
  ) {
    const purchase = await this.shopService.purchase(
      itemId,
      user,
      dto.quantity || 1,
    );

    return {
      message: 'Purchase successful',
      purchase: {
        id: purchase._id,
        itemId: purchase.itemId,
        quantity: purchase.quantity,
        totalCost: purchase.totalCost,
        redemptionCode: purchase.redemptionCode,
      },
    };
  }

  @Get('purchases')
  async findOwnPurchases(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { purchases, total } = await this.shopService.findUserPurchases(
      user._id.toString(),
      parsedPage,
      parsedLimit,
    );

    return {
      data: purchases.map((p) => ({
        id: p._id,
        item: p.itemId,
        quantity: p.quantity,
        totalCost: p.totalCost,
        redemptionCode: p.redemptionCode,
        isRedeemed: p.isRedeemed,
        redeemedAt: p.redeemedAt,
        purchasedAt: p.createdAt,
      })),
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get('purchases/code/:code')
  @Roles(Role.ADMIN)
  async findByRedemptionCode(@Param('code') code: string) {
    return this.shopService.findPurchaseByRedemptionCode(code);
  }

  @Post('purchases/:id/redeem')
  @Roles(Role.ADMIN)
  async redeemPurchase(@Param('id') id: string) {
    const purchase = await this.shopService.redeemPurchase(id);
    return {
      message: 'Purchase redeemed successfully',
      purchase,
    };
  }
}

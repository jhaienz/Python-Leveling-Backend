import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

import { CurrentUser } from '../common/decorators';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findOwn(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const { transactions, total } = await this.transactionsService.findByUser(
      user._id.toString(),
      parsedPage,
      parsedLimit,
    );

    return {
      data: transactions,
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: UserDocument) {
    return this.transactionsService.getTransactionSummary(user._id.toString());
  }
}

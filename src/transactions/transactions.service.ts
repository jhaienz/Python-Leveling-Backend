import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionType } from '../common/enums';

export interface CreateTransactionDto {
  userId: string;
  type: TransactionType;
  amount: number;
  balance: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(dto: CreateTransactionDto): Promise<TransactionDocument> {
    const transaction = new this.transactionModel({
      userId: new Types.ObjectId(dto.userId),
      type: dto.type,
      amount: dto.amount,
      balance: dto.balance,
      description: dto.description,
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
    });

    return transaction.save();
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ transactions: TransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { transactions, total };
  }

  async getTransactionSummary(userId: string) {
    const transactions = await this.transactionModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();

    const summary = {
      totalEarned: 0,
      totalSpent: 0,
      byType: {} as Record<TransactionType, number>,
    };

    for (const type of Object.values(TransactionType)) {
      summary.byType[type] = 0;
    }

    for (const tx of transactions) {
      if (tx.amount > 0) {
        summary.totalEarned += tx.amount;
      } else {
        summary.totalSpent += Math.abs(tx.amount);
      }
      summary.byType[tx.type] += tx.amount;
    }

    return summary;
  }
}

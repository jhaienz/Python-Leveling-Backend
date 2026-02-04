import { IsNumber, IsOptional, Min } from 'class-validator';

export class PurchaseDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

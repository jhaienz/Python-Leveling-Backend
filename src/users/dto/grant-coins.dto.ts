import { IsNumber, IsPositive, IsString, IsOptional, MaxLength } from 'class-validator';

export class GrantCoinsDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

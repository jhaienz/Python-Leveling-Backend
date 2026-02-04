import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateShopItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsNumber()
  @Min(1)
  coinPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

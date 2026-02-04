import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestCaseDto {
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  expectedOutput: string;
}

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  problemStatement: string;

  @IsOptional()
  @IsString()
  starterCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases: TestCaseDto[];

  @IsString()
  @IsNotEmpty()
  evaluationPrompt: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  baseXpReward?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusCoins?: number;

  @IsNumber()
  @Min(1)
  @Max(53)
  weekNumber: number;

  @IsNumber()
  @Min(2024)
  year: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

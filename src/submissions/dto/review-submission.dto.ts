import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class ReviewSubmissionDto {
  @IsInt()
  @Min(0)
  @Max(100)
  explanationScore: number; // How well they explained (0-100)

  @IsInt()
  @Min(0)
  @Max(500)
  @IsOptional()
  bonusXp?: number; // Additional XP to grant (0-500)

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  bonusCoins?: number; // Additional coins to grant (0-100)

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  feedback?: string; // Reviewer's feedback to the student
}

import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsMongoId,
  IsOptional,
  MinLength,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10240, { message: 'Code cannot exceed 10KB' })
  code: string;

  @IsMongoId()
  challengeId: string;

  @IsString()
  @IsNotEmpty({ message: 'Please explain your code in your native language' })
  @MinLength(50, {
    message: 'Explanation must be at least 50 characters to show understanding',
  })
  @MaxLength(5000, { message: 'Explanation cannot exceed 5000 characters' })
  explanation: string;

  @IsString()
  @IsOptional()
  explanationLanguage?: string; // e.g., "Bicol", "Tagalog", "Cebuano", "English"
}

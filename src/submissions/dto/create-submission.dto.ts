import { IsString, IsNotEmpty, MaxLength, IsMongoId } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10240, { message: 'Code cannot exceed 10KB' })
  code: string;

  @IsMongoId()
  challengeId: string;
}

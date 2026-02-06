import {
  IsString,
  IsOptional,
  MaxLength,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { Role } from '../../common/enums';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

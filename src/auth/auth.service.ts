import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return this.generateAuthResponse(user);
  }

  async validateUser(studentId: string, password: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByStudentId(studentId);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: UserDocument) {
    await this.usersService.updateLastLogin(user._id.toString());
    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      studentId: user.studentId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.usersService.getProfileWithStats(user),
    };
  }
}

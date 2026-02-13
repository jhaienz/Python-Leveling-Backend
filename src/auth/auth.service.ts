import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UserDetails } from 'src/utils/types';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(details: UserDetails) {
    console.log('Validating user with details:', details);
    const user = await this.usersService.findByEmail(details.email);
    if (user) {
      console.log('User found:', user);
      return user;
    } else {
      console.log('No user found with email:', details.email);
      // Optionally, create a new user here if not found
      const newUser = await this.usersService.createUser(
        details.displayName,
        details.email,
      );
      console.log('New user created:', newUser);
      return newUser;
    }
  }

  async findById(id: string) {
    return this.usersService.findById(id);
  }

  // async validateUser(
  //   studentId: string,
  //   password: string,
  // ): Promise<UserDocument | null> {
  //   const user = await this.usersService.findByStudentId(studentId);

  //   if (!user) {
  //     return null;
  //   }

  //   const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  //   if (!isPasswordValid) {
  //     return null;
  //   }

  //   return user;
  // }

  // async login(user: UserDocument) {
  //   await this.usersService.updateLastLogin(user._id.toString());
  //   return this.generateAuthResponse(user);
  // }

  // private generateAuthResponse(user: UserDocument) {
  //   const payload = {
  //     sub: user._id.toString(),
  //     studentId: user.studentId,
  //   };

  //   return {
  //     accessToken: this.jwtService.sign(payload),
  //     user: this.usersService.getProfileWithStats(user),
  //   };
  // }
}

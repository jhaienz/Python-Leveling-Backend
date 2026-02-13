import { Controller, Req, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Public, CurrentUser } from '../common/decorators';
import { Request } from 'express';
import { GoogleAuthGuard } from 'src/common/guards/Guards';

@Controller('auth')
export class AuthController {
  constructor() {}

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  handleLogin() {
    return { message: 'Google authentication successful' };
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  handleRedirect() {
    return { message: 'Google redirect successful' };
  }

  @Get('google/status')
  @UseGuards(GoogleAuthGuard)
  user(@Req() request: Request) {
    console.log(request.user);
    if (request.user) {
      return { msg: 'Authenticated' };
    } else {
      return { msg: 'Not Authenticated' };
    }
  }
  // @UseGuards(JwtAuthGuard)
  // @Get('me')
  // getMe(@CurrentUser() user: UserDocument) {
  //   return this.usersService.getProfileWithStats(user);
  // }
}

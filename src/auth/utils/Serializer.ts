import { Inject, Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UserDocument } from 'src/users/schemas/user.schema';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {
    super();
  }

  serializeUser(user: UserDocument, done: Function) {
    console.log('Serializing user:', user);
    done(null, user._id);
  }

  async deserializeUser(payload: any, done: Function) {
    const user = await this.authService.findById(payload);
    console.log('Deserializing user:', user);
    return user ? done(null, user) : done(null, null);
  }
}

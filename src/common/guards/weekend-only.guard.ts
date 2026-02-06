import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WeekendOnlyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow bypass in development if configured
    const bypassWeekend = this.configService.get<string | boolean>(
      'BYPASS_WEEKEND_CHECK',
    );
    if (this.isTruthy(bypassWeekend)) {
      return true;
    }

    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    const isWeekend = day === 0 || day === 6;

    if (!isWeekend) {
      throw new ForbiddenException(
        'Challenges are only available on Saturday and Sunday. Please come back during the weekend!',
      );
    }

    return true;
  }

  private isTruthy(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value !== 'string') {
      return false;
    }
    return ['true', '1', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
  }
}

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

    // Use configured timezone (defaults to Asia/Manila for Philippines)
    const timezone = this.configService.get<string>(
      'TIMEZONE',
      'Asia/Manila',
    );

    const now = new Date();
    // Get the day in the configured timezone
    const day = this.getDayInTimezone(now, timezone);

    const isWeekend = day === 0 || day === 6; // 0 = Sunday, 6 = Saturday

    if (!isWeekend) {
      throw new ForbiddenException(
        'Challenges are only available on Saturday and Sunday. Please come back during the weekend!',
      );
    }

    return true;
  }

  private getDayInTimezone(date: Date, timezone: string): number {
    // Get the day of week in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const dayName = formatter.format(date);

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return dayMap[dayName] ?? date.getDay();
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

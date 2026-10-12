import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller(['notifications', ''])
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'getNotifications()' })
  @Get()
  getNotifications(@CurrentUser() user: UserClaims) {
    return this.notificationsService.findAll(user.userId);
  }

  @ApiOperation({ summary: 'markAllAsRead()' })
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: UserClaims) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @ApiOperation({ summary: 'markNotificationAsRead()' })
  @Patch(':notificationId/read')
  markAsRead(@Param('notificationId') notificationId: string, @CurrentUser() user: UserClaims) {
    return this.notificationsService.markAsRead(user.userId, notificationId);
  }

  // pushInAppNotification moved to gRPC — see notifications.grpc.controller.ts.
}

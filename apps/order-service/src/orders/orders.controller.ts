import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'getOrders()' })
  @Get('orders')
  getOrders(@Query('role') role: string, @CurrentUser() user: UserClaims) {
    return this.ordersService.findAllForUser(user.userId, role);
  }

  @ApiOperation({ summary: 'getOrderDetails()' })
  @Get('orders/:orderId')
  getOrderDetails(@Param('orderId') orderId: string, @CurrentUser() user: UserClaims) {
    return this.ordersService.findOneForUser(orderId, user.userId);
  }

  @ApiOperation({ summary: 'placeOrder()' })
  @Post('orders')
  placeOrder(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.ordersService.create({ ...body, buyerId: user.userId });
  }

  @ApiOperation({ summary: 'generateQRCode()' })
  @Post('orders/:orderId/qr-code')
  generateQRCode(@Param('orderId') orderId: string, @CurrentUser() user: UserClaims) {
    return this.ordersService.generateQrCode(orderId, user.userId);
  }

  @ApiOperation({ summary: 'confirmHandover()' })
  @Patch('orders/:orderId/complete')
  confirmHandover(
    @Param('orderId') orderId: string,
    @Body('token') token: string,
    @CurrentUser() user: UserClaims,
  ) {
    return this.ordersService.complete(orderId, user.userId, token);
  }

  @ApiOperation({ summary: 'cancelOrder()' })
  @Patch('orders/:orderId/cancel')
  cancelOrder(@Param('orderId') orderId: string, @CurrentUser() user: UserClaims) {
    return this.ordersService.cancel(orderId, user.userId);
  }

  @ApiOperation({ summary: 'cancelPendingOrders() (Internal)' })
  @Patch('users/:userId/orders/cancel')
  cancelPendingOrders(@Param('userId') userId: string) {
    return this.ordersService.cancelPendingForUser(userId);
  }

  @ApiOperation({ summary: 'verifyOrderCompletion() (Internal)' })
  @Get('orders/:orderId/verify')
  verifyOrderCompletion(@Param('orderId') orderId: string) {
    return this.ordersService.verify(orderId);
  }
}

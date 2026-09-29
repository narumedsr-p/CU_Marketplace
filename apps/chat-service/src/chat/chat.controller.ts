import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'getChatRooms()' })
  @Get('rooms')
  getChatRooms(@CurrentUser() user: UserClaims) {
    return this.chatService.findRooms(user.userId);
  }

  @ApiOperation({ summary: 'startChat()' })
  @Post('rooms')
  startChat(@Body() body: any, @CurrentUser() user?: UserClaims) {
    return this.chatService.createRoom(body, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'getChatHistory()' })
  @Get('rooms/:roomId/messages')
  getChatHistory(@Param('roomId') roomId: string, @CurrentUser() user?: UserClaims) {
    return this.chatService.findMessages(roomId, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'sendMessage()' })
  @Post('rooms/:roomId/messages')
  sendMessage(
    @Param('roomId') roomId: string,
    @Body('content') content: string,
    @CurrentUser() user: UserClaims,
  ) {
    return this.chatService.createMessage(roomId, user.userId, content);
  }

}

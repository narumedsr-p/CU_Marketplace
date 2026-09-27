import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@Controller('rooms')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'getChatRooms()' })
  @Get()
  getChatRooms(@CurrentUser() user: UserClaims) {
    return this.chatService.findRooms(user.userId);
  }

  @ApiOperation({ summary: 'startChat()' })
  @Post()
  startChat(@Body() body: any, @CurrentUser() user?: UserClaims) {
    return this.chatService.createRoom(body, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'getChatHistory()' })
  @Get(':roomId/messages')
  getChatHistory(@Param('roomId') roomId: string, @CurrentUser() user?: UserClaims) {
    return this.chatService.findMessages(roomId, user?.userId, user?.role);
  }

  @ApiOperation({ summary: 'sendMessage()' })
  @Post(':roomId/messages')
  sendMessage(
    @Param('roomId') roomId: string,
    @Body('content') content: string,
    @CurrentUser() user: UserClaims,
  ) {
    return this.chatService.createMessage(roomId, user.userId, content);
  }

  @ApiOperation({ summary: 'sendSystemMessage() (Internal)' })
  @Post(':roomId/system-msg')
  sendSystemMessage(@Param('roomId') roomId: string, @Body('content') content: string) {
    return this.chatService.sendSystemMessage(roomId, content);
  }

  @ApiOperation({ summary: 'enforceChatBlock() (Internal)' })
  @Patch(':roomId/block')
  enforceChatBlock(@Param('roomId') roomId: string) {
    return this.chatService.blockRoom(roomId);
  }
}

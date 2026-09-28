import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { GrpcInternalAuthGuard } from '../common/guards/grpc-internal-auth.guard';
import { ChatService } from './chat.service';

interface RoomRequest {
  roomId: string;
}

interface RoomMessageRequest {
  roomId: string;
  content: string;
}

interface UserRequest {
  userId: string;
}

@Controller()
@UseGuards(GrpcInternalAuthGuard)
export class ChatGrpcController {
  constructor(private readonly chatService: ChatService) {}

  @GrpcMethod('ChatService', 'SendSystemMessage')
  async sendSystemMessage({ roomId, content }: RoomMessageRequest) {
    try {
      const message = await this.chatService.sendSystemMessage(roomId, content);
      return { id: message.id, roomId: message.roomId, content: message.content };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  @GrpcMethod('ChatService', 'EnforceChatBlock')
  async enforceChatBlock({ roomId }: RoomRequest) {
    try {
      const room = await this.chatService.blockRoom(roomId);
      return { roomId: room.id, isBlocked: room.isBlocked };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  @GrpcMethod('ChatService', 'BlockUserRooms')
  async blockUserRooms({ userId }: UserRequest) {
    try {
      const { blockedCount } = await this.chatService.blockAllUserRooms(userId);
      return { blockedCount };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }
}

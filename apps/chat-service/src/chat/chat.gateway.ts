import { HttpException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatMessageDocument } from './schemas/chat-message.schema';

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() server!: Server;

  constructor(private readonly chatService: ChatService) {}

  // The handshake is the only moment a socket carries headers, so authenticate once here.
  handleConnection(client: Socket) {
    const userId = client.handshake.headers['x-user-id'];
    const key = client.handshake.headers['x-internal-key'];
    const expected = process.env.INTERNAL_SERVICE_SECRET;

    if (!expected || key !== expected || !userId) {
      this.logger.warn(`rejected socket ${client.id}: bad internal key or missing user id`);
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    client.join(`user:${userId}`);
    this.logger.log(`user ${userId} connected (socket ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`user ${client.data.userId ?? 'unknown'} disconnected (socket ${client.id})`);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any) {
    return 'data from ' + data.from + ' is being sent';
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @MessageBody() data: { roomId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    try {
      const result = await this.chatService.createMessage(data.roomId, senderId, data.content);
      this.pushNewMessage(result.message, result.recipientId, senderId);
      return { ok: true, message: result.message };
    } catch (err) {
      const text = err instanceof Error ? err.message : 'send failed';
      // Only messages we wrote for users (HttpException) are safe to show; anything else may leak internals.
      if (err instanceof HttpException) {
        return { ok: false, error: text };
      }
      this.logger.error(err);
      return { ok: false, error: 'send failed' };
    }
  }

  // Shared by the socket and REST send paths so both push the same event to the same rooms.
  pushNewMessage(message: ChatMessageDocument, recipientId: string, userId: string) {
    this.server.to(`user:${userId}`).emit('message:new', message);
    this.server.to(`user:${recipientId}`).emit('message:new', message);
  }
}

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

interface BlockResponse {
  blockedCount: number;
}

interface ChatGrpcService {
  blockUserRooms(data: { userId: string }, metadata: Metadata): Observable<BlockResponse>;
}

@Injectable()
export class ChatClient implements OnModuleInit {
  private chatGrpcService!: ChatGrpcService;

  constructor(@Inject('CHAT_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.chatGrpcService = this.client.getService<ChatGrpcService>('ChatService');
  }

  private grpcMetadata() {
    const metadata = new Metadata();
    metadata.set('x-internal-key', process.env.INTERNAL_SERVICE_SECRET ?? '');
    return metadata;
  }

  async blockAllUserRooms(userId: string) {
    return firstValueFrom(
      this.chatGrpcService.blockUserRooms({ userId }, this.grpcMetadata()),
    );
  }
}

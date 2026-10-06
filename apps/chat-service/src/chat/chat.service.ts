import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { NotificationClient } from '../clients/notification.client';
import { ChatRoom, toParticipantKey } from './schemas/chat-room.schema';
import { ChatMessage } from './schemas/chat-message.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatRoom.name) private readonly roomModel: Model<ChatRoom>,
    @InjectModel(ChatMessage.name) private readonly messageModel: Model<ChatMessage>,
    private readonly notificationClient: NotificationClient,
  ) {}

  async findRooms(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.roomModel
      .find({ $or: [{ participant1: userId }, { participant2: userId }] })
      .sort({ updatedAt: -1 });
  }

  async createRoom(data: any, callerId?: string, callerRole?: string) {
    const participant1 = data?.participant1 || callerId;
    const participant2 = data?.participant2 || data?.sellerId || data?.recipientId;
    const itemId = data?.itemId;

    if (!participant1 || !participant2 || !itemId) {
      throw new BadRequestException('participant1, participant2, and itemId are required');
    }

    if (participant1 === participant2) {
      throw new BadRequestException('Cannot start a chat with yourself');
    }

    if (callerId && callerRole !== 'Admin') {
      if (callerId !== participant1 && callerId !== participant2) {
        throw new ForbiddenException('Caller must be one of the participants in the chat room');
      }
    }

    const now = new Date();

    return this.roomModel.findOneAndUpdate(
      { itemId, participantKey: toParticipantKey(participant1, participant2) },
      {
        $setOnInsert: {
          _id: randomUUID(),
          participant1,
          participant2,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, timestamps: false },
    );
  }

  async findMessages(roomId: string, callerId?: string, callerRole?: string) {
    const room = await this.roomModel.findById(roomId);

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (callerId && callerRole !== 'Admin') {
      if (room.participant1 !== callerId && room.participant2 !== callerId) {
        throw new ForbiddenException('You are not authorized to view messages in this chat room');
      }
    }

    return this.messageModel.find({ roomId }).sort({ createdAt: 1 });
  }

  async createMessage(roomId: string, senderId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const room = await this.roomModel.findById(roomId);

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (room.isBlocked) {
      throw new ForbiddenException('This chat room is blocked');
    }

    if (room.participant1 !== senderId && room.participant2 !== senderId) {
      throw new ForbiddenException('You are not a participant in this chat room');
    }

    const message = await this.messageModel.create({
      roomId,
      senderId,
      content,
      isSystemMsg: false,
    });

    await this.roomModel.updateOne(
      {
        _id: roomId,
        $or: [{ lastMessage: null }, { 'lastMessage.createdAt': { $lte: message.createdAt } }],
      },
      {
        $set: {
          lastMessage: {
            messageId: message._id,
            senderId: message.senderId,
            content: message.content,
            isSystemMsg: message.isSystemMsg,
            createdAt: message.createdAt,
          },
        },
      },
    );

    const recipientId = room.participant1 === senderId ? room.participant2 : room.participant1;

    try {
      await this.notificationClient.send({
        userId: recipientId,
        title: 'New Chat Message',
        message: content,
      });
    } catch (err) {
      this.logger.error(`Failed to send notification for chat message in room ${roomId}`, err);
    }

    return message;
  }
}

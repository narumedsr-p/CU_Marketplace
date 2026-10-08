import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions, uuidIdProp } from '../../common/mongo/schema-options';

@Schema({ _id: false, versionKey: false })
export class LastMessage {
  @Prop({ type: String, required: true })
  messageId!: string;

  @Prop({ type: String, default: null })
  senderId!: string | null;

  @Prop({ type: String, required: true })
  content!: string;

  @Prop({ type: Boolean, default: false })
  isSystemMsg!: boolean;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

const LastMessageSchema = SchemaFactory.createForClass(LastMessage);

@Schema({ ...baseSchemaOptions, collection: 'chat_rooms' })
export class ChatRoom {
  @Prop(uuidIdProp)
  _id!: string;

  @Prop({ type: String, required: true })
  participant1!: string;

  @Prop({ type: String, required: true })
  participant2!: string;

  @Prop({ type: String, required: true })
  participantKey!: string;

  @Prop({ type: String, required: true })
  itemId!: string;

  @Prop({ type: Boolean, default: false })
  isBlocked!: boolean;

  @Prop({ type: LastMessageSchema, default: null })
  lastMessage!: LastMessage | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ChatRoomDocument = HydratedDocument<ChatRoom>;

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
ChatRoomSchema.index({ itemId: 1, participantKey: 1 }, { unique: true });
ChatRoomSchema.index({ participant1: 1, updatedAt: -1 });
ChatRoomSchema.index({ participant2: 1, updatedAt: -1 });

export function toParticipantKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

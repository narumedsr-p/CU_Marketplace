import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions, uuidIdProp } from '../../common/mongo/schema-options';

@Schema({ ...baseSchemaOptions, collection: 'chat_messages' })
export class ChatMessage {
  @Prop(uuidIdProp)
  _id!: string;

  @Prop({ type: String, required: true })
  roomId!: string;

  @Prop({ type: String, default: null })
  senderId!: string | null;

  @Prop({ type: String, required: true })
  content!: string;

  @Prop({ type: Boolean, default: false })
  isSystemMsg!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ roomId: 1, createdAt: 1 });

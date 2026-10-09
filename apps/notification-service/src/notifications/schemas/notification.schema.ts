import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { NotificationKind } from '@workspace/contracts';
import { baseSchemaOptions, uuidIdProp } from '../../common/mongo/schema-options';

@Schema({ _id: false, versionKey: false })
export class NotificationTarget {
  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: String })
  listingId?: string;

  @Prop({ type: String })
  orderId?: string;

  @Prop({ type: String })
  chatRoomId?: string;

  @Prop({ type: String })
  reviewId?: string;
}

const NotificationTargetSchema = SchemaFactory.createForClass(NotificationTarget);

@Schema({ ...baseSchemaOptions, collection: 'notifications' })
export class Notification {
  @Prop(uuidIdProp)
  _id!: string;

  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: String, default: null })
  kind!: NotificationKind | null;

  @Prop({ type: NotificationTargetSchema, default: null })
  action!: NotificationTarget | null;

  @Prop({ type: Boolean, default: false })
  isRead!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });

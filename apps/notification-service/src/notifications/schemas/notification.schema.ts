import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions, uuidIdProp } from '../../common/mongo/schema-options';

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

  @Prop({ type: Boolean, default: false })
  isRead!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });

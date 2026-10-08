import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'notification_preferences',
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      const { _id, ...rest } = ret;
      return { userId: _id, ...rest };
    },
  },
})
export class NotificationPreference {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: Boolean, default: true })
  emailEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  inAppEnabled!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type NotificationPreferenceDocument = HydratedDocument<NotificationPreference>;

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);

import { randomUUID } from 'crypto';
import { PropOptions, SchemaOptions } from '@nestjs/mongoose';

export const uuidIdProp: PropOptions = { type: String, default: () => randomUUID() };

export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
};

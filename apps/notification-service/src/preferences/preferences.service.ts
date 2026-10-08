import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationPreference } from './schemas/notification-preference.schema';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreference>,
  ) {}

  async findOne(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const pref = await this.preferenceModel.findById(userId);

    if (!pref) {
      return {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
      };
    }

    return pref;
  }

  async upsert(userId: string, data: any) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.preferenceModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(data?.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
          ...(data?.inAppEnabled !== undefined ? { inAppEnabled: data.inAppEnabled } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

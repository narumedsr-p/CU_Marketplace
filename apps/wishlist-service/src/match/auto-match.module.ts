import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AutoMatchController } from './auto-match.controller';
import { AutoMatchRmqController } from './auto-match.rmq.controller';
import { AutoMatchService } from './auto-match.service';
import { NotificationClient } from '../clients/notification.client';
import { getRabbitMqUrl, getRetryableQueueOptions, QUEUES } from '@workspace/contracts';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_PACKAGE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [getRabbitMqUrl()],
            queue: QUEUES.notification,
            queueOptions: getRetryableQueueOptions(QUEUES.notificationRetry),
          },
        }),
      },
    ]),
  ],
  controllers: [AutoMatchController, AutoMatchRmqController],
  providers: [AutoMatchService, NotificationClient],
})
export class AutoMatchModule {}

export type NotificationKind = 'match' | 'order' | 'chat' | 'review';

export type NotificationAction =
  | { type: 'listing'; listingId: string }
  | { type: 'order'; orderId: string }
  | { type: 'chat'; chatRoomId: string }
  | { type: 'review'; reviewId: string };

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  kind?: NotificationKind;
  action?: NotificationAction;
}

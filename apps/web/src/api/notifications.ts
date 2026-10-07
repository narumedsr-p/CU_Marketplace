import { api } from './client';
import type { NotificationItem, NotificationKind, NotificationPrefsState } from '../types';

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ApiNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const NOTIFICATIONS = '/api/v1/notifications';

function relativeTime(iso: string) {
  const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function classify(title: string, message: string): { kind: NotificationKind; category: string } {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes('match') || text.includes('wishlist')) return { kind: 'match', category: 'Auto-match' };
  if (text.includes('chat') || text.includes('message')) return { kind: 'chat', category: 'Chat' };
  if (text.includes('order') || text.includes('handover') || text.includes('reservation')) return { kind: 'order', category: 'Orders' };
  return { kind: 'account', category: 'Account' };
}

function toNotification(notification: ApiNotification): NotificationItem {
  const { kind, category } = classify(notification.title, notification.message);
  return {
    id: notification.id,
    kind,
    category,
    title: notification.title,
    body: notification.message,
    time: relativeTime(notification.createdAt),
    group: Date.now() - new Date(notification.createdAt).getTime() < 24 * 60 * 60 * 1000 ? 'today' : 'earlier',
    read: notification.isRead,
    channel: 'In-app',
  };
}

export async function fetchNotifications() {
  return (await api<ApiNotification[]>(NOTIFICATIONS)).map(toNotification);
}

export function markAllNotificationsRead() {
  return api<{ updatedCount: number }>(`${NOTIFICATIONS}/read-all`, { method: 'PATCH' });
}

export async function fetchNotificationPreferences(): Promise<NotificationPrefsState> {
  const preferences = await api<ApiNotificationPreferences>(`${NOTIFICATIONS}/preferences`);
  return {
    inAppEnabled: preferences.inAppEnabled,
    emailEnabled: preferences.emailEnabled,
  };
}

export async function updateNotificationPreferences(patch: Partial<NotificationPrefsState>) {
  const preferences = await api<ApiNotificationPreferences>(`${NOTIFICATIONS}/preferences`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return {
    inAppEnabled: preferences.inAppEnabled,
    emailEnabled: preferences.emailEnabled,
  } satisfies NotificationPrefsState;
}

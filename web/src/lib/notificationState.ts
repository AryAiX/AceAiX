import type { Notification } from '../types';

export function markNotificationReadInState(
  notifications: Notification[],
  notificationId: string,
): Notification[] {
  return notifications.map((notification) => (
    notification.id === notificationId
      ? { ...notification, is_read: true }
      : notification
  ));
}

export function markAllNotificationsReadInState(
  notifications: Notification[],
): Notification[] {
  return notifications.map((notification) => ({ ...notification, is_read: true }));
}

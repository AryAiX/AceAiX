import { describe, expect, it } from 'vitest';
import type { Notification } from '../types';
import {
  markAllNotificationsReadInState,
  markNotificationReadInState,
} from './notificationState';

const notifications = [
  { id: 'one', is_read: false },
  { id: 'two', is_read: false },
] as Notification[];

describe('notification cache state', () => {
  it('marks only the successfully updated notification', () => {
    const updated = markNotificationReadInState(notifications, 'one');

    expect(updated.map((notification) => notification.is_read)).toEqual([true, false]);
    expect(notifications[0].is_read).toBe(false);
  });

  it('marks all cached notifications read after bulk success', () => {
    expect(
      markAllNotificationsReadInState(notifications).every((notification) => notification.is_read),
    ).toBe(true);
  });
});

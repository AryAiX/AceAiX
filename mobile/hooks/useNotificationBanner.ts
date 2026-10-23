import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { notificationCopy } from '@/components/messaging/NotificationRow';
import { useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getNotificationActor, markNotificationsRead } from '@/lib/api';
import {
  BANNER_COALESCE_MS,
  bannerEventFromPayload,
  newerBannerEvent,
  shouldShowBanner,
  type BannerEvent,
  type NotificationRealtimePayload,
} from '@/lib/notificationBanner';
import { getCurrentPath, getOpenConversation } from '@/lib/openScreen';
import { notificationTarget } from '@/lib/routes';
import { useUnread } from '@/providers/UnreadProvider';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * In-app banner for a notification that arrives while the app is open.
 *
 * Listens to the channel UnreadProvider already holds. The open conversation
 * and the path are read from `openScreen` at each decision, never closed
 * over from a render, and read again after the actor loads — the person may
 * have opened that chat in the meantime.
 */

function liveContext() {
  return { openConversation: getOpenConversation(), path: getCurrentPath() };
}

function decide(event: BannerEvent) {
  return shouldShowBanner(event, liveContext());
}

function toNotification(
  event: BannerEvent,
  actor: { full_name: string | null; avatar_url: string | null } | null,
): AppNotification {
  const row = event.row;
  return {
    id: row.id ?? '',
    type: (row.type ?? 'follow') as NotificationType,
    title: row.title ?? '',
    body: row.body ?? null,
    is_read: row.is_read === true,
    actor_id: row.actor_id ?? null,
    entity_type: (row.entity_type ?? null) as AppNotification['entity_type'],
    entity_id: row.entity_id ?? null,
    actor_count: typeof row.actor_count === 'number' ? row.actor_count : 1,
    data: row.data ?? {},
    created_at: row.created_at ?? '',
    actor: actor ?? undefined,
  };
}

function bannerMessage(notification: AppNotification, t: ReturnType<typeof useT>): string {
  const copy = notificationCopy(notification, t);
  const parts = [copy.title, copy.body].filter((part) => part && part.trim());
  return parts.join('\n');
}

export function useNotificationBanner(): void {
  const { subscribeNotifications } = useUnread();
  const toast = useToast();
  const router = useRouter();
  const t = useT();
  const toastRef = useRef(toast);
  const routerRef = useRef(router);
  const tRef = useRef(t);
  toastRef.current = toast;
  routerRef.current = router;
  tRef.current = t;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: BannerEvent | null = null;
    let cancelled = false;

    const flush = async () => {
      const chosen = pending;
      pending = null;
      timer = null;
      if (!chosen || cancelled) return;

      let actor: { full_name: string | null; avatar_url: string | null } | null = null;
      if (chosen.row.actor_id) {
        try {
          actor = await getNotificationActor(chosen.row.actor_id);
        } catch {
          actor = null;
        }
      }
      if (cancelled) return;
      // The chat they are in now, not the chat they were in when the row arrived.
      if (decide(chosen) !== 'show') return;

      const notification = toNotification(chosen, actor);
      const message = bannerMessage(notification, tRef.current);
      if (!message) return;

      toastRef.current.show({
        message,
        onPress: () => {
          const target = notificationTarget(notification);
          if (!target) return;
          if (notification.id) {
            markNotificationsRead([notification.id]).catch(() => {
              /* Opening the list marks it read on the way out. */
            });
          }
          routerRef.current.push(target);
        },
      });
    };

    const onNotification = (payload: NotificationRealtimePayload) => {
      const event = bannerEventFromPayload(payload);
      if (decide(event) !== 'show') return;
      pending = pending ? newerBannerEvent(pending, event) : event;
      if (!timer) {
        timer = setTimeout(() => {
          void flush();
        }, BANNER_COALESCE_MS);
      }
    };

    const unsubscribe = subscribeNotifications(onNotification);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribeNotifications]);
}

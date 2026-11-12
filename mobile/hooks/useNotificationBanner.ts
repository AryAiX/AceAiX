import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { notificationCopy } from '@/components/messaging/NotificationRow';
import { useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getNotificationActor, markNotificationsRead } from '@/lib/api';
import {
  BANNER_GAP_MS,
  BANNER_VISIBLE_MS,
  applyHydratedRow,
  bannerEventFromPayload,
  bannerText,
  dequeueBanner,
  emptyBannerQueue,
  enqueueBanner,
  onNotificationsList,
  rowNeedsHydration,
  shouldShowBanner,
  type BannerEvent,
  type BannerQueue,
  type NotificationRealtimePayload,
} from '@/lib/notificationBanner';
import { getCurrentPath, getOpenConversation } from '@/lib/openScreen';
import { Routes, notificationTarget } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useUnread } from '@/providers/UnreadProvider';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * In-app banner for a notification that arrives while the app is open.
 *
 * One pop-up at a time, in the order they arrived. Each stays for the normal
 * toast duration, then the next shows after a short gap. The open conversation
 * and the path are read again just before a pop-up is shown — the person may
 * have opened that chat, or the Notifications screen, in the meantime.
 * Opening Notifications clears whatever is still waiting.
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
  return bannerText(copy.title, copy.body) || bannerText(notification.title, notification.body);
}

const NOTIFICATION_COLUMNS =
  'id, type, title, body, is_read, actor_id, entity_type, entity_id, actor_count, data, created_at, actor:user_profiles!notifications_actor_id_fkey(full_name, avatar_url)';

function actorFromRow(
  record: Record<string, unknown>,
): { full_name: string | null; avatar_url: string | null } | null {
  const raw = record.actor;
  const actor = Array.isArray(raw) ? raw[0] : raw;
  if (!actor || typeof actor !== 'object') return null;
  const row = actor as Record<string, unknown>;
  const fullName = typeof row.full_name === 'string' ? row.full_name : null;
  const avatar = typeof row.avatar_url === 'string' ? row.avatar_url : null;
  if (!fullName && !avatar) return null;
  return { full_name: fullName, avatar_url: avatar };
}

/** The stored row, when the realtime payload left out what the screen shows. */
async function hydrate(
  event: BannerEvent,
): Promise<{ event: BannerEvent; actor: { full_name: string | null; avatar_url: string | null } | null }> {
  if (!rowNeedsHydration(event)) return { event, actor: null };
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('id', event.row.id ?? '')
      .maybeSingle();
    if (error || !data) return { event, actor: null };
    const record = data as unknown as Record<string, unknown>;
    return { event: applyHydratedRow(event, record), actor: actorFromRow(record) };
  } catch {
    return { event, actor: null };
  }
}

function queuePending(queue: BannerQueue): boolean {
  return queue.waiting.length > 0 || queue.overflow > 0;
}

export function useNotificationBanner(): void {
  const path = usePathname();
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

  const queueRef = useRef(emptyBannerQueue());
  const showingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onNotificationsList(path)) return;
    queueRef.current = emptyBannerQueue();
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    let pumping = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let releaseWait: (() => void) | null = null;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        releaseWait = resolve;
        timer = setTimeout(() => {
          timer = null;
          releaseWait = null;
          resolve();
        }, ms);
      });

    const showToast = (message: string, onPress: () => void) => {
      toastRef.current.show({ message, duration: BANNER_VISIBLE_MS, onPress });
    };

    const pump = async () => {
      if (pumping || cancelled) return;
      pumping = true;
      while (!cancelled) {
        if (onNotificationsList(getCurrentPath())) {
          queueRef.current = emptyBannerQueue();
          showingIdRef.current = null;
          break;
        }

        const step = dequeueBanner(queueRef.current);
        queueRef.current = step.queue;
        if (step.turn.kind === 'idle') break;

        if (step.turn.kind === 'summary') {
          showingIdRef.current = null;
          if (onNotificationsList(getCurrentPath())) {
            queueRef.current = emptyBannerQueue();
            break;
          }
          const count = step.turn.count;
          showToast(tRef.current('messaging.moreNotifications', { count }), () => {
            routerRef.current.push(Routes.notifications);
          });
          await wait(BANNER_VISIBLE_MS + BANNER_GAP_MS);
          continue;
        }

        showingIdRef.current = step.turn.event.row.id ?? null;
        const hydrated = await hydrate(step.turn.event);
        if (cancelled) break;

        let actor = hydrated.actor;
        if (!actor && hydrated.event.row.actor_id) {
          try {
            actor = await getNotificationActor(hydrated.event.row.actor_id);
          } catch {
            actor = null;
          }
        }
        if (cancelled) break;

        if (onNotificationsList(getCurrentPath())) {
          queueRef.current = emptyBannerQueue();
          showingIdRef.current = null;
          break;
        }
        // The chat they are in now, not the chat they were in when the row arrived.
        // A partial message update is recognized only after the stored row is loaded.
        const chosen = hydrated.event;
        if (decide(chosen) !== 'show') {
          showingIdRef.current = null;
          continue;
        }

        const notification = toNotification(chosen, actor);
        const message = bannerMessage(notification, tRef.current);
        if (!message) {
          showingIdRef.current = null;
          continue;
        }

        showingIdRef.current = notification.id || null;
        showToast(message, () => {
          const target = notificationTarget(notification);
          if (!target) return;
          if (notification.id) {
            markNotificationsRead([notification.id]).catch(() => {
              /* Opening the list marks it read on the way out. */
            });
          }
          routerRef.current.push(target);
        });
        await wait(BANNER_VISIBLE_MS + BANNER_GAP_MS);
        showingIdRef.current = null;
      }
      showingIdRef.current = null;
      pumping = false;
      if (!cancelled && queuePending(queueRef.current)) void pump();
    };

    const onNotification = (payload: NotificationRealtimePayload) => {
      if (onNotificationsList(getCurrentPath())) {
        queueRef.current = emptyBannerQueue();
        return;
      }
      const event = bannerEventFromPayload(payload);
      if (decide(event) !== 'show') return;
      queueRef.current = enqueueBanner(queueRef.current, event, showingIdRef.current);
      void pump();
    };

    const unsubscribe = subscribeNotifications(onNotification);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      releaseWait?.();
      unsubscribe();
    };
  }, [subscribeNotifications]);
}

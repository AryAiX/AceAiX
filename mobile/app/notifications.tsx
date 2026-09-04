import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Divider,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { NotificationRow } from '@/components/messaging/NotificationRow';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getNotifications, markNotificationsRead } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { Routes, notificationTarget } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useUnread } from '@/providers/UnreadProvider';
import type { AppNotification } from '@/types/models';

interface Section {
  title: string;
  data: AppNotification[];
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const unread = useUnread();

  const notifications = useAsync<AppNotification[]>(() => getNotifications(), [], {
    refetchOnFocus: true,
  });
  const { mutate, refresh, reload } = notifications;

  /* `unread` changes identity every time a badge count moves. Only `clear` is
     stable, and the focus effect below must NOT re-run on a count change — its
     cleanup marks everything read. */
  const { clear: clearBadge } = unread;

  const [markingAll, setMarkingAll] = useState(false);

  const items = useMemo(() => notifications.data ?? [], [notifications.data]);
  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  /* Everything the cleanup needs, without making the focus effect re-run (and
     so mark things read) every time the list changes. */
  const hasUnreadRef = useRef(unreadCount > 0);
  useEffect(() => {
    hasUnreadRef.current = unreadCount > 0;
  }, [unreadCount]);

  /**
   * Read-state timing, which is the whole trick on this screen.
   *
   * The badge clears on arrival — the person is looking at the list, so a
   * count in the tab bar is already stale. The rows themselves stay unread
   * until the screen is left, because marking them on mount would dissolve
   * the "New" group the person came here to read.
   */
  useFocusEffect(
    useCallback(() => {
      clearBadge('notifications');
      return () => {
        if (!hasUnreadRef.current) return;
        markNotificationsRead().catch(() => {
          /* They will be marked again on the next visit. */
        });
      };
    }, [clearBadge]),
  );

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-screen:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sections = useMemo<Section[]>(() => {
    const fresh = items.filter((n) => !n.is_read);
    const earlier = items.filter((n) => n.is_read);
    const out: Section[] = [];
    if (fresh.length) out.push({ title: t('messaging.sectionNew'), data: fresh });
    if (earlier.length) out.push({ title: t('messaging.sectionEarlier'), data: earlier });
    return out;
  }, [items, t]);

  const open = useCallback(
    (notification: AppNotification) => {
      const target = notificationTarget(notification);
      if (!target) return;

      if (!notification.is_read) {
        mutate((current) =>
          current
            ? current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
            : current,
        );
        markNotificationsRead([notification.id]).catch(() => {
          /* The bulk mark on leaving the screen catches this anyway. */
        });
      }

      router.push(target);
    },
    [mutate, router],
  );

  const markAll = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    mutate((current) => (current ? current.map((n) => ({ ...n, is_read: true })) : current));
    clearBadge('notifications');
    try {
      await markNotificationsRead();
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadCount, mutate, clearBadge, toast, reload]);

  const renderEmpty = () => {
    if (notifications.loading && items.length === 0) {
      return (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SkeletonList count={5} variant="row" />
        </View>
      );
    }
    if (notifications.error && items.length === 0) {
      return <ErrorState message={notifications.error} onRetry={reload} />;
    }
    return (
      <EmptyState
        icon={<Bell size={26} color={colors.textMuted} />}
        title={t('messaging.notificationsEmptyTitle')}
        body={t('messaging.notificationsEmptyBody')}
        actionLabel={t('messaging.notificationsEmptyAction')}
        onAction={() => router.push(Routes.discover)}
      />
    );
  };

  return (
    <Screen scroll={false} padded={false} testID="notifications-screen">
      <Header
        title={t('messaging.notificationsTitle')}
        back
        bordered
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={markAll}
              hitSlop={12}
              disabled={markingAll}
              accessibilityRole="button"
              accessibilityLabel={t('messaging.markAllReadA11y', {
                count: unreadCount,
              })}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: spacing.xs,
                opacity: pressed || markingAll ? 0.6 : 1,
              })}
            >
              <Text variant="captionStrong" tone="primary">
                {t('messaging.markAllRead')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View
            style={{
              backgroundColor: colors.bg,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.sm,
            }}
          >
            <Text variant="overline" tone="muted" accessibilityRole="header">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const target = notificationTarget(item);
          return (
            <NotificationRow
              notification={item}
              onPress={target ? () => open(item) : undefined}
            />
          );
        }}
        ItemSeparatorComponent={() => <Divider inset={spacing.lg + 44 + spacing.md} />}
        contentContainerStyle={{ paddingBottom: spacing.giant, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={notifications.refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={renderEmpty()}
        testID="notifications-list"
      />
    </Screen>
  );
}

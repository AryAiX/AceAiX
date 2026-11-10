import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MessageSquare, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { ConversationRow } from '@/components/messaging/ConversationRow';
import { PeerActionsSheet } from '@/components/messaging/PeerActionsSheet';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getConversations, markConversationRead } from '@/lib/api';
import {
  getInboxReceipts,
  getMutedConversations,
  setConversationMuted,
  type Receipt,
} from '@/lib/api.messaging';
import { Routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useUnread } from '@/providers/UnreadProvider';
import type { Conversation } from '@/types/models';

/**
 * Every conversation this account is part of.
 *
 * The list itself comes from one RPC that already filters blocks and
 * suspensions, so an empty result genuinely means "no conversations" — the
 * screen never has to guess whether a join quietly failed.
 */
export default function InboxScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const { refresh: refreshBadge } = useUnread();
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});

  const conversations = useAsync<Conversation[]>(() => getConversations(), [], {
    refetchOnFocus: true,
  });

  const [muted, setMuted] = useState<string[]>([]);
  const [actionsFor, setActionsFor] = useState<Conversation | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMutedConversations().then((ids) => {
      if (!cancelled) setMuted(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* The realtime subscription must outlive individual renders, so it reads the
     latest refresh through a ref instead of re-subscribing every time
     `useAsync` hands back a new callback identity. */
  const refreshRef = useRef(conversations.refresh);
  useEffect(() => {
    refreshRef.current = conversations.refresh;
  }, [conversations.refresh]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          refreshRef.current();
        },
      )
      /* A message of yours being opened turns its tick blue. */
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          refreshRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openChat = useCallback(
    (conversation: Conversation) => router.push(Routes.chat(conversation.id)),
    [router],
  );

  const muteFor = useCallback(
    async (id: string) => {
      const next = await setConversationMuted(id, !muted.includes(id));
      setMuted(next);
    },
    [muted],
  );

  const toggleMute = useCallback(async () => {
    if (!actionsFor) return;
    await muteFor(actionsFor.id);
  }, [actionsFor, muteFor]);

  const { mutate } = conversations;

  /* Read, from the button behind a row: the same call opening the chat makes. */
  const markRead = useCallback(
    (conversation: Conversation) => {
      mutate((current) =>
        current ? current.map((c) => (c.id === conversation.id ? { ...c, unread_count: 0 } : c)) : current,
      );
      markConversationRead(conversation.id)
        .then(() => refreshBadge())
        .catch(() => refreshRef.current());
    },
    [mutate, refreshBadge],
  );

  /* Sent / Seen ticks for chats where you wrote last. */
  const data = conversations.data;
  useEffect(() => {
    if (!user || !data) return;
    let cancelled = false;
    getInboxReceipts(data, user.id).then((next) => {
      if (!cancelled) setReceipts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [data, user]);

  const dropConversationsWith = useCallback(
    (userId: string) => {
      mutate((current) =>
        current ? current.filter((c) => c.other_user_id !== userId) : current,
      );
    },
    [mutate],
  );

  const all = useMemo(() => conversations.data ?? [], [conversations.data]);
  const unreadTotal = all.filter((c) => c.unread_count > 0).length;
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (c) =>
        (!onlyUnread || c.unread_count > 0) &&
        (!q ||
          (c.other_name ?? '').toLowerCase().includes(q) ||
          (c.last_message ?? '').toLowerCase().includes(q)),
    );
  }, [all, query, onlyUnread]);
  const filtering = onlyUnread || query.trim().length > 0;

  const renderEmpty = () => {
    if (conversations.loading && items.length === 0) {
      return (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SkeletonList count={5} variant="row" />
        </View>
      );
    }
    if (conversations.error && items.length === 0) {
      return <ErrorState message={conversations.error} onRetry={conversations.reload} />;
    }
    if (filtering && all.length > 0) {
      return (
        <Text variant="body" tone="muted" style={{ textAlign: 'center', marginTop: spacing.xl }}>
          {query.trim() ? t('messaging.noMatches') : t('messaging.allCaughtUp')}
        </Text>
      );
    }
    return (
      <EmptyState
        icon={<MessageSquare size={26} color={colors.textMuted} />}
        title={t('messaging.inboxEmptyTitle')}
        body={t('messaging.inboxEmptyBody')}
        actionLabel={t('messaging.inboxEmptyAction')}
        onAction={() => router.push(Routes.discover)}
      />
    );
  };

  const pill = (label: string, on: boolean, onPress: () => void, testID: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      testID={testID}
      style={({ pressed }) => ({
        height: 34,
        paddingHorizontal: spacing.md,
        borderRadius: 17,
        justifyContent: 'center',
        backgroundColor: on ? colors.text : colors.surfaceAlt,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text variant="captionStrong" color={on ? colors.bg : colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );

  /* The top of the list: the big title, search and the All / Unread pills.
     It scrolls with the chats so a long inbox gets the whole screen. */
  const top = (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
      <Text variant="screenTitle">{t('messaging.inboxTitle')}</Text>
      {all.length > 0 ? (
        <>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('messaging.searchChats')}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            icon={<Search size={18} color={colors.textMuted} />}
            testID="inbox-search"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {pill(t('messaging.filterAll'), !onlyUnread, () => setOnlyUnread(false), 'inbox-filter-all')}
            {pill(
              unreadTotal > 0 ? `${t('messaging.filterUnread')} · ${unreadTotal}` : t('messaging.filterUnread'),
              onlyUnread,
              () => setOnlyUnread(true),
              'inbox-filter-unread',
            )}
          </View>
        </>
      ) : null}
    </View>
  );

  /* A short inbox leaves the screen bare; a friendly nudge fills it. */
  const footer =
    !filtering && items.length > 0 && items.length <= 3 ? (
      <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.sm }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primarySoft,
            marginBottom: spacing.xs,
          }}
        >
          <MessageSquare size={28} color={colors.primary} strokeWidth={2} />
        </View>
        <Text variant="screenTitle" style={{ fontSize: 28, lineHeight: 32, textAlign: 'center' }}>
          {t('messaging.startTitle')}
        </Text>
        <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {t('messaging.startBody')}
        </Text>
        <Button
          label={t('messaging.startAction')}
          variant="secondary"
          size="sm"
          onPress={() => router.push(Routes.discover)}
          style={{ marginTop: spacing.sm, alignSelf: 'center' }}
        />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: spacing.lg }}>
          {t('messaging.swipeHint')}
        </Text>
      </View>
    ) : undefined;

  return (
    <Screen scroll={false} padded={false} testID="inbox-screen">
      {/* Swiping back works from the screen's left edge only, so a swipe on
          a chat (to open or close its buttons) never leaves the inbox. */}
      <Stack.Screen options={{ fullScreenGestureEnabled: false }} />
      <Header back />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            muted={muted.includes(item.id)}
            receipt={receipts[item.id] ?? null}
            onPress={() => openChat(item)}
            onOpenActions={() => setActionsFor(item)}
            onMarkRead={() => markRead(item)}
            onAlreadyRead={() => toast.info(t('messaging.alreadyRead'))}
            onToggleMute={() => void muteFor(item.id)}
          />
        )}
        extraData={{ muted, receipts }}
        ListHeaderComponent={top}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingBottom: spacing.xxl,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={conversations.refreshing}
            onRefresh={conversations.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={renderEmpty()}
        testID="inbox-list"
      />

      <PeerActionsSheet
        visible={!!actionsFor}
        userId={actionsFor?.other_user_id ?? null}
        name={actionsFor?.other_name ?? null}
        muted={!!actionsFor && muted.includes(actionsFor.id)}
        onToggleMute={toggleMute}
        onViewProfile={() =>
          actionsFor ? router.push(Routes.profile(actionsFor.other_user_id)) : undefined
        }
        onClose={() => setActionsFor(null)}
        onBlocked={dropConversationsWith}
      />
    </Screen>
  );
}

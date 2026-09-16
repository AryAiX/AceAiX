import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
} from '@/components/ui';
import { ConversationRow } from '@/components/messaging/ConversationRow';
import { PeerActionsSheet } from '@/components/messaging/PeerActionsSheet';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getConversations } from '@/lib/api';
import {
  getMutedConversations,
  setConversationMuted,
} from '@/lib/api.messaging';
import { Routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openChat = useCallback(
    (conversation: Conversation) => router.push(Routes.chat(conversation.id)),
    [router],
  );

  const toggleMute = useCallback(async () => {
    if (!actionsFor) return;
    const id = actionsFor.id;
    const next = await setConversationMuted(id, !muted.includes(id));
    setMuted(next);
  }, [actionsFor, muted]);

  const { mutate } = conversations;

  const dropConversationsWith = useCallback(
    (userId: string) => {
      mutate((current) =>
        current ? current.filter((c) => c.other_user_id !== userId) : current,
      );
    },
    [mutate],
  );

  const items = conversations.data ?? [];

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

  return (
    <Screen scroll={false} padded={false} testID="inbox-screen">
      <Header title={t('messaging.inboxTitle')} back bordered />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            muted={muted.includes(item.id)}
            onPress={() => openChat(item)}
            onOpenActions={() => setActionsFor(item)}
          />
        )}
        extraData={muted}
        contentContainerStyle={{
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
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

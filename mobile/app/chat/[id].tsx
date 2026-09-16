import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ban } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Loader, Screen, Text, useToast } from '@/components/ui';
import { ChatHeader } from '@/components/messaging/ChatHeader';
import { Composer } from '@/components/messaging/Composer';
import { DaySeparator, sameDay } from '@/components/messaging/DaySeparator';
import { MessageBlockedCard } from '@/components/messaging/MessageBlockedCard';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MinorSafetyBanner } from '@/components/messaging/MinorSafetyBanner';
import { PeerActionsSheet } from '@/components/messaging/PeerActionsSheet';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { canMessage, getMessages, markConversationRead, sendMessage } from '@/lib/api';
import {
  getConversationPeer,
  localMessageId,
  type ChatMessage,
  type ConversationPeer,
} from '@/lib/api.messaging';
import { toFriendlyError } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useUnread } from '@/providers/UnreadProvider';
import type { Message, MessageBlockReason, MessagePermission } from '@/types/models';

interface Row {
  message: ChatMessage;
  isOwn: boolean;
  /** Only the newest message of a same-sender run carries a timestamp. */
  showTime: boolean;
  /** True when the bubble below belongs to the same run. */
  continues: boolean;
  /** A day header is drawn above the first message of each calendar day. */
  dayHeader: string | null;
}

export default function ChatScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const unread = useUnread();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const peer = useAsync<ConversationPeer>(
    () => getConversationPeer(conversationId as string),
    [conversationId],
    { enabled: !!conversationId },
  );

  /* Refetching on focus covers the gap where the realtime socket was dropped
     while the app sat in the background — the usual reason a thread comes
     back missing the last few messages. */
  const history = useAsync<Message[]>(
    () => getMessages(conversationId as string),
    [conversationId],
    { enabled: !!conversationId, refetchOnFocus: true },
  );

  const peerId = peer.data?.id;

  /* Pre-flight, so a locked thread explains itself before anyone types a
     paragraph. The database enforces the same rule when a conversation is
     created; mirroring it here also covers a thread whose guardian consent was
     withdrawn after the fact. */
  const permission = useAsync<MessagePermission>(
    () => canMessage(peerId as string),
    [peerId],
    { enabled: !!peerId },
  );

  /** Server rows that arrived after the initial page (own sends and realtime). */
  const [appended, setAppended] = useState<Message[]>([]);
  /** Optimistic rows that do not exist on the server yet. */
  const [outbox, setOutbox] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sendBlockedBy, setSendBlockedBy] = useState<MessageBlockReason | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gone, setGone] = useState(false);

  const myId = user?.id ?? null;
  const myIdRef = useRef<string | null>(myId);
  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  // ── Read state ─────────────────────────────────────────────────────────────
  /* Only `clear` is stable on the unread context — the object itself changes
     identity on every badge tick, and marking read must not chase that. */
  const { clear: clearBadge } = unread;

  const markRead = useCallback(() => {
    if (!conversationId) return;
    markConversationRead(conversationId).catch(() => {
      /* Read receipts are not worth an error banner over a working thread. */
    });
    clearBadge('messages');
  }, [conversationId, clearBadge]);

  const markReadRef = useRef(markRead);
  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  /* Fires on mount and on every return to the screen, which is exactly when
     the messages on screen have actually been seen. */
  useFocusEffect(
    useCallback(() => {
      markRead();
    }, [markRead]),
  );

  // ── Realtime ───────────────────────────────────────────────────────────────
  const reconcile = useCallback((row: Message) => {
    setAppended((current) =>
      current.some((m) => m.id === row.id) ? current : [...current, row],
    );

    // Our own row coming back replaces the optimistic copy of it. Matching on
    // the oldest pending message with the same text keeps a double-tap that
    // sent the same word twice from collapsing into one bubble.
    setOutbox((current) => {
      if (row.sender_id !== myIdRef.current) return current;
      const index = current.findIndex(
        (m) => m.status !== 'failed' && m.content === row.content,
      );
      if (index === -1) return current;
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          if (!row?.id) return;
          reconcile(row);
          if (row.sender_id !== myIdRef.current) markReadRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, reconcile]);

  // ── Sending ────────────────────────────────────────────────────────────────
  const deliver = useCallback(
    async (message: ChatMessage) => {
      try {
        const saved = await sendMessage(message.conversation_id, message.content);
        reconcile(saved);
      } catch (err) {
        setOutbox((current) =>
          current.map((m) => (m.id === message.id ? { ...m, status: 'failed' } : m)),
        );
        const friendly = toFriendlyError(err);
        if (friendly.hint === 'messaging_not_permitted') {
          setSendBlockedBy('not_permitted');
        } else {
          toast.error(friendly.message);
        }
      }
    },
    [reconcile, toast],
  );

  const send = useCallback(() => {
    const content = draft.trim();
    if (!content || !conversationId || !myId) return;

    const optimistic: ChatMessage = {
      id: localMessageId(),
      conversation_id: conversationId,
      sender_id: myId,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setOutbox((current) => [...current, optimistic]);
    setDraft('');
    void deliver(optimistic);
  }, [draft, conversationId, myId, deliver]);

  const retry = useCallback(
    (message: ChatMessage) => {
      setOutbox((current) =>
        current.map((m) => (m.id === message.id ? { ...m, status: 'sending' } : m)),
      );
      void deliver({ ...message, status: 'sending' });
    },
    [deliver],
  );

  // ── Rows ───────────────────────────────────────────────────────────────────
  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of history.data ?? []) byId.set(m.id, m);
    for (const m of appended) byId.set(m.id, m);

    const confirmed = Array.from(byId.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const chronological = [...confirmed, ...outbox];

    // The list is inverted, so index 0 is the newest message at the bottom and
    // index i + 1 is the message visually above it.
    const newestFirst = [...chronological].reverse();

    return newestFirst.map((message, i) => {
      const newer = newestFirst[i - 1];
      const older = newestFirst[i + 1];
      const isOwn = !!myId && message.sender_id === myId;

      const runContinuesBelow =
        !!newer &&
        newer.sender_id === message.sender_id &&
        sameDay(newer.created_at, message.created_at);

      return {
        message,
        isOwn,
        showTime: !runContinuesBelow,
        continues: runContinuesBelow,
        dayHeader:
          !older || !sameDay(older.created_at, message.created_at)
            ? message.created_at
            : null,
      };
    });
  }, [history.data, appended, outbox, myId]);

  // ── Composer state ─────────────────────────────────────────────────────────
  const permissionReason: MessageBlockReason | null =
    permission.data && !permission.data.allowed
      ? (permission.data.reason ?? 'not_permitted')
      : null;

  /* A failed permission *check* must never lock a working thread: if the
     pre-flight itself errored we let the person type, and the send path
     explains any real refusal. */
  const blockedBy = sendBlockedBy ?? permissionReason;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.inbox);
  }, [router]);

  const openProfile = useCallback(() => {
    if (peerId) router.push(Routes.profile(peerId));
  }, [router, peerId]);

  const loadingThread = (peer.loading && !peer.data) || (history.loading && !history.data);

  /* Empty when the name has not loaded yet, which is what keeps the composer
     from offering to message nobody. */
  const peerFirstName = (peer.data?.full_name ?? '').trim().split(/\s+/)[0] ?? '';

  if (!conversationId) {
    return (
      <Screen scroll={false} padded={false}>
        <ChatHeader
          peer={null}
          loading={false}
          onBack={goBack}
          onOpenProfile={goBack}
          onOpenMenu={() => {}}
        />
        <ErrorState message={t('messaging.conversationNotOpened')} onRetry={goBack} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} keyboardAvoiding testID="chat-screen">
      <ChatHeader
        peer={peer.data}
        loading={peer.loading}
        onBack={goBack}
        onOpenProfile={openProfile}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {peer.error && !peer.data ? (
        <ErrorState message={peer.error} onRetry={peer.reload} />
      ) : gone ? (
        <EmptyState
          icon={<Ban size={26} color={colors.textMuted} />}
          title={t('messaging.closedTitle')}
          body={t('messaging.closedBody')}
          actionLabel={t('messaging.closedAction')}
          onAction={goBack}
        />
      ) : (
        <>
          <FlatList
            data={rows}
            inverted
            style={{ flex: 1 }}
            keyExtractor={(row) => row.message.id}
            renderItem={({ item }) => (
              <View>
                {/* Cells render top-to-bottom even in an inverted list, so a
                    day header placed first sits above its first message. */}
                {item.dayHeader ? <DaySeparator iso={item.dayHeader} /> : null}
                <MessageBubble
                  message={item.message}
                  isOwn={item.isOwn}
                  showTime={item.showTime}
                  continues={item.continues}
                  onRetry={retry}
                />
              </View>
            )}
            /* The content container is not un-inverted, so its vertical
               padding reads upside-down: `paddingBottom` is the gap under the
               header, `paddingTop` the gap above the composer. */
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            windowSize={11}
            /* Must stay a plain View: an inverted list un-flips its empty
               component by composing a transform onto this element's `style`,
               which a custom component would swallow. */
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {loadingThread ? (
                  <Loader label={t('messaging.loadingMessages')} />
                ) : history.error ? (
                  <ErrorState message={history.error} onRetry={history.reload} compact />
                ) : (
                  <EmptyThread name={peerFirstName} />
                )}
              </View>
            }
            testID="chat-messages"
          />

          {/* The banner sits directly above the composer so it is the last
              thing read before typing, and it is never dismissible. */}
          {peer.data?.is_minor ? <MinorSafetyBanner /> : null}

          {blockedBy ? (
            <MessageBlockedCard
              reason={blockedBy}
              peerName={peer.data?.full_name ?? null}
            />
          ) : (
            <Composer
              value={draft}
              onChangeText={setDraft}
              onSend={send}
              placeholder={
                peerFirstName
                  ? t('messaging.composerPlaceholderNamed', { name: peerFirstName })
                  : t('messaging.composerPlaceholder')
              }
            />
          )}
        </>
      )}

      <PeerActionsSheet
        visible={menuOpen}
        userId={peerId ?? null}
        name={peer.data?.full_name ?? null}
        onViewProfile={openProfile}
        onClose={() => setMenuOpen(false)}
        onBlocked={() => {
          setGone(true);
          toast.info(t('messaging.blockedFromThread'));
        }}
      />
    </Screen>
  );
}

/** `name` is already the peer's first name, or empty while it loads. */
function EmptyThread({ name }: { name: string }) {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={{ padding: theme.spacing.xxl }}>
      <Text variant="caption" tone="muted" align="center" style={{ maxWidth: 280 }}>
        {name
          ? t('messaging.threadStartWith', { name })
          : t('messaging.threadStart')}
      </Text>
    </View>
  );
}

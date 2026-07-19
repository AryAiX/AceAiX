import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCheck,
  Edit,
  MessageSquare,
  Search,
  Send,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ConversationRow {
  id: string;
  participant1Id: string;
  participant2Id: string;
  otherId: string;
  name: string;
  role: string;
  last: string;
  time: string;
  unread: number;
  verified: boolean;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
}

const COLORS = [Colors.primary, Colors.accent, Colors.success, Colors.warning, '#9B59B6', '#E67E22'];
const FILTERS = ['All', 'Scouts', 'Clubs', 'Athletes', 'Coaches'] as const;
type MessageFilter = (typeof FILTERS)[number];

function roleLabel(role: string | null | undefined): string {
  const labels: Record<string, string> = {
    athlete: 'Athlete',
    scout: 'Scout',
    club: 'Club',
    coach: 'Coach',
    medical_partner: 'Medical partner',
    federation: 'Federation',
    guardian: 'Guardian',
    org_admin: 'Organization admin',
    admin: 'Administrator',
    super_admin: 'Administrator',
  };
  return role ? labels[role] ?? 'AceAiX member' : 'AceAiX member';
}

function roleMatchesFilter(role: string, filter: MessageFilter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Scouts') return role === 'Scout';
  if (filter === 'Clubs') return role === 'Club' || role === 'Organization admin';
  if (filter === 'Athletes') return role === 'Athlete';
  return role === 'Coach';
}

function formatConversationTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ChatThread({
  conversation,
  userId,
  onBack,
  onPreviewChange,
}: {
  conversation: ConversationRow;
  userId: string;
  onBack: () => void;
  onPreviewChange: (content: string, createdAt: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<MessageRow>>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id,conversation_id,sender_id,content,is_read,read_at,created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (loadError) {
      setError('Unable to load this conversation. Check your connection and try again.');
      setLoading(false);
      return;
    }

    setMessages((data ?? []) as MessageRow[]);
    setLoading(false);

    const readAt = new Date().toISOString();
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: readAt })
      .eq('conversation_id', conversation.id)
      .neq('sender_id', userId)
      .eq('is_read', false);
  }, [conversation.id, userId]);

  useEffect(() => {
    void loadMessages();

    const channel = supabase
      .channel(`mobile-conversation-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRow;
          setMessages((current) => (
            current.some((message) => message.id === incoming.id)
              ? current
              : [...current, incoming]
          ));
          if (incoming.sender_id !== userId) {
            void supabase
              .from('messages')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', incoming.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation.id, loadMessages, userId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft('');
    const createdAt = new Date().toISOString();
    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: userId,
        content,
        is_read: false,
      })
      .select('id,conversation_id,sender_id,content,is_read,read_at,created_at')
      .single();

    if (sendError || !data) {
      setDraft(content);
      setSending(false);
      Alert.alert('Message not sent', sendError?.message ?? 'Please check your connection and try again.');
      return;
    }

    const sent = data as MessageRow;
    setMessages((current) => (
      current.some((message) => message.id === sent.id) ? current : [...current, sent]
    ));
    onPreviewChange(content, sent.created_at ?? createdAt);

    const { error: conversationError } = await supabase
      .from('conversations')
      .update({
        last_message_at: sent.created_at ?? createdAt,
        last_message_preview: content.slice(0, 255),
      })
      .eq('id', conversation.id);

    setSending(false);
    if (conversationError) {
      Alert.alert(
        'Message sent',
        'Your message was delivered, but the conversation preview could not be refreshed.',
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[s.chatHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to conversations"
          style={s.headerButton}
          onPress={onBack}
          hitSlop={8}
        >
          <ArrowLeft color={Colors.textPrimary} size={21} />
        </TouchableOpacity>
        <View style={s.chatIdentity}>
          <View style={[s.chatAvatar, { backgroundColor: COLORS[conversation.name.length % COLORS.length] }]}>
            <Text style={s.chatAvatarText}>{conversation.name[0]?.toUpperCase() ?? 'A'}</Text>
          </View>
          <View style={s.chatIdentityText}>
            <View style={s.nameRow}>
              <Text style={s.chatName} numberOfLines={1}>{conversation.name}</Text>
              {conversation.verified && <BadgeCheck color={Colors.primary} size={14} />}
            </View>
            <Text style={s.chatRole}>{conversation.role}</Text>
          </View>
        </View>
        <View style={s.headerButton} />
      </View>

      {loading ? (
        <View style={s.centerState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={s.stateText}>Loading conversation…</Text>
        </View>
      ) : error ? (
        <View style={s.centerState}>
          <Text style={s.emptyTitle}>Conversation unavailable</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={s.retryButton} onPress={() => void loadMessages()}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={s.messageList}
          contentContainerStyle={[s.messageContent, messages.length === 0 && s.messageContentEmpty]}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const mine = item.sender_id === userId;
            return (
              <View style={[s.messageRow, mine ? s.messageRowMine : s.messageRowTheirs]}>
                <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                  <Text style={[s.messageText, mine && s.messageTextMine]}>{item.content}</Text>
                  <View style={s.messageMeta}>
                    <Text style={[s.messageTime, mine && s.messageTimeMine]}>
                      {formatConversationTime(item.created_at)}
                    </Text>
                    {mine && (
                      <CheckCheck
                        color={item.is_read ? Colors.primaryGlow : Colors.textMuted}
                        size={13}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={(
            <View style={s.centerState}>
              <MessageSquare color={Colors.primary} size={32} />
              <Text style={s.emptyTitle}>Start the conversation</Text>
              <Text style={s.stateText}>Send a message to {conversation.name}.</Text>
            </View>
          )}
        />
      )}

      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        <TextInput
          accessibilityLabel="Message text"
          style={s.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${conversation.name}`}
          placeholderTextColor={Colors.textDisabled}
          multiline
          maxLength={1000}
          editable={!sending}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (!draft.includes('\n')) void sendMessage();
          }}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[s.sendButton, (!draft.trim() || sending) && s.sendButtonDisabled]}
          onPress={() => void sendMessage()}
          disabled={!draft.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color={Colors.bg} size="small" />
            : <Send color={Colors.bg} size={19} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function NewConversationModal({
  visible,
  userId,
  conversations,
  onClose,
  onSelect,
}: {
  visible: boolean;
  userId: string;
  conversations: ConversationRow[];
  onClose: () => void;
  onSelect: (conversation: ConversationRow) => void;
}) {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoading(true);
    Promise.all([
      supabase
        .from('user_profiles')
        .select('id,full_name,role,is_verified')
        .neq('id', userId)
        .order('full_name', { ascending: true })
        .limit(100),
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
    ])
      .then(([membersResult, blocksResult]) => {
        if (!mounted) return;
        if (membersResult.error || blocksResult.error) {
          Alert.alert(
            'Unable to load members',
            membersResult.error?.message ?? blocksResult.error?.message ?? 'Please try again.',
          );
          setMembers([]);
        } else {
          const blockedIds = new Set((blocksResult.data ?? []).map((row) => row.blocked_id));
          setMembers(((membersResult.data ?? []) as MemberRow[])
            .filter((member) => !blockedIds.has(member.id)));
        }
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [userId, visible]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter((member) => (
      (member.full_name ?? '').toLowerCase().includes(normalized)
      || roleLabel(member.role).toLowerCase().includes(normalized)
    ));
  }, [members, query]);

  async function chooseMember(member: MemberRow) {
    const existing = conversations.find((conversation) => conversation.otherId === member.id);
    if (existing) {
      onSelect(existing);
      setQuery('');
      return;
    }

    setCreatingId(member.id);
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: userId,
        participant_2_id: member.id,
        subject: member.full_name ?? roleLabel(member.role),
      })
      .select('id,participant_1_id,participant_2_id,subject,last_message_at,last_message_preview')
      .single();
    setCreatingId(null);

    if (error || !data) {
      Alert.alert('Unable to start conversation', error?.message ?? 'Please try again.');
      return;
    }

    onSelect({
      id: data.id,
      participant1Id: data.participant_1_id,
      participant2Id: data.participant_2_id,
      otherId: member.id,
      name: member.full_name ?? data.subject ?? 'AceAiX member',
      role: roleLabel(member.role),
      last: 'No messages yet.',
      time: '',
      unread: 0,
      verified: member.is_verified,
    });
    setQuery('');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={[s.chatHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close new conversation"
            style={s.headerButton}
            onPress={onClose}
          >
            <X color={Colors.textPrimary} size={21} />
          </TouchableOpacity>
          <Text style={s.modalTitle}>New Conversation</Text>
          <View style={s.headerButton} />
        </View>
        <View style={s.searchWrap}>
          <Search color={Colors.textDisabled} size={15} />
          <TextInput
            accessibilityLabel="Search AceAiX members"
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search people and organizations…"
            placeholderTextColor={Colors.textDisabled}
            autoFocus
          />
        </View>
        {loading ? (
          <View style={s.centerState}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={s.stateText}>Loading members…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.memberList}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Start conversation with ${item.full_name ?? roleLabel(item.role)}`}
                style={s.memberRow}
                onPress={() => void chooseMember(item)}
                disabled={creatingId !== null}
              >
                <View style={[s.avatar, { backgroundColor: COLORS[index % COLORS.length] }]}>
                  <Text style={s.avatarTxt}>{item.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
                </View>
                <View style={s.memberIdentity}>
                  <View style={s.nameRow}>
                    <Text style={s.convoName}>{item.full_name ?? 'AceAiX member'}</Text>
                    {item.is_verified && <BadgeCheck color={Colors.primary} size={13} />}
                  </View>
                  <Text style={s.convoRole}>{roleLabel(item.role)}</Text>
                </View>
                {creatingId === item.id && <ActivityIndicator color={Colors.primary} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={(
              <View style={s.centerState}>
                <Text style={s.emptyTitle}>No members found</Text>
                <Text style={s.stateText}>Try a different name or role.</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ memberId?: string; query?: string }>();
  const autoOpenAttempted = useRef<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MessageFilter>('All');
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: conversationError } = await supabase
      .from('conversations')
      .select('id,participant_1_id,participant_2_id,subject,last_message_at,last_message_preview')
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (conversationError) {
      setError('Unable to load conversations. Check your connection and try again.');
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const otherIds = [...new Set(rows.map((row) => (
      row.participant_1_id === user.id ? row.participant_2_id : row.participant_1_id
    )))];
    const conversationIds = rows.map((row) => row.id);

    const [profilesResult, unreadResult, blocksResult] = await Promise.all([
      otherIds.length
        ? supabase.from('user_profiles').select('id,full_name,role,is_verified').in('id', otherIds)
        : Promise.resolve({ data: [] as MemberRow[], error: null }),
      conversationIds.length
        ? supabase
            .from('messages')
            .select('id,conversation_id')
            .in('conversation_id', conversationIds)
            .neq('sender_id', user.id)
            .eq('is_read', false)
        : Promise.resolve({ data: [] as { id: string; conversation_id: string }[], error: null }),
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
    ]);

    if (profilesResult.error || unreadResult.error || blocksResult.error) {
      setError('Unable to load complete conversation details. Please try again.');
      setLoading(false);
      return;
    }

    const profileMap = new Map(
      ((profilesResult.data ?? []) as MemberRow[]).map((profile) => [profile.id, profile]),
    );
    const unreadMap = new Map<string, number>();
    const blockedIds = new Set((blocksResult.data ?? []).map((row) => row.blocked_id));
    for (const message of unreadResult.data ?? []) {
      unreadMap.set(message.conversation_id, (unreadMap.get(message.conversation_id) ?? 0) + 1);
    }

    setConvos(rows.map((row) => {
      const otherId = row.participant_1_id === user.id ? row.participant_2_id : row.participant_1_id;
      if (blockedIds.has(otherId)) return null;
      const profile = profileMap.get(otherId);
      return {
        id: row.id,
        participant1Id: row.participant_1_id,
        participant2Id: row.participant_2_id,
        otherId,
        name: profile?.full_name ?? row.subject ?? `Conversation ${otherId.slice(0, 8)}`,
        role: roleLabel(profile?.role),
        last: row.last_message_preview ?? 'No messages yet.',
        time: formatConversationTime(row.last_message_at),
        unread: unreadMap.get(row.id) ?? 0,
        verified: profile?.is_verified ?? false,
      };
    }).filter((conversation): conversation is ConversationRow => conversation !== null));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (typeof params.query === 'string') setQuery(params.query);
  }, [params.query]);

  useEffect(() => {
    const memberId = typeof params.memberId === 'string' ? params.memberId : null;
    if (!memberId || !user || loading || autoOpenAttempted.current === memberId) return;
    autoOpenAttempted.current = memberId;

    const existing = convos.find((conversation) => conversation.otherId === memberId);
    if (existing) {
      setSelected(existing);
      return;
    }

    void (async () => {
      const { data: member, error: memberError } = await supabase
        .from('user_profiles')
        .select('id,full_name,role,is_verified')
        .eq('id', memberId)
        .maybeSingle();
      if (memberError || !member) {
        Alert.alert('Member unavailable', memberError?.message ?? 'This member could not be found.');
        return;
      }

      const { data, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: user.id,
          participant_2_id: member.id,
          subject: member.full_name ?? roleLabel(member.role),
        })
        .select('id,participant_1_id,participant_2_id,subject,last_message_at,last_message_preview')
        .single();
      if (createError || !data) {
        Alert.alert('Unable to start conversation', createError?.message ?? 'Please try again.');
        return;
      }

      const conversation: ConversationRow = {
        id: data.id,
        participant1Id: data.participant_1_id,
        participant2Id: data.participant_2_id,
        otherId: member.id,
        name: member.full_name ?? data.subject ?? 'AceAiX member',
        role: roleLabel(member.role),
        last: 'No messages yet.',
        time: '',
        unread: 0,
        verified: member.is_verified,
      };
      setConvos((current) => [conversation, ...current]);
      setSelected(conversation);
    })();
  }, [convos, loading, params.memberId, user]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return convos.filter((conversation) => (
      roleMatchesFilter(conversation.role, filter)
      && (
        !normalized
        || conversation.name.toLowerCase().includes(normalized)
        || conversation.last.toLowerCase().includes(normalized)
      )
    ));
  }, [convos, filter, query]);

  if (selected && user) {
    return (
      <ChatThread
        conversation={selected}
        userId={user.id}
        onBack={() => {
          setSelected(null);
          void loadConversations();
        }}
        onPreviewChange={(content, createdAt) => {
          setConvos((current) => current.map((conversation) => (
            conversation.id === selected.id
              ? {
                  ...conversation,
                  last: content,
                  time: formatConversationTime(createdAt),
                  unread: 0,
                }
              : conversation
          )));
          setSelected((current) => current ? {
            ...current,
            last: content,
            time: formatConversationTime(createdAt),
            unread: 0,
          } : null);
        }}
      />
    );
  }

  return (
    <View style={s.root}>
      <AppHeader title="Messages" />
      <View style={s.searchWrap}>
        <Search color={Colors.textDisabled} size={15} />
        <TextInput
          accessibilityLabel="Search conversations"
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search messages…"
          placeholderTextColor={Colors.textDisabled}
        />
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((item) => (
          <TouchableOpacity
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item }}
            style={[s.filterChip, filter === item && s.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[s.filterTxt, filter === item && s.filterTxtActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centerState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={s.stateText}>Loading conversations…</Text>
        </View>
      ) : error ? (
        <View style={s.centerState}>
          <Text style={s.emptyTitle}>Messages unavailable</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={s.retryButton} onPress={() => void loadConversations()}>
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {filtered.map((conversation, index) => (
            <TouchableOpacity
              key={conversation.id}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${conversation.name}`}
              style={[s.convo, index < filtered.length - 1 && s.convoBorder]}
              activeOpacity={0.7}
              onPress={() => setSelected({ ...conversation, unread: 0 })}
            >
              <View style={[s.avatar, { backgroundColor: COLORS[index % COLORS.length] }]}>
                <Text style={s.avatarTxt}>{conversation.name[0]?.toUpperCase() ?? 'A'}</Text>
              </View>
              <View style={s.convoBody}>
                <View style={s.convoTop}>
                  <View style={s.nameRow}>
                    <Text style={s.convoName} numberOfLines={1}>{conversation.name}</Text>
                    {conversation.verified && <BadgeCheck color={Colors.primary} size={13} />}
                  </View>
                  <Text style={s.convoTime}>{conversation.time}</Text>
                </View>
                <Text style={s.convoRole}>{conversation.role}</Text>
                <View style={s.convoBottom}>
                  <Text
                    style={[s.convoLast, conversation.unread > 0 && s.convoLastUnread]}
                    numberOfLines={2}
                  >
                    {conversation.last}
                  </Text>
                  {conversation.unread > 0 ? (
                    <View style={s.badge}><Text style={s.badgeTxt}>{conversation.unread}</Text></View>
                  ) : (
                    <CheckCheck color={Colors.textDisabled} size={14} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>{query || filter !== 'All' ? 'No matching conversations' : 'No messages yet'}</Text>
              <Text style={s.emptyText}>
                {query || filter !== 'All'
                  ? 'Try a different search or filter.'
                  : 'Start a conversation with an athlete, scout, coach, or club.'
                }
              </Text>
            </View>
          )}
          <View style={{ height: 96 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Start a new conversation"
        style={s.fab}
        onPress={() => setShowNewConversation(true)}
      >
        <Edit color={Colors.white} size={22} />
      </TouchableOpacity>

      {user && (
        <NewConversationModal
          visible={showNewConversation}
          userId={user.id}
          conversations={convos}
          onClose={() => setShowNewConversation(false)}
          onSelect={(conversation) => {
            setShowNewConversation(false);
            setSelected(conversation);
            setConvos((current) => (
              current.some((item) => item.id === conversation.id)
                ? current
                : [conversation, ...current]
            ));
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.elevated, borderRadius: Radii.md, marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, height: 40, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}50` },
  filterTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  filterTxtActive: { color: Colors.primary },
  list: { flex: 1 },
  convo: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  convoBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.white },
  convoBody: { flex: 1 },
  convoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: Spacing.sm },
  convoName: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  convoTime: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  convoRole: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 1, marginBottom: 4 },
  convoBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  convoLast: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 18 },
  convoLastUnread: { color: Colors.textPrimary, fontFamily: Typography.family.medium },
  badge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeTxt: { color: Colors.white, fontFamily: Typography.family.bold, fontSize: 11 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  emptyState: { margin: Spacing.lg, padding: Spacing.xl, borderRadius: Radii.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  stateText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, lineHeight: 20, color: Colors.textMuted, textAlign: 'center' },
  retryButton: { marginTop: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryText: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  chatHeader: { minHeight: 68, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  chatIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chatIdentityText: { flex: 1 },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
  chatName: { flexShrink: 1, fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  chatRole: { marginTop: 2, fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  messageList: { flex: 1 },
  messageContent: { padding: Spacing.lg, gap: Spacing.sm },
  messageContentEmpty: { flexGrow: 1 },
  messageRow: { width: '100%', marginBottom: Spacing.sm },
  messageRowMine: { alignItems: 'flex-end' },
  messageRowTheirs: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 7, borderWidth: 1 },
  bubbleMine: { backgroundColor: Colors.primary, borderColor: Colors.primary, borderBottomRightRadius: Radii.xs },
  bubbleTheirs: { backgroundColor: Colors.elevated, borderColor: Colors.border, borderBottomLeftRadius: Radii.xs },
  messageText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, lineHeight: 20, color: Colors.textPrimary },
  messageTextMine: { color: Colors.white },
  messageMeta: { marginTop: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  messageTime: { fontFamily: Typography.family.regular, fontSize: 9, color: Colors.textDisabled },
  messageTimeMine: { color: 'rgba(255,255,255,0.72)' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.elevated, paddingHorizontal: Spacing.lg, paddingTop: 11, paddingBottom: 10, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  modalRoot: { flex: 1, backgroundColor: Colors.bg },
  modalTitle: { flex: 1, textAlign: 'center', fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  memberList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.giant },
  memberRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.sm },
  memberIdentity: { flex: 1 },
});

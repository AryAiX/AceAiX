import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { BadgeCheck, Search, Edit, Check, CheckCheck } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ConversationRow {
  id: string;
  name: string;
  role: string;
  last: string;
  time: string;
  unread: number;
  verified: boolean;
  online: boolean;
}

const COLORS = [Colors.primary, Colors.accent, Colors.success, Colors.warning, '#9B59B6', '#E67E22'];

export default function Messages() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [convos, setConvos] = useState<ConversationRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (!mounted) return;
        setConvos((data ?? []).map((row: any) => {
          const otherId = row.participant_1_id === user.id ? row.participant_2_id : row.participant_1_id;
          return {
            id: row.id,
            name: row.subject ?? `Conversation ${otherId.slice(0, 8)}`,
            role: 'AceAiX member',
            last: row.last_message_preview ?? 'No messages yet.',
            time: row.last_message_at ? new Date(row.last_message_at).toLocaleDateString() : '',
            unread: 0,
            verified: false,
            online: false,
          };
        }));
      });
    return () => { mounted = false; };
  }, [user]);

  const filtered = convos.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.last.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <View style={s.root}>
      <AppHeader title="Messages" />
      <View style={s.searchWrap}>
        <Search color={Colors.textDisabled} size={15} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search messages…"
          placeholderTextColor={Colors.textDisabled}
        />
      </View>

      <View style={s.filterRow}>
        {['All', 'Scouts', 'Clubs', 'Athletes', 'AI'].map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, f === 'All' && s.filterChipActive]}>
            <Text style={[s.filterTxt, f === 'All' && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map((c, i) => (
          <TouchableOpacity key={c.id} style={[s.convo, i < filtered.length - 1 && s.convoBorder]} activeOpacity={0.7}>
            <View style={[s.avatar, { backgroundColor: COLORS[i % COLORS.length] }]}>
              {c.online && <View style={s.onlineDot} />}
              <Text style={s.avatarTxt}>{c.name[0]}</Text>
            </View>
            <View style={s.convoBody}>
              <View style={s.convoTop}>
                <View style={s.nameRow}>
                  <Text style={s.convoName} numberOfLines={1}>{c.name}</Text>
                  {c.verified && <BadgeCheck color={Colors.primary} size={13} />}
                </View>
                <Text style={s.convoTime}>{c.time}</Text>
              </View>
              <Text style={s.convoRole}>{c.role}</Text>
              <View style={s.convoBottom}>
                <Text style={[s.convoLast, c.unread > 0 && s.convoLastUnread]} numberOfLines={2}>
                  {c.last}
                </Text>
                {c.unread > 0 ? (
                  <View style={s.badge}><Text style={s.badgeTxt}>{c.unread}</Text></View>
                ) : (
                  <CheckCheck color={Colors.textDisabled} size={14} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No messages yet</Text>
            <Text style={s.emptyText}>When clubs, scouts, coaches, or athletes contact you, conversations will appear here.</Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <TouchableOpacity style={s.fab}>
        <Edit color={Colors.white} size={22} />
      </TouchableOpacity>
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
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
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
});

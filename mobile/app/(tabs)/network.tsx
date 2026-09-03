import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, UserPlus, MessageSquare, BadgeCheck, Briefcase, Star, UserX } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '@/components/AppHeader';
import Avatar from '@/components/Avatar';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ConnectionRow {
  id: string;
  name: string;
  role: string;
  org: string;
  type: string;
  verified: boolean;
  avatar: string | null;
}

const COLORS: Record<string, string> = {
  scout: Colors.primary,
  club: Colors.primary,
  coach: Colors.success,
  agent: Colors.warning,
  athlete: Colors.accent,
};

export default function Network() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [people, setPeople] = useState<ConnectionRow[]>([]);
  const [conns, setConns] = useState(new Set<string>());
  const [myBlockedIds, setMyBlockedIds] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const mountedRef = useRef(true);
  const filters = ['All', 'Scouts', 'Clubs', 'Coaches', 'Agents', 'Athletes', 'Blocked'];
  const typeMap: Record<string, string> = {
    Scouts: 'scout',
    Clubs: 'club',
    Coaches: 'coach',
    Agents: 'agent',
    Athletes: 'athlete',
  };
  const filtered = people.filter(c => {
    if (filter === 'Blocked') return myBlockedIds.has(c.id);
    if (myBlockedIds.has(c.id)) return false;
    return filter === 'All' || c.type === typeMap[filter];
  });

  const loadNetwork = useCallback(async () => {
    if (!user) return;
    if (!mountedRef.current) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [profilesResult, followsResult, myBlocksResult, reciprocalResult] = await Promise.all([
        supabase.from('user_profiles').select('id, role, full_name, bio, city, country, is_verified, avatar_url').neq('id', user.id).in('role', ['athlete', 'scout', 'club', 'coach', 'org_admin', 'federation']).order('full_name', { ascending: true }).limit(500),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
        supabase.rpc('get_blocked_user_ids'),
      ]);
      if (!mountedRef.current) return;
      if (profilesResult.error || followsResult.error || myBlocksResult.error || reciprocalResult.error) {
        setLoadError(true);
        return;
      }
      const ownBlocked = new Set((myBlocksResult.data ?? []).map((row: any) => row.blocked_id));
      const reciprocalIds = new Set((reciprocalResult.data ?? []).map((row: any) => row.blocked_user_id));
      const blockedByOthersIds = new Set([...reciprocalIds].filter((id) => !ownBlocked.has(id)));
      setMyBlockedIds(ownBlocked);
      setPeople((profilesResult.data ?? [])
        .filter((row: any) => !blockedByOthersIds.has(row.id))
        .map((row: any) => ({
        id: row.id,
        name: row.full_name ?? 'AceAiX member',
        role: String(row.role ?? 'athlete').replace('_', ' '),
        org: [row.city, row.country].filter(Boolean).join(', ') || 'AceAiX',
        type: row.role === 'org_admin' ? 'agent' : row.role === 'federation' ? 'club' : row.role ?? 'athlete',
        verified: row.is_verified ?? false,
        avatar: row.avatar_url ?? null,
        })));
      setConns(new Set((followsResult.data ?? []).map((row: any) => row.following_id)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { void loadNetwork(); }, [loadNetwork]);

  useFocusEffect(
    useCallback(() => {
      void loadNetwork();
    }, [loadNetwork])
  );

  async function toggleConnection(id: string, connected: boolean) {
    if (!user) return;
    let error: { message: string } | null = null;
    if (connected) {
      ({ error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id));
    } else {
      ({ error } = await supabase.from('follows').upsert({ follower_id: user.id, following_id: id }, { onConflict: 'follower_id,following_id' }));
    }
    if (error) {
      Alert.alert('Connection not updated', error.message);
      return;
    }
    setConns(prev => {
      const next = new Set(prev);
      if (connected) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function unblockUser(id: string) {
    if (!user) return;
    const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', id);
    if (error) {
      Alert.alert('Could not unblock', error.message);
      return;
    }
    setMyBlockedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function blockUser(id: string, name: string) {
    if (!user) return;
    const performBlock = async () => {
      const { error } = await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: id }, { onConflict: 'blocker_id,blocked_id' });
      if (error) {
        Alert.alert('Could not block', error.message);
        return;
      }
      await supabase.from('follows').delete().or(`and(follower_id.eq.${user.id},following_id.eq.${id}),and(follower_id.eq.${id},following_id.eq.${user.id})`);
      setConns(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setMyBlockedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Block ${name}? They won't be able to see your profile or message you.`)) {
        void performBlock();
      }
      return;
    }
    Alert.alert(
      'Block this person?',
      `${name} won't be able to see your profile or message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => void performBlock(),
        },
      ],
    );
  }

  return (
    <View style={s.root}>
      <AppHeader title="Network" />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNetwork} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        <View style={s.statsRow}>
          {[{ label: 'Connections', value: String(conns.size) }, { label: 'Scouts', value: String(people.filter(p => p.type === 'scout' && conns.has(p.id)).length) }, { label: 'Clubs', value: String(people.filter(p => p.type === 'club' && conns.has(p.id)).length) }].map((st, i) => (
            <View key={st.label} style={[s.stat, i < 2 && s.statBorder]}>
              <Text style={s.statVal}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {filters.map(f => (
            <TouchableOpacity key={f} style={[s.chip, f === filter && s.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[s.chipTxt, f === filter && s.chipTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && people.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
        ) : loadError ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Couldn’t load your network</Text>
            <Text style={s.emptyText}>Pull down to try again.</Text>
          </View>
        ) : (
          <>
        <View style={s.list}>
          {filtered.map(c => {
            const isConn = conns.has(c.id);
            const color = COLORS[c.type] ?? Colors.primary;
            return (
              <TouchableOpacity
                key={c.id}
                style={s.card}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`View ${c.name}'s profile`}
                onPress={() => router.push(`/athlete/${c.id}`)}
              >
                <View style={[s.av, { backgroundColor: color }]}>
                  {c.avatar ? (
                    <Avatar uri={c.avatar} initial={c.name[0]} size={46} />
                  ) : (
                    <Text style={s.avTxt}>{c.name[0]}</Text>
                  )}
                </View>
                <View style={s.info}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.cName}>{c.name}</Text>
                    {c.verified && <BadgeCheck color={Colors.primary} size={13} />}
                    {filter === 'Blocked' && (
                      <View style={s.blockedBadge}>
                        <Text style={s.blockedBadgeTxt}>Blocked</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cRole}>{c.role}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Briefcase color={Colors.textDisabled} size={11} />
                    <Text style={s.cOrg}>{c.org}</Text>
                  </View>
                </View>
                {filter === 'Blocked' ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Unblock ${c.name}`}
                    style={s.unblockBtn}
                    onPress={() => unblockUser(c.id)}
                  >
                    <Text style={s.unblockTxt}>Unblock</Text>
                  </TouchableOpacity>
                ) : (
                <View style={s.actions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${c.name}`}
                    style={s.msgBtn}
                    onPress={() => router.push({
                      pathname: '/(tabs)/messages',
                      params: { memberId: c.id },
                    } as any)}
                  >
                    <MessageSquare color={Colors.primary} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.connBtn, isConn && s.connBtnActive]}
                    onPress={() => toggleConnection(c.id, isConn)}
                  >
                    <Text style={[s.connTxt, isConn && s.connTxtActive]}>
                      {isConn ? 'Connected' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Block ${c.name}`}
                    style={s.blockBtn}
                    onPress={() => blockUser(c.id, c.name)}
                  >
                    <UserX color={Colors.textMuted} size={16} />
                  </TouchableOpacity>
                </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No network matches</Text>
            <Text style={s.emptyText}>Verified AceAiX members will appear here as real profiles are added.</Text>
          </View>
        )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border },
  stat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  statVal: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  statLbl: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  chipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}50` },
  chipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  chipTxtActive: { color: Colors.primary },
  blockedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full, backgroundColor: `${Colors.error}20`, borderWidth: 1, borderColor: `${Colors.error}50` },
  blockedBadgeTxt: { fontFamily: Typography.family.medium, fontSize: 10, color: Colors.error },
  unblockBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.md, backgroundColor: `${Colors.error}15`, borderWidth: 1, borderColor: `${Colors.error}40` },
  unblockTxt: { fontFamily: Typography.family.medium, fontSize: 11, color: Colors.error },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, alignItems: 'center' },
  av: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.white },
  info: { flex: 1, gap: 2 },
  cName: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  cRole: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  cOrg: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  actions: { gap: 8, alignItems: 'flex-end' },
  msgBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}30` },
  blockBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  connBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.md, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  connBtnActive: { backgroundColor: `${Colors.primary}15`, borderColor: `${Colors.primary}40` },
  connTxt: { fontFamily: Typography.family.medium, fontSize: 11, color: Colors.textPrimary },
  connTxtActive: { color: Colors.primary },
  emptyState: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: Spacing.xl, borderRadius: Radii.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});

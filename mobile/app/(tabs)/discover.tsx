import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, BadgeCheck, Star, UserPlus } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const FILTERS = ['All', 'Football', 'Basketball', 'Tennis', 'Athletics'];
const COLORS = [Colors.primary, Colors.accent, Colors.success, Colors.warning, '#9B59B6', '#E67E22'];

interface AthleteRow {
  id: string;
  user_id: string;
  name: string;
  pos: string;
  sport: string;
  club: string;
  loc: string;
  rating: string;
  verified: boolean;
  tags: string[];
}

export default function Discover() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const filteredAthletes = athletes.filter((a) => activeFilter === 'All' || a.sport === activeFilter);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([
      supabase
        .from('athlete_profiles')
        .select('id,user_id,sport,position,position_primary,current_club,performance_score,user:user_profiles(full_name,city,country,is_verified)')
        .neq('user_id', user.id)
        .limit(50),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
    ]).then(([athletesResult, followsResult]) => {
      if (!mounted) return;
      setAthletes((athletesResult.data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.user?.full_name ?? 'AceAiX athlete',
        pos: row.position_primary ?? row.position ?? 'Athlete',
        sport: row.sport ?? 'Football',
        club: row.current_club ?? 'Club not set',
        loc: [row.user?.city, row.user?.country].filter(Boolean).join(', ') || 'Location not set',
        rating: row.performance_score ? (row.performance_score / 10).toFixed(1) : '—',
        verified: row.user?.is_verified ?? false,
        tags: [],
      })));
      setConnected(new Set((followsResult.data ?? []).map((row: any) => row.following_id)));
    });
    return () => { mounted = false; };
  }, [user]);

  async function toggleConnection(athleteUserId: string, isConnected: boolean) {
    if (!user) return;
    if (isConnected) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', athleteUserId);
    } else {
      await supabase.from('follows').upsert({ follower_id: user.id, following_id: athleteUserId });
    }
    setConnected((prev) => {
      const next = new Set(prev);
      isConnected ? next.delete(athleteUserId) : next.add(athleteUserId);
      return next;
    });
  }

  return (
    <View style={s.root}>
      <AppHeader title="Discover Athletes" />
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.chip, f === activeFilter && s.chipActive]} onPress={() => setActiveFilter(f)}>
              <Text style={[s.chipTxt, f === activeFilter && s.chipTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{athletes.length}</Text>
            <Text style={s.statLbl}>Athletes</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: Colors.accent }]}>0</Text>
            <Text style={s.statLbl}>Near You</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: Colors.success }]}>{connected.size}</Text>
            <Text style={s.statLbl}>Connections</Text>
          </View>
        </View>

        <View style={s.list}>
          {filteredAthletes.map((a, i) => {
            const isConn = connected.has(a.user_id);
            return (
              <View key={a.id} style={s.card}>
                <View style={[s.av, { backgroundColor: COLORS[i % COLORS.length] }]}>
                  <Text style={s.avTxt}>{a.name[0]}</Text>
                </View>
                <View style={s.info}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.name}>{a.name}</Text>
                    {a.verified && <BadgeCheck color={Colors.primary} size={14} />}
                  </View>
                  <Text style={s.pos}>{a.pos} · {a.sport}</Text>
                  <Text style={s.club}>{a.club}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin color={Colors.textDisabled} size={11} />
                    <Text style={s.loc}>{a.loc}</Text>
                  </View>
                  <View style={s.tagsRow}>
                    {a.tags.map(tag => (
                      <View key={tag} style={s.tag}>
                        <Text style={s.tagTxt}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.right}>
                  <View style={s.ratingBadge}>
                    <Star color={Colors.accent} size={12} fill={Colors.accent} />
                    <Text style={s.ratingTxt}>{a.rating}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.connectBtn, isConn && s.connectBtnActive]}
                    onPress={() => toggleConnection(a.user_id, isConn)}
                  >
                    <UserPlus color={isConn ? Colors.primary : Colors.textPrimary} size={14} />
                    <Text style={[s.connectTxt, isConn && s.connectTxtActive]}>
                      {isConn ? 'Connected' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {filteredAthletes.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No athletes found</Text>
              <Text style={s.emptyText}>Live athlete profiles will appear here as users complete their profiles.</Text>
            </View>
          )}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}50` },
  chipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },
  chipTxtActive: { color: Colors.primary },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statNum: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  statLbl: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  av: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.white },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  pos: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.primary },
  club: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  loc: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { backgroundColor: `${Colors.accent}18`, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 2 },
  tagTxt: { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.accent },
  right: { alignItems: 'flex-end', gap: Spacing.sm },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${Colors.accent}15`, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  ratingTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.accent },
  connectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.md, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  connectBtnActive: { backgroundColor: `${Colors.primary}15`, borderColor: `${Colors.primary}40` },
  connectTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textPrimary },
  connectTxtActive: { color: Colors.primary },
  emptyState: { padding: Spacing.xl, borderRadius: Radii.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});

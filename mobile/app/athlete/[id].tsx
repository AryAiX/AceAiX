import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Modal, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck, MapPin, Globe, Share2, UserCheck, Zap, MessageSquare, MoreHorizontal,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { fetchPublicAthleteProfile, PublicAthleteProfile } from '@/lib/postsService';

export default function AthleteProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const isOwnProfile = !!user && !!id && user.id === id;

  const [athleteProfile, setAthleteProfile] = useState<PublicAthleteProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [relationLoading, setRelationLoading] = useState(true);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  useEffect(() => {
    if (isOwnProfile) router.replace('/(tabs)/profile' as any);
  }, [isOwnProfile, router]);

  const { record, loading: performanceLoading, error: performanceError } = usePerformanceData(
    isOwnProfile ? undefined : id,
    athleteProfile?.sport,
  );

  const loadProfile = useCallback(async () => {
    if (!id || isOwnProfile) return;
    setProfileLoading(true);
    setNotFound(false);
    const result = await fetchPublicAthleteProfile(id);
    if (!result) {
      setNotFound(true);
      setAthleteProfile(null);
    } else {
      setAthleteProfile(result);
    }
    setProfileLoading(false);
  }, [id, isOwnProfile]);

  const loadRelationship = useCallback(async () => {
    if (!user || !id || isOwnProfile) return;
    setRelationLoading(true);
    const [followResult, blockResult] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', id).maybeSingle(),
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', id).maybeSingle(),
    ]);
    setIsConnected(!!followResult.data);
    setIsBlocked(!!blockResult.data);
    setRelationLoading(false);
  }, [user, id, isOwnProfile]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);
  useEffect(() => { void loadRelationship(); }, [loadRelationship]);

  async function toggleConnection() {
    if (!user || !id) return;
    let error: { message: string } | null = null;
    if (isConnected) {
      ({ error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id));
    } else {
      ({ error } = await supabase.from('follows').upsert({ follower_id: user.id, following_id: id }, { onConflict: 'follower_id,following_id' }));
    }
    if (error) {
      Alert.alert('Connection not updated', error.message);
      return;
    }
    setIsConnected((prev) => !prev);
  }

  async function blockAthlete() {
    if (!user || !id) return;
    const name = athleteProfile?.full_name ?? 'this athlete';
    const performBlock = async () => {
      const { error } = await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: id }, { onConflict: 'blocker_id,blocked_id' });
      if (error) {
        Alert.alert('Could not block', error.message);
        return;
      }
      await supabase.from('follows').delete().or(`and(follower_id.eq.${user.id},following_id.eq.${id}),and(follower_id.eq.${id},following_id.eq.${user.id})`);
      setIsConnected(false);
      setIsBlocked(true);
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

  function messageAthlete() {
    if (!id) return;
    router.push({
      pathname: '/(tabs)/messages',
      params: { memberId: id },
    } as any);
  }

  const handleShare = async () => {
    await Share.share({ message: `Check out ${athleteProfile?.full_name ?? 'this athlete'}'s profile on AceAiX!` });
  };

  if (isOwnProfile) return null;

  const performanceScore = Math.round(athleteProfile?.performance_score ?? 0);
  const stats = record?.stats ?? {};
  const seasonHighlights = [
    { label: 'Appearances', value: stats.appearances ?? stats.apps },
    { label: 'Goals', value: stats.goals },
    { label: 'Assists', value: stats.assists },
    { label: 'Avg Rating', value: stats.average_rating ?? stats.rating },
  ].filter((item) => item.value !== null && item.value !== undefined);

  return (
    <View style={s.root}>
      <AppHeader title="Profile" />

      {profileLoading ? (
        <View style={s.centerState}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : notFound || !athleteProfile ? (
        <View style={s.centerState}>
          <Text style={s.emptyTitle}>Profile not found</Text>
          <Text style={s.emptyText}>This athlete’s profile is unavailable.</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Cover */}
          <View style={s.coverWrap}>
            <LinearGradient
              colors={[`${Colors.primary}90`, Colors.bg]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={s.coverTopRight}>
              {!isBlocked && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                  style={s.moreBtn}
                  onPress={blockAthlete}
                >
                  <MoreHorizontal color={Colors.white} size={18} />
                </TouchableOpacity>
              )}
              <View style={s.aiScoreBadge}>
                <Text style={s.aiScoreNum}>{performanceScore}</Text>
                <Text style={s.aiScoreLbl}>Performance</Text>
                {performanceScore > 0 && (
                  <View style={s.elitePill}>
                    <Zap color={Colors.bg} size={9} fill={Colors.bg} />
                    <Text style={s.eliteTxt}>{performanceScore >= 85 ? 'High' : 'Active'}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={s.heroCard}>
            <View style={s.avatarWrap}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View profile photo"
                activeOpacity={athleteProfile.avatar_url ? 0.85 : 1}
                disabled={!athleteProfile.avatar_url}
                onPress={() => setAvatarViewerOpen(true)}
                style={s.avatar}
              >
                <Avatar
                  uri={athleteProfile.avatar_url}
                  initial={athleteProfile.full_name?.[0]?.toUpperCase() ?? 'A'}
                  size={76}
                />
              </TouchableOpacity>
            </View>

            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{athleteProfile.full_name ?? 'Athlete'}</Text>
              {athleteProfile.is_verified && <BadgeCheck color={Colors.primary} size={20} />}
            </View>
            <Text style={s.pos}>
              {[athleteProfile.position, athleteProfile.sport].filter(Boolean).join(' · ') || 'Sport profile not completed'}
            </Text>
            {athleteProfile.current_club && (
              <Text style={s.club}>{athleteProfile.current_club}</Text>
            )}

            <View style={s.metaRow}>
              {athleteProfile.current_location && (
                <View style={s.metaItem}>
                  <MapPin color={Colors.textDisabled} size={11} />
                  <Text style={s.metaTxt}>{athleteProfile.current_location}</Text>
                </View>
              )}
              {athleteProfile.nationality && (
                <View style={s.metaItem}>
                  <Globe color={Colors.textDisabled} size={11} />
                  <Text style={s.metaTxt}>{athleteProfile.nationality}</Text>
                </View>
              )}
            </View>

            <View style={s.statsRow}>
              {[
                { label: 'Visibility', value: String(Math.round(athleteProfile.visibility_score ?? 0)), color: Colors.primary },
                { label: 'Performance', value: String(performanceScore), color: Colors.accent },
                { label: 'Complete', value: `${Math.round(athleteProfile.profile_completeness ?? 0)}%`, color: Colors.success },
              ].map((st, i) => (
                <View key={st.label} style={[s.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: Colors.border }]}>
                  <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.statLbl}>{st.label}</Text>
                </View>
              ))}
            </View>

            {isBlocked ? (
              <View style={s.blockedNotice}>
                <Text style={s.blockedNoticeTxt}>You’ve blocked this athlete.</Text>
              </View>
            ) : (
              <View style={s.actionsRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${athleteProfile.full_name ?? 'athlete'}`}
                  style={s.endorseBtn}
                  onPress={messageAthlete}
                >
                  <LinearGradient
                    colors={[Colors.accent, `${Colors.accent}CC`]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.endorseGrad}
                  >
                    <MessageSquare color={Colors.bg} size={15} />
                    <Text style={s.endorseBtnTxt}>Message</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={isConnected ? `Disconnect from ${athleteProfile.full_name ?? 'athlete'}` : `Connect with ${athleteProfile.full_name ?? 'athlete'}`}
                  style={[s.connectBtn, isConnected && s.connectBtnActive]}
                  disabled={relationLoading}
                  onPress={toggleConnection}
                >
                  <UserCheck color={Colors.primary} size={15} />
                  <Text style={s.connectBtnTxt}>{isConnected ? 'Connected' : 'Connect'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
                  <Share2 color={Colors.textMuted} size={15} />
                  <Text style={s.shareBtnTxt}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={s.section}>
            <View style={s.card}>
              <Text style={s.cardTitle}>About</Text>
              <Text style={s.cardBody}>{athleteProfile.bio || 'No public bio has been added yet.'}</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Season Highlights</Text>
              {performanceLoading ? (
                <Text style={s.cardBody}>Loading performance data...</Text>
              ) : performanceError ? (
                <Text style={s.cardBody}>Couldn’t load performance data — pull to refresh or try again later.</Text>
              ) : seasonHighlights.length > 0 ? (
                <View style={s.grid}>
                  {seasonHighlights.map(h => (
                    <View key={h.label} style={s.gridItem}>
                      <Text style={s.gridVal}>{String(h.value)}</Text>
                      <Text style={s.gridLbl}>{h.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.cardBody}>No performance data available yet.</Text>
              )}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <Modal
        visible={avatarViewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarViewerOpen(false)}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close profile photo"
          style={s.avatarViewerBackdrop}
          activeOpacity={1}
          onPress={() => setAvatarViewerOpen(false)}
        >
          {athleteProfile?.avatar_url && (
            <Image source={{ uri: athleteProfile.avatar_url }} style={s.avatarViewerImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: 6 },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: 6, textAlign: 'center' },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  coverWrap: { height: 200, position: 'relative' },
  coverTopRight: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  moreBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,14,20,0.75)', borderWidth: 1, borderColor: `${Colors.textMuted}30` },
  aiScoreBadge: { alignItems: 'center', backgroundColor: 'rgba(10,14,20,0.75)', borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.accent}50` },
  aiScoreNum: { fontFamily: Typography.family.display, fontSize: 30, color: Colors.accent, lineHeight: 34 },
  aiScoreLbl: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  elitePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  eliteTxt: { fontFamily: Typography.family.display, fontSize: 9, color: Colors.bg },
  heroCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -Spacing.xxl, borderRadius: Radii.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  avatarWrap: { marginBottom: Spacing.md },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.bg, overflow: 'hidden' },
  avatarViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarViewerImage: { width: '100%', height: '80%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontFamily: Typography.family.display, fontSize: 24, color: Colors.textPrimary, flex: 1 },
  pos: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: 2 },
  club: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl },
  statLbl: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  endorseBtn: { flex: 2, borderRadius: Radii.md, overflow: 'hidden' },
  endorseGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  endorseBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.bg },
  connectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.primary}30`, paddingVertical: 11 },
  connectBtnActive: { backgroundColor: `${Colors.primary}25`, borderColor: `${Colors.primary}60` },
  connectBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 11 },
  shareBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textMuted },
  blockedNotice: { alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: `${Colors.error}10`, borderRadius: Radii.lg, borderWidth: 1, borderColor: `${Colors.error}30` },
  blockedNoticeTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.error },
  section: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  cardBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridItem: { flex: 1, minWidth: '44%', backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  gridVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl, color: Colors.primary },
  gridLbl: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
});

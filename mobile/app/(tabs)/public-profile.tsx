import React, { useState, useEffect } from 'react';
import {
  Alert, View, Text, ScrollView, StyleSheet, TouchableOpacity, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck, MapPin, Globe, Share2, ThumbsUp, UserCheck, Zap,
} from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { usePerformanceData } from '@/hooks/usePerformanceData';

export default function PublicProfile() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const { record } = usePerformanceData(user?.id, profile?.sport);
  const performanceScore = Math.round(profile?.performance_score ?? 0);
  const stats = record?.stats ?? {};
  const seasonHighlights = [
    { label: 'Appearances', value: stats.appearances ?? stats.apps },
    { label: 'Goals', value: stats.goals },
    { label: 'Assists', value: stats.assists },
    { label: 'Avg Rating', value: stats.average_rating ?? stats.rating },
  ].filter((item) => item.value !== null && item.value !== undefined);

  const handleShare = async () => {
    await Share.share({ message: `Check out ${profile?.full_name ?? 'this athlete'}'s profile on AceAiX!` });
  };

  const explainPreviewAction = (action: string) => {
    Alert.alert(
      'Public profile preview',
      `${action} is available to other AceAiX members when they view your public profile.`,
    );
  };

  return (
    <View style={s.root}>
      <AppHeader title="Public Profile" />
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={s.coverWrap}>
          <LinearGradient
            colors={[`${Colors.primary}90`, Colors.bg]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
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

        <View style={s.heroCard}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
            </View>
          </View>

          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{profile?.full_name ?? 'Athlete'}</Text>
            {profile?.is_verified && <BadgeCheck color={Colors.primary} size={20} />}
          </View>
          <Text style={s.pos}>
            {[profile?.position, profile?.sport].filter(Boolean).join(' · ') || 'Sport profile not completed'}
          </Text>

          <View style={s.metaRow}>
            {profile?.current_location && (
              <View style={s.metaItem}>
                <MapPin color={Colors.textDisabled} size={11} />
                <Text style={s.metaTxt}>{profile.current_location}</Text>
              </View>
            )}
            {profile?.nationality && (
              <View style={s.metaItem}>
                <Globe color={Colors.textDisabled} size={11} />
                <Text style={s.metaTxt}>{profile.nationality}</Text>
              </View>
            )}
          </View>

          <View style={s.statsRow}>
            {[
              { label: 'Visibility', value: String(Math.round(profile?.visibility_score ?? 0)), color: Colors.primary },
              { label: 'Performance', value: String(performanceScore), color: Colors.accent },
              { label: 'Complete', value: `${Math.round(profile?.profile_completeness ?? 0)}%`, color: Colors.success },
            ].map((st, i) => (
              <View key={st.label} style={[s.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: Colors.border }]}>
                <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                <Text style={s.statLbl}>{st.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.actionsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.endorseBtn}
              onPress={() => explainPreviewAction('Endorsement')}
            >
              <LinearGradient
                colors={[Colors.accent, `${Colors.accent}CC`]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.endorseGrad}
              >
                <ThumbsUp color={Colors.bg} size={15} fill={Colors.bg} />
                <Text style={s.endorseBtnTxt}>Endorse</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.connectBtn}
              onPress={() => explainPreviewAction('Connection')}
            >
              <UserCheck color={Colors.primary} size={15} />
              <Text style={s.connectBtnTxt}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
              <Share2 color={Colors.textMuted} size={15} />
              <Text style={s.shareBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.card}>
            <Text style={s.cardTitle}>About</Text>
            <Text style={s.cardBody}>{profile?.bio || 'No public bio has been added yet.'}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Season Highlights</Text>
            {seasonHighlights.length > 0 ? (
              <View style={s.grid}>
                {seasonHighlights.map(h => (
                  <View key={h.label} style={s.gridItem}>
                    <Text style={s.gridVal}>{String(h.value)}</Text>
                    <Text style={s.gridLbl}>{h.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.cardBody}>Add performance data to display season highlights.</Text>
            )}
          </View>
          <TouchableOpacity style={s.fullProfileBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={s.fullProfileTxt}>View Full Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  coverWrap: { height: 200, position: 'relative' },
  aiScoreBadge: { position: 'absolute', top: 16, right: 16, alignItems: 'center', backgroundColor: 'rgba(10,14,20,0.75)', borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.accent}50` },
  aiScoreNum: { fontFamily: Typography.family.display, fontSize: 30, color: Colors.accent, lineHeight: 34 },
  aiScoreLbl: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  elitePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  eliteTxt: { fontFamily: Typography.family.display, fontSize: 9, color: Colors.bg },
  heroCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: -Spacing.xxl, borderRadius: Radii.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  avatarWrap: { marginBottom: Spacing.md },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.bg },
  avatarTxt: { fontFamily: Typography.family.display, fontSize: 28, color: Colors.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontFamily: Typography.family.display, fontSize: 24, color: Colors.textPrimary, flex: 1 },
  pos: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
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
  connectBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 11 },
  shareBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textMuted },
  section: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  cardBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridItem: { flex: 1, minWidth: '44%', backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  gridVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xxl, color: Colors.primary },
  gridLbl: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  fullProfileBtn: { alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.lg, borderWidth: 1, borderColor: `${Colors.primary}28` },
  fullProfileTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.primary },
});

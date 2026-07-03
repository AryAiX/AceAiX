import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { RefreshCw, ChevronDown, Zap } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { getSportConfig, ARCHETYPE_LABELS, SportConfig } from '@/constants/sportsConfig';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { triggerChessSync } from '@/lib/performanceService';
import { TeamMatchRenderer } from '@/components/performance/TeamMatchRenderer';
import { RatedLadderRenderer } from '@/components/performance/RatedLadderRenderer';
import { TimedMeasuredRenderer } from '@/components/performance/TimedMeasuredRenderer';
import { HandicapNicheRenderer } from '@/components/performance/HandicapNicheRenderer';
import { SelfReportForm } from '@/components/performance/SelfReportForm';

interface GalleryAthlete {
  name: string;
  sport: string;
  team: string;
  season: string;
  source: string;
  lastSyncedAt: string;
  stats: Record<string, any>;
}

const GALLERY_ATHLETES: GalleryAthlete[] = [];

// ── Archetype renderer dispatcher ─────────────────────────────────────────────
function ArchetypeRenderer({
  config, stats, source, lastSyncedAt, season,
}: {
  config: SportConfig;
  stats: Record<string, any>;
  source: string;
  lastSyncedAt: string;
  season: string;
}) {
  const props = { displayName: config.displayName, season, stats, source, lastSyncedAt };
  switch (config.archetype) {
    case 'team_match':
      return <TeamMatchRenderer sport={config.sport} metrics={config.metrics} {...props} />;
    case 'rated_ladder':
      return <RatedLadderRenderer {...props} />;
    case 'timed_measured':
      return <TimedMeasuredRenderer metrics={config.metrics} {...props} />;
    case 'handicap_niche':
      return <HandicapNicheRenderer {...props} />;
    default:
      return <Text style={{ color: Colors.textMuted, fontFamily: Typography.family.regular }}>
        Renderer for &apos;{config.archetype}&apos; coming soon.
      </Text>;
  }
}

// ── My Performance panel ──────────────────────────────────────────────────────
function MyPerformance({ userId, sport }: { userId: string; sport: string | null }) {
  const config = getSportConfig(sport);
  const { record, loading, refresh } = usePerformanceData(userId, sport);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { profile } = useAuth();

  async function handleChessSync() {
    setSyncing(true);
    setSyncError(null);
    const { ok, error } = await triggerChessSync(
      userId,
      profile?.chesscom_username,
      profile?.lichess_username
    );
    if (!ok) setSyncError(error);
    else await refresh();
    setSyncing(false);
  }

  if (!config) {
    return (
      <View style={s.emptyState}>
        <Text style={s.emptyTitle}>No sport configured</Text>
        <Text style={s.emptyBody}>Update your profile to set your sport and unlock the performance engine.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={s.archetypeTag}>
        <Zap color={Colors.accent} size={12} fill={Colors.accent} />
        <Text style={s.archetypeTagTxt}>{ARCHETYPE_LABELS[config.archetype]}</Text>
        <Text style={s.archetypeTagSep}>·</Text>
        <Text style={s.archetypeTagSport}>{config.displayName}</Text>
      </View>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />}

      {!loading && record && !showForm && (
        <>
          <ArchetypeRenderer
            config={config}
            stats={record.stats}
            source={record.source}
            lastSyncedAt={record.last_synced_at}
            season={record.season_or_period ?? new Date().getFullYear().toString()}
          />
          <View style={s.actionRow}>
            {config.supportsAutoSync && (
              <TouchableOpacity style={s.syncBtn} onPress={handleChessSync} disabled={syncing}>
                {syncing
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <><RefreshCw color={Colors.primary} size={14} /><Text style={s.syncBtnTxt}>Sync Now</Text></>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.editBtn} onPress={() => setShowForm(true)}>
              <Text style={s.editBtnTxt}>Edit Stats</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!loading && !record && !showForm && (
        <View style={s.noDataState}>
          <Text style={s.noDataTitle}>No performance data yet</Text>
          {config.supportsAutoSync ? (
            <>
              <Text style={s.noDataBody}>{config.syncNote}</Text>
              <TouchableOpacity style={s.syncBtn} onPress={handleChessSync} disabled={syncing}>
                {syncing
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <><RefreshCw color={Colors.primary} size={14} /><Text style={s.syncBtnTxt}>Auto-Sync from Chess.com / Lichess</Text></>
                }
              </TouchableOpacity>
              <Text style={s.dividerTxt}>— or enter manually —</Text>
            </>
          ) : (
            <Text style={s.noDataBody}>{config.syncNote ?? 'Enter your stats below.'}</Text>
          )}
          <TouchableOpacity style={s.addStatsBtn} onPress={() => setShowForm(true)}>
            <Text style={s.addStatsBtnTxt}>Add Stats Manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {showForm && (
        <SelfReportForm
          config={config}
          athlete_id={userId}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}

      {syncError && <Text style={s.syncError}>{syncError}</Text>}
    </View>
  );
}

// ── Gallery card ──────────────────────────────────────────────────────────────
function GalleryAthleteCard({ athlete }: { athlete: GalleryAthlete }) {
  const config = getSportConfig(athlete.sport);
  const [open, setOpen] = useState(false);
  if (!config) return null;
  return (
    <View style={s.galleryCard}>
      <TouchableOpacity style={s.galleryHeader} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <View style={{ flex: 1 }}>
          <Text style={s.galleryName}>{athlete.name}</Text>
          <Text style={s.galleryTeam}>{athlete.team}</Text>
        </View>
        <View style={s.galleryArchetypeTag}>
          <Text style={s.galleryArchetypeTxt}>{ARCHETYPE_LABELS[config.archetype]}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown color={Colors.textMuted} size={16} />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={s.galleryBody}>
          <ArchetypeRenderer
            config={config}
            stats={athlete.stats}
            source={athlete.source}
            lastSyncedAt={athlete.lastSyncedAt}
            season={athlete.season}
          />
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Performance() {
  const { user, profile } = useAuth();

  return (
    <View style={s.root}>
      <AppHeader title="Performance Engine" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* My Performance */}
        <View style={s.sectionHeader}>
          <View style={s.sectionBar} />
          <Text style={s.sectionTitle}>MY PERFORMANCE</Text>
        </View>
        <View style={s.card}>
          {user ? (
            <MyPerformance userId={user.id} sport={profile?.sport ?? null} />
          ) : (
            <Text style={s.emptyBody}>Sign in to track your performance.</Text>
          )}
        </View>

        {/* Multi-sport gallery */}
        <View style={[s.sectionHeader, { marginTop: Spacing.xl }]}>
          <View style={[s.sectionBar, { backgroundColor: Colors.accent }]} />
          <Text style={s.sectionTitle}>MULTI-SPORT ENGINE GALLERY</Text>
        </View>
        <Text style={s.gallerySubtitle}>
          Live performance examples will appear here when athlete records are available.
        </Text>
        {GALLERY_ATHLETES.map(a => <GalleryAthleteCard key={a.name} athlete={a} />)}
        {GALLERY_ATHLETES.length === 0 && (
          <View style={s.card}>
            <Text style={s.emptyTitle}>No comparison records yet</Text>
            <Text style={s.emptyBody}>Add or sync verified performance records to populate this section.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  sectionBar: { width: 3, height: 14, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionTitle: { fontFamily: Typography.family.display, fontSize: 11, color: Colors.textDisabled, letterSpacing: 1.6 },

  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },

  archetypeTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.md },
  archetypeTagTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.accent },
  archetypeTagSep: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  archetypeTagSport: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textMuted },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm },
  emptyTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  emptyBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  noDataState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  noDataTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  noDataBody: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.sm },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  syncBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, paddingVertical: 10, borderWidth: 1, borderColor: `${Colors.primary}30` },
  syncBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.primary },
  editBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.elevated, borderRadius: Radii.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  editBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  addStatsBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 11, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  addStatsBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  dividerTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },

  syncError: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.error, marginTop: Spacing.sm, textAlign: 'center' },

  gallerySubtitle: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.sm, marginTop: 2 },

  galleryCard: { backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.sm },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  galleryName: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  galleryTeam: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  galleryArchetypeTag: { backgroundColor: `${Colors.accent}15`, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.accent}28` },
  galleryArchetypeTxt: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.accent, letterSpacing: 0.5 },
  galleryBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
});

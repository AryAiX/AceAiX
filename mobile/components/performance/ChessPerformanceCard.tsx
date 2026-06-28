import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { RefreshCw, BadgeCheck, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { ChessStats, ChessVariant, extractVariants, isSyncStale, sourceDisplayLabel, isVerified } from '@/lib/chessService';

const { width: SW } = Dimensions.get('window');

const TITLE_COLORS: Record<string, string> = {
  GM: Colors.accent,
  IM: '#A594F9',
  FM: Colors.primary,
  CM: Colors.textMuted,
  NM: Colors.textMuted,
  WGM: Colors.accent,
  WIM: '#A594F9',
  WFM: Colors.primary,
};

// ── Source tag ────────────────────────────────────────────────────────────────
function SourceRow({ source, lastSyncedAt, onRefresh, refreshing, canRefresh }: {
  source: string; lastSyncedAt: string;
  onRefresh: () => void; refreshing: boolean; canRefresh: boolean;
}) {
  const verified = isVerified(source);
  const color = verified ? Colors.success : Colors.textDisabled;
  const ago = formatAgo(lastSyncedAt);
  return (
    <View style={s.sourceRow}>
      <View style={[s.sourceTag, { borderColor: `${color}28`, backgroundColor: `${color}10` }]}>
        {verified && <BadgeCheck color={color} size={11} />}
        <Text style={[s.sourceTxt, { color }]}>{sourceDisplayLabel(source)}</Text>
        <Text style={s.sourceSep}>·</Text>
        <Text style={s.sourceTime}>synced {ago}</Text>
      </View>
      <TouchableOpacity
        style={[s.refreshBtn, (!canRefresh || refreshing) && s.refreshBtnDim]}
        onPress={onRefresh}
        disabled={!canRefresh || refreshing}
      >
        {refreshing
          ? <ActivityIndicator size="small" color={Colors.primary} />
          : <><RefreshCw color={canRefresh ? Colors.primary : Colors.textDisabled} size={13} /><Text style={[s.refreshTxt, !canRefresh && { color: Colors.textDisabled }]}>Refresh</Text></>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Rating trend chart ────────────────────────────────────────────────────────
function RatingChart({ points, color }: { points: Array<{ ts: string; r: number }>; color: string }) {
  if (points.length < 3) return null;
  const recent = points.slice(-40);
  const w = SW - 64;
  const h = 72;
  const ratings = recent.map(p => p.r);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 10;
  const xs = (i: number) => (i / (recent.length - 1)) * w;
  const ys = (r: number) => h - ((r - minR) / range) * (h - 8) - 4;
  const path = recent.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(p.r).toFixed(1)}`).join(' ');
  const first = recent[0];
  const last = recent[recent.length - 1];
  const trend = last.r - first.r;

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={s.chartLabel}>RATING TREND</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendingUp color={trend >= 0 ? Colors.success : Colors.error} size={12} />
          <Text style={[s.trendVal, { color: trend >= 0 ? Colors.success : Colors.error }]}>
            {trend >= 0 ? '+' : ''}{trend}
          </Text>
        </View>
      </View>
      <Svg width={w} height={h + 4}>
        <Path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={xs(recent.length - 1)} cy={ys(last.r)} r="3" fill={color} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={s.chartAxisLabel}>{first.ts.slice(0, 7)}</Text>
        <Text style={[s.chartAxisLabel, { color }]}>{last.r}</Text>
        <Text style={s.chartAxisLabel}>{last.ts.slice(0, 7)}</Text>
      </View>
    </View>
  );
}

// ── W/L/D bar ─────────────────────────────────────────────────────────────────
function WldSection({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws || 1;
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;
  return (
    <View style={s.wldWrap}>
      <Text style={s.chartLabel}>WIN / DRAW / LOSS</Text>
      <View style={s.wldBar}>
        <View style={[s.wldSeg, { width: `${wPct}%` as any, backgroundColor: Colors.success }]} />
        <View style={[s.wldSeg, { width: `${dPct}%` as any, backgroundColor: Colors.warning }]} />
        <View style={[s.wldSeg, { width: `${lPct}%` as any, backgroundColor: Colors.error }]} />
      </View>
      <View style={s.wldLegend}>
        {[
          { label: 'W', val: wins, color: Colors.success },
          { label: 'D', val: draws, color: Colors.warning },
          { label: 'L', val: losses, color: Colors.error },
          { label: 'Win%', val: `${((wins / total) * 100).toFixed(1)}%`, color: Colors.textPrimary },
        ].map(item => (
          <View key={item.label} style={s.wldLegendItem}>
            <Text style={[s.wldLegendLabel, { color: item.color }]}>{item.label}</Text>
            <Text style={[s.wldLegendVal, { color: item.color }]}>{item.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Recent game row ───────────────────────────────────────────────────────────
function GameRow({ game, last }: { game: any; last: boolean }) {
  const col = game.result === 'win' ? Colors.success : game.result === 'draw' ? Colors.warning : Colors.error;
  const lbl = game.result === 'win' ? 'W' : game.result === 'draw' ? 'D' : 'L';
  return (
    <View style={[s.gameRow, !last && s.gameBorder]}>
      <View style={[s.gameResult, { backgroundColor: `${col}18`, borderColor: `${col}40` }]}>
        <Text style={[s.gameResultTxt, { color: col }]}>{lbl}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.gameOpp} numberOfLines={1}>vs {game.opponent}{game.opponentRating ? ` (${game.opponentRating})` : ''}</Text>
        {game.opening && <Text style={s.gameOpening} numberOfLines={1}>{game.opening}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <View style={s.tcChip}>
          <Text style={s.tcChipTxt}>{(game.time_class ?? '').toUpperCase()}</Text>
        </View>
        {game.accuracy != null && (
          <Text style={[s.gameAccuracy, { color: game.accuracy >= 90 ? Colors.success : game.accuracy >= 75 ? Colors.primary : Colors.textMuted }]}>
            {game.accuracy}% acc
          </Text>
        )}
        {game.date && <Text style={s.gameDate}>{game.date.slice(0, 10)}</Text>}
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  stats: ChessStats;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ChessPerformanceCard({ stats, onRefresh, refreshing }: Props) {
  const variants = extractVariants(stats);
  const [activeVariant, setActiveVariant] = useState<string>(variants[0]?.key ?? 'blitz');
  const active = variants.find(v => v.key === activeVariant) ?? variants[0];
  const titleColor = stats.title ? (TITLE_COLORS[stats.title] ?? Colors.primary) : null;
  const canRefresh = isSyncStale(stats.last_synced_at, 3600000);
  const historyPoints = stats.rating_history?.[activeVariant] ?? [];
  const totalW = (stats.rapid_wins ?? 0) + (stats.blitz_wins ?? 0) + (stats.bullet_wins ?? 0) + (stats.classical_wins ?? 0);
  const totalL = (stats.rapid_losses ?? 0) + (stats.blitz_losses ?? 0) + (stats.bullet_losses ?? 0) + (stats.classical_losses ?? 0);
  const totalD = (stats.rapid_draws ?? 0) + (stats.blitz_draws ?? 0) + (stats.bullet_draws ?? 0) + (stats.classical_draws ?? 0);

  return (
    <View>
      {/* Source row */}
      <SourceRow
        source={stats.source}
        lastSyncedAt={stats.last_synced_at}
        onRefresh={onRefresh}
        refreshing={refreshing}
        canRefresh={canRefresh}
      />

      {/* Title + FIDE badge */}
      {(stats.title || stats.fide_rating) && (
        <View style={s.titleRow}>
          {stats.title && titleColor && (
            <View style={[s.titleBadge, { backgroundColor: `${titleColor}18`, borderColor: `${titleColor}50` }]}>
              <Text style={[s.titleTxt, { color: titleColor }]}>{stats.title}</Text>
            </View>
          )}
          {stats.fide_rating && (
            <View style={s.fideBadge}>
              <Text style={s.fideLbl}>FIDE</Text>
              <Text style={s.fideVal}>{stats.fide_rating.toLocaleString()}</Text>
            </View>
          )}
        </View>
      )}

      {/* Variant selector */}
      {variants.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.variantBar}>
          {variants.map(v => (
            <TouchableOpacity
              key={v.key}
              style={[s.variantTab, v.key === activeVariant && s.variantTabActive]}
              onPress={() => setActiveVariant(v.key)}
            >
              <Text style={[s.variantTabTxt, v.key === activeVariant && s.variantTabTxtActive]}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Current + peak rating */}
      {active && (
        <View style={s.ratingHero}>
          <LinearGradient
            colors={[`${Colors.primary}14`, `${Colors.primary}04`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.ratingHeroNum}>{active.current?.toLocaleString() ?? '—'}</Text>
            <Text style={s.ratingHeroLabel}>{active.label} Rating</Text>
          </View>
          {active.peak && (
            <View style={s.peakBox}>
              <Text style={s.peakNum}>{active.peak.toLocaleString()}</Text>
              <Text style={s.peakLabel}>Peak</Text>
            </View>
          )}
        </View>
      )}

      {/* Rating trend chart */}
      {historyPoints.length >= 3 && (
        <View style={s.chartWrap}>
          <RatingChart points={historyPoints} color={Colors.primary} />
        </View>
      )}

      {/* All-time W/L/D */}
      {(totalW + totalL + totalD) > 0 && (
        <View style={s.wldContainer}>
          <WldSection wins={totalW} losses={totalL} draws={totalD} />
        </View>
      )}

      {/* Per-variant W/L/D if different */}
      {active && (active.wins + active.losses + active.draws) > 0 && (
        <View style={s.variantWldRow}>
          {[
            { lbl: 'W', val: active.wins, col: Colors.success },
            { lbl: 'D', val: active.draws, col: Colors.warning },
            { lbl: 'L', val: active.losses, col: Colors.error },
          ].map(item => (
            <View key={item.lbl} style={s.variantWldCell}>
              <Text style={[s.variantWldVal, { color: item.col }]}>{item.val.toLocaleString()}</Text>
              <Text style={s.variantWldLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent games */}
      {Array.isArray(stats.recent_games) && stats.recent_games.length > 0 && (
        <View style={s.gamesSection}>
          <Text style={s.chartLabel}>RECENT GAMES</Text>
          {stats.recent_games.slice(0, 8).map((g, i) => (
            <GameRow key={i} game={g} last={i === Math.min(stats.recent_games.length, 8) - 1} />
          ))}
        </View>
      )}
    </View>
  );
}

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const s = StyleSheet.create({
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.full, borderWidth: 1, paddingHorizontal: Spacing.sm + 2, paddingVertical: 3 },
  sourceTxt: { fontFamily: Typography.family.mono, fontSize: 10 },
  sourceSep: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  sourceTime: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textDisabled },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: `${Colors.primary}30` },
  refreshBtnDim: { opacity: 0.5 },
  refreshTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.primary },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  titleBadge: { borderRadius: Radii.sm, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4 },
  titleTxt: { fontFamily: Typography.family.display, fontSize: 14, letterSpacing: 0.5 },
  fideBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.elevated, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  fideLbl: { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1 },
  fideVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.md, color: Colors.textPrimary },

  variantBar: { marginBottom: Spacing.md, flexGrow: 0 },
  variantTab: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radii.md, marginRight: Spacing.xs, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  variantTabActive: { backgroundColor: `${Colors.primary}18`, borderColor: `${Colors.primary}40` },
  variantTabTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  variantTabTxtActive: { fontFamily: Typography.family.bold, color: Colors.primary },

  ratingHero: { borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: `${Colors.primary}30`, flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, overflow: 'hidden', position: 'relative' },
  ratingHeroNum: { fontFamily: Typography.family.display, fontSize: 48, color: Colors.primary, lineHeight: 54 },
  ratingHeroLabel: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  peakBox: { alignItems: 'center', backgroundColor: `${Colors.accent}12`, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.accent}28` },
  peakNum: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl, color: Colors.accent },
  peakLabel: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, letterSpacing: 0.8 },

  chartWrap: { backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  chartLabel: { fontFamily: Typography.family.display, fontSize: 10, color: Colors.textDisabled, letterSpacing: 1.4, marginBottom: Spacing.xs },
  trendVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.sm },
  chartAxisLabel: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled },

  wldContainer: { backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  wldWrap: {},
  wldBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: Spacing.sm },
  wldSeg: { height: '100%' as any },
  wldLegend: { flexDirection: 'row', gap: Spacing.xl },
  wldLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wldLegendLabel: { fontFamily: Typography.family.mono, fontSize: 10 },
  wldLegendVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.sm },

  variantWldRow: { flexDirection: 'row', backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  variantWldCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRightWidth: 1, borderRightColor: Colors.border },
  variantWldVal: { fontFamily: Typography.family.monoBold, fontSize: Typography.size.xl },
  variantWldLbl: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, letterSpacing: 0.8 },

  gamesSection: { marginTop: Spacing.xs },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10 },
  gameBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  gameResult: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  gameResultTxt: { fontFamily: Typography.family.bold, fontSize: 11 },
  gameOpp: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  gameOpening: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 1 },
  tcChip: { backgroundColor: `${Colors.primary}15`, borderRadius: Radii.xs, paddingHorizontal: 5, paddingVertical: 2 },
  tcChipTxt: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.primary, letterSpacing: 0.5 },
  gameAccuracy: { fontFamily: Typography.family.mono, fontSize: 9 },
  gameDate: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Share,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  X,
  MapPin,
  DollarSign,
  Calendar,
  Trophy,
  BadgeCheck,
  Bookmark,
  Share2,
  Zap,
  Target,
  Users,
  Star,
  TrendingUp,
  Flame,
} from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import {
  Opportunity,
  formatSalary,
  deadlineLabel,
  oppTimeAgo,
  toggleOpportunitySave,
  APP_STATUS_LABELS,
  APP_STATUS_COLORS,
} from '@/lib/opportunitiesService';
import { useAuth } from '@/context/AuthContext';

interface Props {
  opportunity: Opportunity | null;
  onClose: () => void;
  onApply: (opp: Opportunity) => void;
  onSaveToggled: (oppId: string, nowSaved: boolean) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Trial:    Colors.warning,
  Contract: Colors.primary,
  Academy:  Colors.success,
  Loan:     Colors.accent,
  Tryout:   Colors.error,
};

const REASON_ICONS: Record<string, React.ElementType> = {
  'Position fit':   Target,
  'Location match': MapPin,
  'Level match':    Trophy,
  'Age range':      Users,
  'Sport match':    Star,
  'Profile complete': TrendingUp,
};

// ── Animated arc gauge for match score ───────────────────────────────────────
function MatchArc({ score }: { score: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setProgress(v));
    Animated.timing(anim, {
      toValue: score / 100,
      duration: 1300,
      delay: 200,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [score]);

  const size  = 96;
  const sw    = 9;
  const r     = (size - sw) / 2;
  const circ  = 2 * Math.PI * r;
  const filled = progress * circ;
  const c     = size / 2;
  const color = score >= 85 ? Colors.error : score >= 70 ? Colors.warning : Colors.accent;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={`${color}20`} strokeWidth={sw} fill="none" />
        <Circle cx={c} cy={c} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${c}, ${c})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={[ma.num, { color }]}>{score}</Text>
        <Text style={[ma.pct, { color }]}>%</Text>
      </View>
    </View>
  );
}

const ma = StyleSheet.create({
  num: { fontFamily: Typography.family.display, fontSize: Typography.size.xxl, lineHeight: 26 },
  pct: { fontFamily: Typography.family.bold, fontSize: 10, marginTop: -2 },
});

// ── Main component ────────────────────────────────────────────────────────────
export function OpportunityDetail({ opportunity, onClose, onApply, onSaveToggled }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Entry animation for the modal content
  const slideY = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!opportunity) return;
    slideY.setValue(40);
    fadeIn.setValue(0);
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [opportunity?.id]);

  if (!opportunity) return null;

  const salary     = formatSalary(opportunity);
  const deadline   = deadlineLabel(opportunity.deadline);
  const typeColor  = TYPE_COLORS[opportunity.type] ?? Colors.primary;
  const isExpiring = !!opportunity.deadline && (() => {
    const diff = Math.ceil((new Date(opportunity.deadline!).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 5;
  })();

  const handleSave = async () => {
    if (!user) return;
    const nowSaved = !opportunity.saved;
    await toggleOpportunitySave(opportunity.id, user.id, opportunity.saved ?? false);
    onSaveToggled(opportunity.id, nowSaved);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out this opportunity: ${opportunity.position} at ${opportunity.club}` });
    } catch (_) {}
  };

  const req      = opportunity.requirements ?? {};
  const hasScore = opportunity.match_score != null;
  const reasons  = opportunity.match_reasons ?? [];
  const scoreColor = !hasScore ? Colors.primary
    : opportunity.match_score! >= 85 ? Colors.error
    : opportunity.match_score! >= 70 ? Colors.warning
    : Colors.accent;

  return (
    <Modal visible={!!opportunity} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[s.root, { paddingTop: insets.top }]}>

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close opportunity details"
            onPress={onClose}
            style={s.backBtn}
            hitSlop={8}
          >
            <X color={Colors.textMuted} size={22} />
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>{opportunity.position}</Text>
          <View style={s.topActions}>
            <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
              <Share2 color={Colors.textMuted} size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={handleSave}>
              <Bookmark
                color={opportunity.saved ? Colors.accent : Colors.textMuted}
                fill={opportunity.saved ? Colors.accent : 'transparent'}
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          style={{ opacity: fadeIn, transform: [{ translateY: slideY }] }}
        >
          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <View style={s.hero}>
            <LinearGradient
              colors={[`${typeColor}28`, `${typeColor}08`, Colors.bg]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Top stripe */}
            <View style={[s.heroStripe, { backgroundColor: typeColor }]} />

            {/* Crest + info centered */}
            <View style={s.heroContent}>
              <LinearGradient
                colors={[`${typeColor}50`, `${typeColor}20`]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.heroCrest}
              >
                <Text style={s.heroCrestTxt}>
                  {opportunity.club_abbr ?? opportunity.club.slice(0, 3).toUpperCase()}
                </Text>
              </LinearGradient>

              <Text style={s.heroPosition}>{opportunity.position}</Text>
              <View style={s.heroClubRow}>
                <Text style={s.heroClub}>{opportunity.club}</Text>
                <BadgeCheck color={Colors.primary} size={15} />
              </View>

              <View style={s.heroBadgeRow}>
                <TypeChip type={opportunity.type} color={typeColor} />
                {hasScore && opportunity.match_score! >= 85 && (
                  <View style={s.hotBadge}>
                    <Flame color={Colors.error} size={11} />
                    <Text style={s.hotBadgeTxt}>Hot Match</Text>
                  </View>
                )}
                {isExpiring && (
                  <View style={s.urgentBadge}>
                    <Text style={s.urgentTxt}>Closing Soon</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Quick facts strip ─────────────────────────────────────────── */}
          <View style={s.factsStrip}>
            <FactPill icon={MapPin} label={opportunity.location} />
            {salary && <FactPill icon={DollarSign} label={salary} color={Colors.accent} />}
            <FactPill icon={Calendar} label={deadline} color={isExpiring ? Colors.warning : undefined} />
            {opportunity.level && <FactPill icon={Trophy} label={opportunity.level} />}
          </View>

          {/* ── Application status banner ─────────────────────────────────── */}
          {opportunity.applied && opportunity.application_status && (
            <View style={[s.statusBanner, {
              borderColor: `${APP_STATUS_COLORS[opportunity.application_status]}50`,
              backgroundColor: `${APP_STATUS_COLORS[opportunity.application_status]}10`,
            }]}>
              <View style={[s.statusDot, { backgroundColor: APP_STATUS_COLORS[opportunity.application_status] }]} />
              <Text style={s.statusTxt}>
                Status:{' '}
                <Text style={{ color: APP_STATUS_COLORS[opportunity.application_status], fontFamily: Typography.family.bold }}>
                  {APP_STATUS_LABELS[opportunity.application_status]}
                </Text>
              </Text>
            </View>
          )}

          {/* ── Match score ───────────────────────────────────────────────── */}
          {hasScore && (
            <Section title="Why You Match" color={scoreColor}>
              <View style={s.matchRow}>
                <View style={s.matchLeft}>
                  <MatchArc score={opportunity.match_score!} />
                  <Text style={[s.matchLabel, { color: scoreColor }]}>Profile Match</Text>
                </View>
                <View style={s.reasonsCol}>
                  {(reasons.length ? reasons : ['Position fit', 'Level match', 'Sport match']).map((r, i) => {
                    const Icon = REASON_ICONS[r] ?? Zap;
                    return (
                      <View key={i} style={s.reasonRow}>
                        <View style={[s.reasonIconWrap, { backgroundColor: `${scoreColor}15` }]}>
                          <Icon color={scoreColor} size={12} />
                        </View>
                        <Text style={s.reasonTxt}>{r}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Section>
          )}

          {/* ── Description ───────────────────────────────────────────────── */}
          {opportunity.description && (
            <Section title="About the Opportunity" color={typeColor}>
              <Text style={s.descTxt}>{opportunity.description}</Text>
            </Section>
          )}

          {/* ── Requirements ──────────────────────────────────────────────── */}
          {Object.keys(req).length > 0 && (
            <Section title="Requirements" color={typeColor}>
              <View style={s.reqGrid}>
                {req.age_min != null && req.age_max != null && (
                  <ReqItem label="Age" value={`${req.age_min}–${req.age_max} yrs`} color={typeColor} />
                )}
                {req.positions?.length && (
                  <ReqItem label="Positions" value={(req.positions as string[]).join(', ')} color={typeColor} />
                )}
                {req.nationality && (
                  <ReqItem label="Nationality" value={req.nationality as string} color={typeColor} />
                )}
                {req.attributes?.length && (
                  <ReqItem label="Key Attributes" value={(req.attributes as string[]).join(', ')} color={typeColor} />
                )}
              </View>
            </Section>
          )}

          <View style={s.postedRow}>
            <Text style={s.postedTxt}>Posted {oppTimeAgo(opportunity.created_at)}</Text>
          </View>
        </Animated.ScrollView>

        {/* ── Apply CTA ────────────────────────────────────────────────────── */}
        <View style={[s.cta, { paddingBottom: insets.bottom + Spacing.md }]}>
          {opportunity.applied ? (
            <View style={s.appliedBanner}>
              <BadgeCheck color={Colors.success} size={18} />
              <Text style={s.appliedBannerTxt}>
                Application submitted · {APP_STATUS_LABELS[opportunity.application_status ?? 'applied']}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={s.applyBtn} onPress={() => onApply(opportunity)} activeOpacity={0.88}>
              <LinearGradient
                colors={[Colors.accent, '#A8D430']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Zap color={Colors.black} size={18} fill={Colors.black} />
              <Text style={s.applyBtnTxt}>Apply / Express Interest</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <View style={sec.titleRow}>
        <View style={[sec.bar, { backgroundColor: color ?? Colors.primary }]} />
        <Text style={sec.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FactPill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color?: string }) {
  const c = color ?? Colors.textMuted;
  return (
    <View style={[fp.wrap, color && { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
      <Icon color={c} size={12} />
      <Text style={[fp.txt, { color: c }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function TypeChip({ type, color }: { type: string; color: string }) {
  return (
    <View style={[tch.wrap, { borderColor: `${color}60`, backgroundColor: `${color}15` }]}>
      <Text style={[tch.txt, { color }]}>{type}</Text>
    </View>
  );
}

function ReqItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={ri.wrap}>
      <View style={[ri.labelWrap, { borderLeftColor: color }]}>
        <Text style={ri.label}>{label}</Text>
      </View>
      <Text style={ri.value}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  topBar:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:    { padding: Spacing.xs },
  topTitle:   { flex: 1, fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  topActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn:    { padding: Spacing.sm, backgroundColor: Colors.elevated, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border },

  // Hero
  hero:        { paddingBottom: Spacing.xl, overflow: 'hidden' },
  heroStripe:  { height: 3 },
  heroContent: { alignItems: 'center', paddingTop: Spacing.xl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  heroCrest:   { width: 80, height: 80, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  heroCrestTxt:{ fontFamily: Typography.family.display, fontSize: Typography.size.lg, color: Colors.white, textAlign: 'center', letterSpacing: 1 },
  heroPosition:{ fontFamily: Typography.family.display, fontSize: Typography.size.xxl, color: Colors.textPrimary, textAlign: 'center' },
  heroClubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  heroClub:    { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textMuted },
  heroBadgeRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.xs },
  hotBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full, backgroundColor: `${Colors.error}18`, borderWidth: 1, borderColor: `${Colors.error}55` },
  hotBadgeTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.error },
  urgentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full, backgroundColor: `${Colors.warning}18`, borderWidth: 1, borderColor: `${Colors.warning}55` },
  urgentTxt:   { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.warning },

  // Facts strip
  factsStrip:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },

  // Status banner
  statusBanner:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusTxt:   { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },

  // Match score
  matchRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  matchLeft:     { alignItems: 'center', gap: Spacing.xs },
  matchLabel:    { fontFamily: Typography.family.bold, fontSize: 10, letterSpacing: 0.5 },
  reasonsCol:    { flex: 1, gap: Spacing.sm },
  reasonRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reasonIconWrap:{ width: 24, height: 24, borderRadius: Radii.xs, alignItems: 'center', justifyContent: 'center' },
  reasonTxt:     { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },

  descTxt:     { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 21 },
  reqGrid:     { gap: Spacing.sm },
  postedRow:   { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  postedTxt:   { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },

  cta:           { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border },
  applyBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radii.lg, paddingVertical: 15, overflow: 'hidden' },
  applyBtnTxt:   { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.black },
  appliedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: `${Colors.success}15`, borderRadius: Radii.lg, paddingVertical: Spacing.md, borderWidth: 1, borderColor: `${Colors.success}40` },
  appliedBannerTxt:{ fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.success },
});

const sec = StyleSheet.create({
  wrap:     { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bar:      { width: 3, height: 14, borderRadius: 2 },
  title:    { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
});

const fp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.elevated, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  txt:  { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, maxWidth: 130 },
});

const tch = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full, borderWidth: 1 },
  txt:  { fontFamily: Typography.family.bold, fontSize: Typography.size.xs },
});

const ri = StyleSheet.create({
  wrap:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.elevated, borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  labelWrap:{ paddingLeft: 8, borderLeftWidth: 2 },
  label:    { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  value:    { fontFamily: Typography.family.bold,   fontSize: Typography.size.sm, color: Colors.textPrimary },
});

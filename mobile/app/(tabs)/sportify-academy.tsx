import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck,
  Calendar,
  MapPin,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  FlaskConical,
  Dumbbell,
  Brain,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { SportifySection } from '@/components/sportify/SportifySection';
import { AppointmentBookingSheet } from '@/components/sportify/AppointmentBookingSheet';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import {
  fetchSportifyResults,
  fetchAppointments,
  fetchConsent,
  cancelAppointment,
  SportifyResult,
  Appointment,
  SportifyConsent,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  formatAppointmentDate,
  AppointmentStatus,
} from '@/lib/sportifyService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SportifyAcademyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [results, setResults] = useState<SportifyResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consent, setConsent] = useState<SportifyConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [tab, setTab] = useState<'results' | 'appointments'>('results');

  const load = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true);
    const [r, a, c] = await Promise.all([
      fetchSportifyResults(user.id),
      fetchAppointments(user.id),
      fetchConsent(user.id),
    ]);
    setResults(r);
    setAppointments(a);
    setConsent(c);
    if (showRefresh) setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user]);

  // Realtime appointment status updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`appointments:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `athlete_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, load]);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    await load();
    setSyncing(false);
  };

  const handleCancelAppointment = async (id: string) => {
    await cancelAppointment(id);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' as AppointmentStatus } : a));
  };

  const consentActive = consent?.granted_at && !consent.revoked_at;

  const upcomingAppointments = appointments.filter((a) => a.status === 'requested' || a.status === 'confirmed');
  const pastAppointments = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AppHeader title="Sportify Academy" />

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxxl }} />
      ) : !consentActive ? (
        <NoConsentState onGoSettings={() => router.push('/(tabs)/settings' as any)} />
      ) : (
        <>
          {/* Hero */}
          <LinearGradient
            colors={[Colors.surface, Colors.bg]}
            style={s.hero}
          >
            <View style={s.heroBadge}>
              <BadgeCheck color={Colors.primary} size={14} />
              <Text style={s.heroBadgeTxt}>Verified Partner</Text>
            </View>
            <Text style={s.heroTitle}>Sportify Academy</Text>
            <Text style={s.heroSub}>
              {results.length} test session{results.length !== 1 ? 's' : ''} · {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length !== 1 ? 's' : ''}
            </Text>
            <View style={s.heroActions}>
              <TouchableOpacity style={s.syncBtn} onPress={handleSync} disabled={syncing}>
                <RefreshCw color={syncing ? Colors.textDisabled : Colors.primary} size={14} />
                <Text style={[s.syncTxt, syncing && { color: Colors.textDisabled }]}>
                  {syncing ? 'Syncing…' : 'Sync Results'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.bookBtn} onPress={() => setBookingVisible(true)}>
                <Plus color={Colors.black} size={14} />
                <Text style={s.bookTxt}>Book Visit</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(['results', 'appointments'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.tabBtn, tab === t && s.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                {t === 'results' ? (
                  <FlaskConical color={tab === t ? Colors.primary : Colors.textMuted} size={14} />
                ) : (
                  <Calendar color={tab === t ? Colors.primary : Colors.textMuted} size={14} />
                )}
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                  {t === 'results' ? 'Test Results' : 'Appointments'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
          >
            {tab === 'results' ? (
              results.length === 0 ? (
                <EmptyResults onSync={handleSync} syncing={syncing} />
              ) : (
                <>
                  {results.some((r) => r.test_type === 'talent') && (
                    <TalentProfileEntry onPress={() => router.push('/(tabs)/sportify-talent' as any)} />
                  )}
                  <SportifySection results={results} onSync={handleSync} syncing={syncing} />
                </>
              )
            ) : (
              <AppointmentsTab
                upcoming={upcomingAppointments}
                past={pastAppointments}
                onCancel={handleCancelAppointment}
                onBook={() => setBookingVisible(true)}
              />
            )}
          </ScrollView>
        </>
      )}

      <AppointmentBookingSheet
        visible={bookingVisible}
        onClose={() => setBookingVisible(false)}
        onBooked={() => {
          setBookingVisible(false);
          load();
          setTab('appointments');
        }}
      />
    </View>
  );
}

function AppointmentsTab({
  upcoming,
  past,
  onCancel,
  onBook,
}: {
  upcoming: Appointment[];
  past: Appointment[];
  onCancel: (id: string) => void;
  onBook: () => void;
}) {
  return (
    <View style={at.wrap}>
      <View style={at.section}>
        <View style={at.sectionHeader}>
          <Text style={at.sectionTitle}>Upcoming</Text>
          <TouchableOpacity style={at.addBtn} onPress={onBook}>
            <Plus color={Colors.primary} size={14} />
            <Text style={at.addTxt}>Book Visit</Text>
          </TouchableOpacity>
        </View>
        {upcoming.length === 0 ? (
          <View style={at.emptyRow}>
            <Text style={at.emptyTxt}>No upcoming appointments.</Text>
            <TouchableOpacity onPress={onBook}>
              <Text style={at.emptyLink}>Book one now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcoming.map((a) => <AppointmentCard key={a.id} appt={a} onCancel={onCancel} />)
        )}
      </View>

      {past.length > 0 && (
        <View style={at.section}>
          <Text style={at.sectionTitle}>Past</Text>
          {past.map((a) => <AppointmentCard key={a.id} appt={a} />)}
        </View>
      )}
    </View>
  );
}

function AppointmentCard({ appt, onCancel }: { appt: Appointment; onCancel?: (id: string) => void }) {
  const statusColor = APPOINTMENT_STATUS_COLORS[appt.status];
  const canCancel = appt.status === 'requested' || appt.status === 'confirmed';
  return (
    <View style={ac.card}>
      <View style={ac.topRow}>
        <View style={[ac.statusPill, { borderColor: statusColor + '60', backgroundColor: statusColor + '18' }]}>
          <Text style={[ac.statusTxt, { color: statusColor }]}>{APPOINTMENT_STATUS_LABELS[appt.status]}</Text>
        </View>
        <Text style={ac.createdAt}>{formatAppointmentDate(appt.created_at)}</Text>
      </View>
      <Text style={ac.testType}>{appt.test_type}</Text>
      <View style={ac.metaRow}>
        <MapPin color={Colors.textDisabled} size={12} />
        <Text style={ac.metaTxt} numberOfLines={1}>{appt.academy_location}</Text>
      </View>
      {appt.scheduled_at && (
        <View style={ac.metaRow}>
          <Calendar color={Colors.primary} size={12} />
          <Text style={[ac.metaTxt, { color: Colors.primary }]}>
            Scheduled: {formatAppointmentDate(appt.scheduled_at)}
          </Text>
        </View>
      )}
      {appt.preferred_times.length > 0 && !appt.scheduled_at && (
        <View style={ac.metaRow}>
          <Clock color={Colors.textDisabled} size={12} />
          <Text style={ac.metaTxt} numberOfLines={1}>
            Preferred: {appt.preferred_times.slice(0, 2).join(', ')}
          </Text>
        </View>
      )}
      {appt.notes && (
        <Text style={ac.notes} numberOfLines={2}>{appt.notes}</Text>
      )}
      {canCancel && onCancel && (
        <TouchableOpacity style={ac.cancelBtn} onPress={() => onCancel(appt.id)}>
          <XCircle color={Colors.error} size={13} />
          <Text style={ac.cancelTxt}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyResults({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <View style={er.wrap}>
      <Dumbbell color={Colors.textFaint} size={44} strokeWidth={1.5} />
      <Text style={er.title}>No test results yet</Text>
      <Text style={er.sub}>
        Sync your Sportify Academy account to import your verified physical test results and talent assessment.
      </Text>
      <TouchableOpacity style={er.syncBtn} onPress={onSync} disabled={syncing}>
        {syncing ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <RefreshCw color={Colors.white} size={14} />
            <Text style={er.syncTxt}>Sync Now</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function NoConsentState({ onGoSettings }: { onGoSettings: () => void }) {
  return (
    <View style={nc.wrap}>
      <BadgeCheck color={Colors.textFaint} size={48} strokeWidth={1.5} />
      <Text style={nc.title}>Link Sportify Academy</Text>
      <Text style={nc.sub}>
        Connect your Sportify Academy account in Settings to import verified test results and talent assessments.
      </Text>
      <TouchableOpacity style={nc.btn} onPress={onGoSettings}>
        <Text style={nc.btnTxt}>Go to Settings</Text>
        <ChevronRight color={Colors.black} size={14} />
      </TouchableOpacity>
    </View>
  );
}

function TalentProfileEntry({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={tp.card} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={[`${Colors.accent}14`, `${Colors.primary}0A`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tp.gradient}
      >
        <View style={tp.left}>
          <View style={tp.iconWrap}>
            <Brain color={Colors.accent} size={22} />
          </View>
          <View style={tp.textWrap}>
            <View style={tp.titleRow}>
              <Text style={tp.title}>Talent Profile</Text>
              <View style={tp.newBadge}>
                <Star color={Colors.accent} size={9} fill={Colors.accent} />
                <Text style={tp.newTxt}>Full Report</Text>
              </View>
            </View>
            <Text style={tp.sub}>Sport fit rankings, athleticism breakdown & physical foundation</Text>
          </View>
        </View>
        <ChevronRight color={Colors.accent} size={18} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const tp = StyleSheet.create({
  card: { borderRadius: Radii.lg, borderWidth: 1, borderColor: `${Colors.accent}30`, overflow: 'hidden', marginBottom: Spacing.lg },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.accent}40` },
  textWrap: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  newBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accentDim, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: `${Colors.accent}40` },
  newTxt: { fontFamily: Typography.family.bold, fontSize: 9, color: Colors.accent },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, lineHeight: 16 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, gap: Spacing.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.primary}40` },
  heroBadgeTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  heroTitle: { fontFamily: Typography.family.display, fontSize: Typography.size.xxl, color: Colors.textPrimary },
  heroSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted },
  heroActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: `${Colors.primary}40` },
  syncTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  bookTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.black },

  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  tabTxtActive: { fontFamily: Typography.family.bold, color: Colors.primary },

  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
});

const at = StyleSheet.create({
  wrap: { gap: Spacing.xl },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: `${Colors.primary}40` },
  addTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.primary },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  emptyTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled },
  emptyLink: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.primary },
});

const ac = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: Radii.full, borderWidth: 1 },
  statusTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs },
  createdAt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  testType: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, flex: 1 },
  notes: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, fontStyle: 'italic' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', marginTop: Spacing.xs },
  cancelTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.error },
});

const er = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radii.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  syncTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
});

const nc = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.lg },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textMuted },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, borderRadius: Radii.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  btnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.black },
});

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Activity, AlertCircle, CheckCircle2, Clock, FileText, BadgeCheck } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { PartnerConsentsModal } from '@/components/medical/PartnerConsentsModal';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Medical() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<Array<{ id: string; date: string; type: string; status: string; notes: string }>>([]);
  const [clearance, setClearance] = useState<{ status: string; effective_to: string | null; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [partnersModalVisible, setPartnersModalVisible] = useState(false);

  useEffect(() => {
    if (!profile?.athlete_profile_id) return;
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      supabase.from('medical_clearances').select('status,effective_to,created_at').eq('athlete_id', profile.athlete_profile_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('medical_records').select('id,record_type,title,summary,issued_at,is_verified').eq('athlete_id', profile.athlete_profile_id).eq('is_deleted', false).order('issued_at', { ascending: false }),
    ]).then(([clearanceResult, recordsResult]) => {
      if (!mounted) return;
      if (clearanceResult.error || recordsResult.error) {
        setLoadError(true);
        return;
      }
      setClearance(clearanceResult.data as any ?? null);
      setRecords((recordsResult.data ?? []).map((row: any) => ({
        id: row.id,
        date: row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '',
        type: row.title ?? row.record_type,
        status: row.is_verified ? 'Verified' : 'Pending',
        notes: row.summary ?? 'No summary provided.',
      })));
    }).catch(() => {
      if (mounted) setLoadError(true);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [profile?.athlete_profile_id]);

  const CLEARANCE_META: Record<string, { label: string; color: string; subtitle: string }> = {
    cleared: { label: 'Cleared', color: Colors.success, subtitle: 'Medically verified athlete' },
    restricted: { label: 'Restricted', color: Colors.warning, subtitle: 'Cleared with restrictions — see notes' },
    not_cleared: { label: 'Not Cleared', color: Colors.error, subtitle: 'Not currently cleared to participate' },
    pending: { label: 'Pending', color: Colors.warning, subtitle: 'Awaiting partner-issued clearance' },
  };
  const NO_CLEARANCE_META = { label: 'No active clearance', color: Colors.warning, subtitle: 'No active clearance' };
  const clearanceMeta = clearance ? (CLEARANCE_META[clearance.status] ?? NO_CLEARANCE_META) : NO_CLEARANCE_META;

  const expiryInfo = (() => {
    if (!clearance?.effective_to) {
      return { text: 'No expiry set', color: Colors.textMuted };
    }
    const daysRemaining = Math.ceil(
      (new Date(clearance.effective_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysRemaining < 0) return { text: 'Expired', color: Colors.error };
    if (daysRemaining <= 30) return { text: `${daysRemaining}d left`, color: Colors.warning };
    return { text: `${daysRemaining}d left`, color: Colors.success };
  })();

  const verifiedCount = records.filter((r) => r.status === 'Verified').length;
  const recordsVerifiedInfo = {
    text: `${verifiedCount} of ${records.length}`,
    color: records.length === 0
      ? Colors.textMuted
      : verifiedCount === records.length
        ? Colors.success
        : Colors.warning,
  };

  return (
    <View style={s.root}>
      <AppHeader title="Medical" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.card, s.clearanceCard]}>
          <View style={s.clearanceRow}>
            <Shield color={clearanceMeta.color} size={32} />
            <View>
              {loading ? (
                <Text style={s.clearanceSub}>Loading medical data...</Text>
              ) : loadError ? (
                <Text style={s.clearanceSub}>Couldn’t load medical data — pull to refresh or try again.</Text>
              ) : (
                <>
                  <Text style={[s.clearanceStatus, { color: clearanceMeta.color }]}>
                    {clearanceMeta.label}
                  </Text>
                  <Text style={s.clearanceSub}>{clearanceMeta.subtitle}</Text>
                </>
              )}
            </View>
            <BadgeCheck color={clearanceMeta.color} size={22} />
          </View>
          <View style={s.clearanceMeta}>
            <Clock color={Colors.textDisabled} size={12} />
            <Text style={s.clearanceDate}>
              {clearance ? `Last updated: ${new Date(clearance.created_at).toLocaleDateString()}${clearance.effective_to ? ` · Expires: ${clearance.effective_to}` : ''}` : 'No medical clearance on file'}
            </Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Readiness Summary</Text>
          <Text style={s.aiSummary}>
            Readiness status is based on partner-issued medical clearance records.
          </Text>
          <View style={s.riskGrid}>
            <View style={s.riskItem}>
              <Text style={[s.riskLevel, { color: expiryInfo.color }]}>{expiryInfo.text}</Text>
              <Text style={s.riskLabel}>Clearance Expiry</Text>
            </View>
            <View style={s.riskItem}>
              <Text style={[s.riskLevel, { color: recordsVerifiedInfo.color }]}>{recordsVerifiedInfo.text}</Text>
              <Text style={s.riskLabel}>Records Verified</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Medical Records</Text>
          {records.map((rec, i) => {
            const recColor = rec.status === 'Verified' ? Colors.success : Colors.warning;
            return (
              <View key={rec.id} style={[s.recordRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
                <View style={s.recordLeft}>
                  {rec.status === 'Verified' ? (
                    <CheckCircle2 color={recColor} size={16} />
                  ) : (
                    <Clock color={recColor} size={16} />
                  )}
                  <View>
                    <Text style={s.recordType}>{rec.type}</Text>
                    <Text style={s.recordDate}>{rec.date}</Text>
                    <Text style={s.recordNotes}>{rec.notes}</Text>
                  </View>
                </View>
                <View style={[s.recordStatus, { backgroundColor: `${recColor}20`, borderColor: `${recColor}35` }]}>
                  <Text style={[s.recordStatusTxt, { color: recColor }]}>{rec.status}</Text>
                </View>
              </View>
            );
          })}
          {loading ? (
            <Text style={s.aiSummary}>Loading medical records...</Text>
          ) : loadError ? (
            <Text style={s.aiSummary}>Couldn’t load medical records — pull to refresh or try again.</Text>
          ) : records.length === 0 ? (
            <Text style={s.aiSummary}>No medical records have been issued yet.</Text>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="View connected medical partners"
          style={s.uploadBtn}
          onPress={() => setPartnersModalVisible(true)}
        >
          <FileText color={Colors.primary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={s.uploadTxt}>Partner-issued records</Text>
            <Text style={s.recordDate}>Verified medical partners add and manage records securely.</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
      <PartnerConsentsModal
        visible={partnersModalVisible}
        athleteId={profile?.athlete_profile_id}
        onClose={() => setPartnersModalVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  clearanceCard: { borderColor: `${Colors.success}40`, backgroundColor: `${Colors.success}08` },
  clearanceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  clearanceStatus: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.success },
  clearanceSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  clearanceMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clearanceDate: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  cardTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  aiSummary: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.lg },
  riskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  riskItem: { flex: 1, minWidth: '44%', backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  riskLevel: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg },
  riskLabel: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  recordRow: { paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordLeft: { flexDirection: 'row', gap: Spacing.md, flex: 1 },
  recordType: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  recordDate: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2 },
  recordNotes: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginTop: 3, maxWidth: 220 },
  recordStatus: { borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  recordStatusTxt: { fontFamily: Typography.family.bold, fontSize: 10 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, borderRadius: Radii.lg, paddingVertical: Spacing.md + 2, borderWidth: 2, borderColor: `${Colors.primary}40`, borderStyle: 'dashed' as any },
  uploadTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.primary },
});

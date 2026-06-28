import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Activity, AlertCircle, CheckCircle2, Clock, FileText, BadgeCheck } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Medical() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<Array<{ date: string; type: string; status: string; notes: string }>>([]);
  const [clearance, setClearance] = useState<{ status: string; effective_to: string | null; created_at: string } | null>(null);

  useEffect(() => {
    if (!profile?.athlete_profile_id) return;
    Promise.all([
      supabase.from('medical_clearances').select('status,effective_to,created_at').eq('athlete_id', profile.athlete_profile_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('medical_records').select('record_type,title,summary,issued_at,is_verified').eq('athlete_id', profile.athlete_profile_id).order('issued_at', { ascending: false }),
    ]).then(([clearanceResult, recordsResult]) => {
      setClearance(clearanceResult.data as any ?? null);
      setRecords((recordsResult.data ?? []).map((row: any) => ({
        date: row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '',
        type: row.title ?? row.record_type,
        status: row.is_verified ? 'Verified' : 'Pending',
        notes: row.summary ?? 'No summary provided.',
      })));
    });
  }, [profile?.athlete_profile_id]);

  const isCleared = clearance?.status === 'cleared';

  return (
    <View style={s.root}>
      <AppHeader title="Medical" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.card, s.clearanceCard]}>
          <View style={s.clearanceRow}>
            <Shield color={isCleared ? Colors.success : Colors.warning} size={32} />
            <View>
              <Text style={[s.clearanceStatus, { color: isCleared ? Colors.success : Colors.warning }]}>
                {clearance ? clearance.status.replace('_', ' ') : 'No active clearance'}
              </Text>
              <Text style={s.clearanceSub}>{isCleared ? 'Medically verified athlete' : 'Awaiting partner-issued clearance'}</Text>
            </View>
            <BadgeCheck color={isCleared ? Colors.success : Colors.warning} size={22} />
          </View>
          <View style={s.clearanceMeta}>
            <Clock color={Colors.textDisabled} size={12} />
            <Text style={s.clearanceDate}>
              {clearance ? `Last updated: ${new Date(clearance.created_at).toLocaleDateString()}${clearance.effective_to ? ` · Expires: ${clearance.effective_to}` : ''}` : 'No medical clearance on file'}
            </Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>AI Risk Summary</Text>
          <Text style={s.aiSummary}>
            Medical intelligence uses partner-issued records. Add verified medical data to unlock risk and readiness analysis.
          </Text>
          <View style={s.riskGrid}>
            <View style={s.riskItem}>
              <Text style={[s.riskLevel, { color: isCleared ? Colors.success : Colors.warning }]}>{clearance?.status ?? 'Pending'}</Text>
              <Text style={s.riskLabel}>Clearance Status</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Medical Records</Text>
          {records.map((rec, i) => (
            <View key={rec.date} style={[s.recordRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View style={s.recordLeft}>
                <CheckCircle2 color={Colors.success} size={16} />
                <View>
                  <Text style={s.recordType}>{rec.type}</Text>
                  <Text style={s.recordDate}>{rec.date}</Text>
                  <Text style={s.recordNotes}>{rec.notes}</Text>
                </View>
              </View>
              <View style={s.recordStatus}>
                <Text style={s.recordStatusTxt}>{rec.status}</Text>
              </View>
            </View>
          ))}
          {records.length === 0 && <Text style={s.aiSummary}>No medical records have been issued yet.</Text>}
        </View>

        <TouchableOpacity style={[s.uploadBtn, { opacity: 0.65 }]} disabled>
          <FileText color={Colors.primary} size={18} />
          <Text style={s.uploadTxt}>Partner-issued records only</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  recordStatus: { backgroundColor: `${Colors.success}20`, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: `${Colors.success}35` },
  recordStatusTxt: { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.success },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, borderRadius: Radii.lg, paddingVertical: Spacing.md + 2, borderWidth: 2, borderColor: `${Colors.primary}40`, borderStyle: 'dashed' as any },
  uploadTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.primary },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { MetricDef, SportConfig } from '@/constants/sportsConfig';
import { upsertRecord } from '@/lib/performanceService';

interface Props {
  config: SportConfig;
  athlete_id: string;
  onSaved: () => void;
}

export function SelfReportForm({ config, athlete_id, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: string) => setValues(prev => ({ ...prev, [key]: val }));

  async function handleSave() {
    setSaving(true);
    setError(null);
    const stats: Record<string, any> = {};
    for (const m of config.metrics) {
      const raw = values[m.key];
      if (!raw || raw.trim() === '') continue;
      if (m.type === 'number' || m.type === 'rating' || m.type === 'percent') {
        const n = parseFloat(raw);
        if (!isNaN(n)) stats[m.key] = n;
      } else {
        stats[m.key] = raw.trim();
      }
    }
    const { error: err } = await upsertRecord(athlete_id, config.sport, stats, 'self_reported', season);
    if (err) {
      setError(err);
    } else {
      onSaved();
    }
    setSaving(false);
  }

  return (
    <View style={s.wrap}>
      <Text style={s.heading}>Enter Your Stats</Text>
      {config.syncNote && (
        <Text style={s.note}>{config.syncNote}</Text>
      )}

      <View style={s.field}>
        <Text style={s.label}>Season / Period</Text>
        <TextInput
          style={s.input}
          value={season}
          onChangeText={setSeason}
          placeholder="e.g. 2024/25"
          placeholderTextColor={Colors.textDisabled}
        />
      </View>

      {config.metrics.map(m => (
        <View key={m.key} style={s.field}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Text style={s.label}>{m.label}</Text>
            {m.unit ? <Text style={s.unit}>{m.unit}</Text> : null}
            <Text style={s.typeHint}>{m.type === 'time' ? 'mm:ss.ss or ss.ss' : m.type}</Text>
          </View>
          <TextInput
            style={s.input}
            value={values[m.key] ?? ''}
            onChangeText={v => set(m.key, v)}
            keyboardType={m.type === 'number' || m.type === 'rating' || m.type === 'percent' ? 'decimal-pad' : 'default'}
            placeholder={metricPlaceholder(m)}
            placeholderTextColor={Colors.textDisabled}
          />
        </View>
      ))}

      {error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color={Colors.bg} />
        ) : (
          <Text style={s.saveBtnTxt}>Save Stats</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function metricPlaceholder(m: MetricDef): string {
  if (m.type === 'time') return '23.14 or 1:52.44';
  if (m.type === 'percent') return '0–100';
  if (m.type === 'rating') return 'e.g. 2100';
  if (m.type === 'text') return `Your ${m.label.toLowerCase()}`;
  return '0';
}

const s = StyleSheet.create({
  wrap: { gap: 0 },
  heading: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  note: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, lineHeight: 18, marginBottom: Spacing.md, backgroundColor: `${Colors.primary}10`, borderRadius: Radii.sm, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  field: { marginBottom: Spacing.md },
  label: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  unit: { fontFamily: Typography.family.mono, fontSize: 10, color: Colors.primary, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.xs, paddingHorizontal: 5, paddingVertical: 1 },
  typeHint: { fontFamily: Typography.family.mono, fontSize: 9, color: Colors.textDisabled, marginLeft: 'auto' as any },
  input: { backgroundColor: Colors.elevated, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: 2 },
  error: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.error, marginBottom: Spacing.sm },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.white },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, ChevronDown } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { OpportunityFilters, OPP_SPORTS, OPP_TYPES, OpportunityType } from '@/lib/opportunitiesService';

interface Props {
  visible: boolean;
  filters: OpportunityFilters;
  onApply: (f: OpportunityFilters) => void;
  onClose: () => void;
}

export function FilterSheet({ visible, filters, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState<OpportunityFilters>(filters);

  const set = (k: keyof OpportunityFilters, v: any) =>
    setLocal((prev) => ({ ...prev, [k]: v }));

  const toggle = (k: 'sport' | 'type', v: string) =>
    setLocal((prev) => ({ ...prev, [k]: prev[k] === v ? undefined : (v as any) }));

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleClear = () => {
    setLocal({});
    onApply({});
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.sheet, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Filter Opportunities</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
            {/* Search */}
            <Section label="Search">
              <View style={s.searchRow}>
                <Search color={Colors.textDisabled} size={16} />
                <TextInput
                  style={s.searchInput}
                  value={local.search ?? ''}
                  onChangeText={(v) => set('search', v || undefined)}
                  placeholder="Club, position, keyword…"
                  placeholderTextColor={Colors.textDisabled}
                />
              </View>
            </Section>

            {/* Sport */}
            <Section label="Sport">
              <View style={s.chips}>
                {OPP_SPORTS.map((sp) => (
                  <Chip
                    key={sp}
                    label={sp}
                    active={local.sport === sp}
                    onPress={() => toggle('sport', sp)}
                  />
                ))}
              </View>
            </Section>

            {/* Type */}
            <Section label="Opportunity Type">
              <View style={s.chips}>
                {OPP_TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    active={local.type === t}
                    onPress={() => toggle('type', t)}
                  />
                ))}
              </View>
            </Section>

            {/* Location */}
            <Section label="Location">
              <TextInput
                style={s.textField}
                value={local.location ?? ''}
                onChangeText={(v) => set('location', v || undefined)}
                placeholder="City, country, region…"
                placeholderTextColor={Colors.textDisabled}
              />
            </Section>

            {/* Salary */}
            <Section label="Salary Range (annual)">
              <View style={s.salaryRow}>
                <TextInput
                  style={[s.textField, { flex: 1 }]}
                  value={local.salary_min != null ? String(local.salary_min) : ''}
                  onChangeText={(v) => set('salary_min', v ? Number(v) : undefined)}
                  placeholder="Min"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="numeric"
                />
                <Text style={s.salaryDash}>–</Text>
                <TextInput
                  style={[s.textField, { flex: 1 }]}
                  value={local.salary_max != null ? String(local.salary_max) : ''}
                  onChangeText={(v) => set('salary_max', v ? Number(v) : undefined)}
                  placeholder="Max"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="numeric"
                />
              </View>
            </Section>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
              <Text style={s.clearTxt}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
              <Text style={s.applyTxt}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '85%',
    paddingTop: Spacing.sm,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  body: { padding: Spacing.xl, gap: Spacing.xl },

  section: { gap: Spacing.sm },
  sectionLabel: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.sm, color: Colors.textMuted },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchInput: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  chipTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
  chipTxtActive: { color: Colors.primary },

  textField: { backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary },

  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  salaryDash: { fontFamily: Typography.family.regular, color: Colors.textMuted },

  footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  clearBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  clearTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  applyBtn: { flex: 2, paddingVertical: Spacing.md, borderRadius: Radii.lg, backgroundColor: Colors.primary, alignItems: 'center' },
  applyTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
});

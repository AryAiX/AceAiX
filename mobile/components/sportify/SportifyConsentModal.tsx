import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Shield, Eye, Trash2, AlertTriangle, BadgeCheck } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { grantConsent, ConsentingParty } from '@/lib/sportifyService';
import { useAuth } from '@/context/AuthContext';

interface Props {
  visible: boolean;
  isMinor: boolean;
  onClose: () => void;
  onConsented: () => void;
}

const DATA_ITEMS = [
  'Physical test results (sprint, jump, agility, reaction, endurance, strength, flexibility, movement quality)',
  'Talent potential assessment — recommended sports with potential scores and driving strengths',
  'Test method (camera-based or in-person)',
  'Test dates, academy location, and a verification reference',
];

const NOT_IMPORTED = [
  'Raw camera or video footage',
  'Personal health or medical records',
  'Any data not directly related to test results',
];

export function SportifyConsentModal({ visible, isMinor, onClose, onConsented }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmed && (!isMinor || (guardianName.trim().length > 0 && guardianEmail.trim().length > 0));

  const handleGrant = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    const party: ConsentingParty = isMinor ? 'guardian' : 'athlete';
    const { error: err } = await grantConsent({
      athleteId: user.id,
      consentingParty: party,
      guardianName: isMinor ? guardianName.trim() : undefined,
      guardianEmail: isMinor ? guardianEmail.trim() : undefined,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    onConsented();
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
            <View style={s.iconBox}>
              <Shield color={Colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Data Import Consent</Text>
              <Text style={s.sub}>Sportify Academy · AceAiX</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}><X color={Colors.textMuted} size={20} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

            {isMinor && (
              <View style={s.minorBanner}>
                <AlertTriangle color={Colors.warning} size={16} />
                <Text style={s.minorTxt}>
                  This athlete is under 18. A parent or guardian must provide consent before any data is imported.
                </Text>
              </View>
            )}

            <Section title="What data will be imported">
              {DATA_ITEMS.map((item, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bullet} />
                  <Text style={s.bulletTxt}>{item}</Text>
                </View>
              ))}
            </Section>

            <Section title="What will NOT be imported">
              {NOT_IMPORTED.map((item, i) => (
                <View key={i} style={s.bulletRow}>
                  <X color={Colors.error} size={10} />
                  <Text style={[s.bulletTxt, { color: Colors.textMuted }]}>{item}</Text>
                </View>
              ))}
            </Section>

            <Section title="How it's used">
              <Text style={s.bodyTxt}>
                Imported results are displayed on your AceAiX profile to help scouts, coaches, and club opportunities match your verified physical capabilities. They are never shared publicly without your explicit approval and are protected by row-level security — only you and authorised AceAiX staff can view them.
              </Text>
            </Section>

            <Section title="Your rights">
              <Text style={s.bodyTxt}>
                You can disconnect your Sportify account and delete all imported data at any time from Settings → Connected Data → Sportify Academy. Deletion is permanent and immediate.
              </Text>
            </Section>

            {isMinor && (
              <Section title="Guardian details (required)">
                <Text style={s.guardianNote}>
                  As this athlete is under 18, their parent or legal guardian must confirm consent below.
                </Text>
                <TextInput
                  style={s.input}
                  value={guardianName}
                  onChangeText={setGuardianName}
                  placeholder="Guardian full name"
                  placeholderTextColor={Colors.textDisabled}
                />
                <TextInput
                  style={s.input}
                  value={guardianEmail}
                  onChangeText={setGuardianEmail}
                  placeholder="Guardian email address"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Section>
            )}

            <View style={s.confirmRow}>
              <Switch
                value={confirmed}
                onValueChange={setConfirmed}
                trackColor={{ false: Colors.elevated, true: `${Colors.primary}60` }}
                thumbColor={confirmed ? Colors.primary : Colors.textDisabled}
              />
              <Text style={s.confirmTxt}>
                {isMinor
                  ? 'I am the parent/legal guardian of this athlete and I consent to the data import described above.'
                  : 'I have read and understood the above and consent to Sportify Academy sharing my test results with AceAiX.'}
              </Text>
            </View>

            {error && <Text style={s.errorTxt}>{error}</Text>}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.grantBtn, (!canSubmit || submitting) && { opacity: 0.4 }]}
              onPress={handleGrant}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <BadgeCheck color={Colors.white} size={16} />
                  <Text style={s.grantTxt}>Grant Consent</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '90%',
    paddingTop: Spacing.sm,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}40` },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 1 },

  body: { padding: Spacing.xl, gap: Spacing.xl },

  minorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: `${Colors.warning}15`, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.warning}40` },
  minorTxt: { flex: 1, fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.warning, lineHeight: 18 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6, flexShrink: 0 },
  bulletTxt: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, lineHeight: 18 },
  bodyTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 19 },

  guardianNote: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginBottom: Spacing.md, lineHeight: 18 },
  input: { backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, marginBottom: Spacing.sm },

  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.elevated, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  confirmTxt: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 18 },

  errorTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.error },

  footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  grantBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.lg, backgroundColor: Colors.primary },
  grantTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
});

const sec = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textPrimary },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { Opportunity, applyToOpportunity } from '@/lib/opportunitiesService';
import { useAuth } from '@/context/AuthContext';

interface Props {
  opportunity: Opportunity | null;
  onClose: () => void;
  onApplied: (oppId: string, appId: string) => void;
}

export function ApplySheet({ opportunity, onClose, onApplied }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!opportunity) return null;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const { id, error: err } = await applyToOpportunity(opportunity.id, user.id, message.trim() || undefined);
    setSubmitting(false);
    if (err) {
      setError(err.includes('duplicate') || err.includes('unique') ? 'You have already applied for this opportunity.' : err);
      return;
    }
    onApplied(opportunity.id, id!);
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={!!opportunity} animationType="slide" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.sheet, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Express Interest</Text>
              <Text style={s.sub} numberOfLines={1}>
                {opportunity.position} · {opportunity.club}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <View style={s.body}>
            <Text style={s.label}>Message to the club (optional)</Text>
            <TextInput
              style={s.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Introduce yourself, highlight why you're a great fit…"
              placeholderTextColor={Colors.textDisabled}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {error && <Text style={s.errorTxt}>{error}</Text>}
            <Text style={s.hint}>
              Your profile, stats, and highlights will be shared automatically. The club will receive your application and can update its status.
            </Text>
          </View>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.black} />
              ) : (
                <>
                  <Send color={Colors.black} size={16} />
                  <Text style={s.submitTxt}>Apply Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingTop: Spacing.sm,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  sub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginTop: 2 },

  body: { padding: Spacing.xl, gap: Spacing.md },
  label: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.sm, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.elevated, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary,
    minHeight: 110,
  },
  errorTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.error },
  hint: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, lineHeight: 17 },

  footer: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.lg, backgroundColor: Colors.accent },
  submitTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.black },
});

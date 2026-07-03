import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Zap, Send, Lock } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';

export default function AICoach() {
  return (
    <View style={s.root}>
      <AppHeader title="AI Coach" />
      <View style={s.coachBar}>
        <View style={s.coachAv}><Zap color={Colors.bg} size={18} fill={Colors.bg} /></View>
        <View>
          <Text style={s.coachName}>AceAiX Career Coach</Text>
          <View style={s.onlineRow}>
            <View style={s.offlineDot} />
            <Text style={s.onlineTxt}>Not configured</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.msgList} contentContainerStyle={s.emptyWrap}>
        <View style={s.emptyIcon}>
          <Lock color={Colors.textMuted} size={34} />
        </View>
        <Text style={s.emptyTitle}>AI coach not connected</Text>
        <Text style={s.emptyText}>
          This build does not send your personal, medical, or performance data to a third-party AI service.
          Personalized coaching will require your permission before any external provider receives data.
        </Text>
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value=""
          editable={false}
          placeholder="AI coach is not configured for this build"
          placeholderTextColor={Colors.textDisabled}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, s.sendBtnDisabled]}
          disabled
        >
          <Send color={Colors.textDisabled} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  coachBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  coachAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontFamily: Typography.family.display, fontSize: Typography.size.lg, color: Colors.textPrimary, letterSpacing: 0.5 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  onlineTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  msgList: { flex: 1 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: Typography.family.display, fontSize: Typography.size.xl, color: Colors.textPrimary },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input: { flex: 1, backgroundColor: Colors.elevated, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.elevated },
});

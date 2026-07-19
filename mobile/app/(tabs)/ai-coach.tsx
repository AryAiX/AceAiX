import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ShieldCheck, Send, Sparkles, Zap } from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface CoachMessage {
  id: string;
  sender: 'athlete' | 'coach';
  content: string;
}

const STARTERS = [
  'How can I improve my profile?',
  'What should I focus on this week?',
  'How can I find better opportunities?',
];

export default function AICoach() {
  const { profile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const athleteName = profile?.full_name?.split(' ')[0] ?? 'athlete';
  const [messages, setMessages] = useState<CoachMessage[]>([{
    id: 'welcome',
    sender: 'coach',
    content: `Hi ${athleteName}. I can help you improve your AceAiX profile, plan your development, and prepare for opportunities. What would you like to work on?`,
  }]);

  const context = useMemo(() => ({
    sport: profile?.sport ?? 'your sport',
    position: profile?.position ?? 'your position',
    club: profile?.current_club,
    completeness: Math.round(profile?.profile_completeness ?? 0),
    performance: Math.round(profile?.performance_score ?? 0),
    fitness: Math.round(profile?.fitness_score ?? 0),
  }), [profile]);

  function buildResponse(question: string): string {
    const normalized = question.toLowerCase();

    if (normalized.includes('profile') || normalized.includes('visibility')) {
      const missingFocus = context.completeness < 100
        ? `Your profile is ${context.completeness}% complete. Add any missing position, club, bio, performance stats, and recent media first.`
        : 'Your profile is complete, so focus on keeping recent performance stats and media up to date.';
      return `${missingFocus} Use a clear athlete headline for ${context.position}, add measurable achievements, and feature one recent match or training clip.`;
    }

    if (normalized.includes('opportun') || normalized.includes('trial') || normalized.includes('scout')) {
      return `For ${context.sport}, prioritize opportunities that match ${context.position}, your location, and your current level. Review the Opportunities tab, save strong matches, and tailor each application with one measurable result and your availability.`;
    }

    if (normalized.includes('week') || normalized.includes('focus') || normalized.includes('plan')) {
      const developmentTarget = context.performance < 75
        ? 'record one performance session and update your key statistics'
        : 'maintain your performance level and document one new highlight';
      return `This week: 1) ${developmentTarget}; 2) complete two position-specific ${context.position} sessions; 3) schedule recovery; and 4) contact one relevant coach, scout, or club through AceAiX.`;
    }

    if (normalized.includes('fitness') || normalized.includes('recovery') || normalized.includes('injur')) {
      return `Your current fitness score is ${context.fitness || 'not yet recorded'}. Use the Medical and Events sections to keep clearances and training dates organized. For pain, injury, or return-to-play decisions, consult a qualified medical professional rather than relying on this coach.`;
    }

    if (normalized.includes('performance') || normalized.includes('stat')) {
      return `Your current performance score is ${context.performance || 'not yet recorded'}. Open Performance Engine, add the latest verified or self-reported stats, and compare the same metrics over a consistent period. Focus on two controllable metrics for ${context.position}.`;
    }

    return `For your ${context.position} development in ${context.sport}, turn that goal into one measurable action this week. Update the relevant AceAiX section after you complete it so your profile and opportunity matches stay current. You can ask me specifically about profile visibility, performance, weekly planning, fitness, or opportunities.`;
  }

  function submitMessage(value = draft) {
    const content = value.trim();
    if (!content || thinking) return;

    const sentAt = Date.now();
    setMessages((current) => [...current, {
      id: `athlete-${sentAt}`,
      sender: 'athlete',
      content,
    }]);
    setDraft('');
    setThinking(true);

    setTimeout(() => {
      setMessages((current) => [...current, {
        id: `coach-${sentAt}`,
        sender: 'coach',
        content: buildResponse(content),
      }]);
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, 350);
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Career Planner" />
      <View style={s.coachBar}>
        <View style={s.coachAv}><Zap color={Colors.bg} size={18} fill={Colors.bg} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.coachName}>AceAiX Guided Career Planner</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineTxt}>Ready</Text>
          </View>
        </View>
        <View style={s.privateBadge}>
          <ShieldCheck color={Colors.success} size={13} />
          <Text style={s.privateText}>Private</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.msgList}
        contentContainerStyle={s.messageContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={s.privacyNotice}>
          <ShieldCheck color={Colors.primary} size={16} />
          <Text style={s.privacyText}>
            Guidance is generated inside this app from the profile already on your device. No data is sent to a third-party AI provider.
          </Text>
        </View>

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              s.messageRow,
              message.sender === 'athlete' ? s.messageRowAthlete : s.messageRowCoach,
            ]}
          >
            {message.sender === 'coach' && (
              <View style={s.messageIcon}>
                <Sparkles color={Colors.primary} size={14} />
              </View>
            )}
            <View style={[
              s.bubble,
              message.sender === 'athlete' ? s.athleteBubble : s.coachBubble,
            ]}>
              <Text style={[
                s.messageText,
                message.sender === 'athlete' && s.athleteMessageText,
              ]}>
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {thinking && (
          <View style={[s.messageRow, s.messageRowCoach]}>
            <View style={s.messageIcon}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
            <View style={[s.bubble, s.coachBubble]}>
              <Text style={s.messageText}>Preparing guidance…</Text>
            </View>
          </View>
        )}

        {messages.length === 1 && (
          <View style={s.starters}>
            {STARTERS.map((starter) => (
              <TouchableOpacity
                key={starter}
                accessibilityRole="button"
                style={s.starter}
                onPress={() => submitMessage(starter)}
              >
                <Text style={s.starterText}>{starter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          accessibilityLabel="Ask the career coach"
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about your profile or development…"
          placeholderTextColor={Colors.textDisabled}
          multiline
          maxLength={500}
          editable={!thinking}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (!draft.includes('\n')) submitMessage();
          }}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send coach question"
          style={[s.sendBtn, (!draft.trim() || thinking) && s.sendBtnDisabled]}
          disabled={!draft.trim() || thinking}
          onPress={() => submitMessage()}
        >
          {thinking
            ? <ActivityIndicator color={Colors.bg} size="small" />
            : <Send color={draft.trim() ? Colors.bg : Colors.textDisabled} size={18} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  coachBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  coachAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontFamily: Typography.family.display, fontSize: Typography.size.lg, color: Colors.textPrimary, letterSpacing: 0.5 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  onlineTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  privateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.full, backgroundColor: `${Colors.success}12`, borderWidth: 1, borderColor: `${Colors.success}35`, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  privateText: { fontFamily: Typography.family.bold, fontSize: 10, color: Colors.success },
  msgList: { flex: 1 },
  messageContent: { flexGrow: 1, padding: Spacing.lg, gap: Spacing.md },
  privacyNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.primary}30`, backgroundColor: `${Colors.primary}08`, padding: Spacing.md, marginBottom: Spacing.sm },
  privacyText: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.size.xs, lineHeight: 17, color: Colors.textMuted },
  messageRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  messageRowAthlete: { justifyContent: 'flex-end' },
  messageRowCoach: { justifyContent: 'flex-start' },
  messageIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${Colors.primary}18`, borderWidth: 1, borderColor: `${Colors.primary}35`, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 11, borderWidth: 1 },
  coachBubble: { backgroundColor: Colors.surface, borderColor: Colors.border, borderBottomLeftRadius: Radii.xs },
  athleteBubble: { backgroundColor: Colors.primary, borderColor: Colors.primary, borderBottomRightRadius: Radii.xs },
  messageText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, lineHeight: 20, color: Colors.textPrimary },
  athleteMessageText: { color: Colors.white },
  starters: { gap: Spacing.sm, marginTop: Spacing.sm, marginLeft: 38 },
  starter: { alignSelf: 'flex-start', borderRadius: Radii.full, borderWidth: 1, borderColor: `${Colors.primary}45`, backgroundColor: `${Colors.primary}0A`, paddingHorizontal: Spacing.md, paddingVertical: 9 },
  starterText: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input: { flex: 1, backgroundColor: Colors.elevated, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border },
});

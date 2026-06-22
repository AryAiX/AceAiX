import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, scoreColor } from '../theme';

export function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return <View style={[styles.card, accent ? { borderColor: accent } : null]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Pill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'info' }) {
  const color = tone === 'success' ? colors.emerald : tone === 'warning' ? colors.warning : tone === 'info' ? colors.azure : colors.slate;
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Metric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
}

export function ScoreBubble({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value);
  return (
    <View style={styles.scoreWrap}>
      <View style={[styles.scoreCircle, { borderColor: color }]}>
        <Text style={styles.scoreValue}>{Math.round(value)}</Text>
      </View>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const backgroundColor = variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.navy600 : colors.volt;
  const color = variant === 'primary' ? colors.navy900 : colors.white;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.82 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metric: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    flex: 1,
    padding: 12,
  },
  metricValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricHelper: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  scoreWrap: {
    alignItems: 'center',
    flex: 1,
  },
  scoreCircle: {
    alignItems: 'center',
    borderRadius: 42,
    borderWidth: 5,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  scoreValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  scoreLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    color: colors.white,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  button: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '900',
  },
});

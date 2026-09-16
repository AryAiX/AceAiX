import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, TextStyle, View, ViewStyle } from 'react-native';
import { Check, ChevronLeft, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text, Chip, Input } from '@/components/ui';
import type { TextTone } from '@/components/ui';
import { useT } from '@/i18n';
import { currentLanguage } from '@/lib/i18n-bridge';
import { PRIORITY_COUNTRIES } from '@/constants/sports';

/**
 * The pieces every wizard step is built from — sign-up and onboarding share
 * them so the two flows feel like one journey rather than two products.
 */

// ── Progress ─────────────────────────────────────────────────────────────────
export function WizardProgress({ step, total }: { step: number; total: number }) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, duration } = theme;
  const safeTotal = Math.max(1, total);
  const pct = Math.min(1, Math.max(0, (step + 1) / safeTotal));
  const width = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: duration.base,
      easing: Easing.out(Easing.cubic),
      // A percentage width cannot be driven natively.
      useNativeDriver: false,
    }).start();
  }, [pct, width, duration.base]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t('auth.stepProgress', { current: step + 1, total: safeTotal })}
      accessibilityValue={{ min: 1, max: safeTotal, now: step + 1 }}
      style={{
        height: 6,
        flex: 1,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radii.pill,
          backgroundColor: colors.primary,
          width: width.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

/** Back arrow + progress bar. The arrow steps backwards, it never exits. */
export function WizardTopBar({
  step,
  total,
  onBack,
  backLabel,
  hideBack = false,
  right,
}: {
  step: number;
  total: number;
  onBack: () => void;
  backLabel?: string;
  /** Keeps the layout steady on the first step, where there is no way back. */
  hideBack?: boolean;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing, hit } = theme;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      {hideBack ? (
        <View style={{ width: hit.min, height: hit.min }} />
      ) : (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? t('auth.stepBack')}
          style={({ pressed }) => ({
            width: hit.min,
            height: hit.min,
            borderRadius: radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
      )}

      <WizardProgress step={step} total={total} />

      {right ?? (
        <Text variant="caption" tone="muted" style={{ minWidth: 40, textAlign: 'right' }}>
          {t('auth.stepCounter', { current: step + 1, total: Math.max(1, total) })}
        </Text>
      )}
    </View>
  );
}

// ── Step heading ─────────────────────────────────────────────────────────────
export function StepHeading({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const { spacing } = theme;

  return (
    <View style={[{ gap: spacing.sm, marginBottom: spacing.xl }, style]}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="secondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// ── Option card ──────────────────────────────────────────────────────────────
interface OptionCardProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onPress: () => void;
  /** `radio` for pick-one lists, `checkbox` for pick-many. */
  control?: 'radio' | 'checkbox';
  testID?: string;
}

/** A large, unmissable choice. Used for roles, levels and positions. */
export function OptionCard({
  title,
  subtitle,
  emoji,
  icon,
  selected = false,
  onPress,
  control = 'radio',
  testID,
}: OptionCardProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole={control}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 72,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {emoji ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? colors.surface : colors.surfaceAlt,
          }}
        >
          <Text variant="heading">{emoji}</Text>
        </View>
      ) : icon ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? colors.surface : colors.surfaceAlt,
          }}
        >
          {icon}
        </View>
      ) : null}

      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: control === 'checkbox' ? radii.xs : radii.pill,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.borderStrong,
          backgroundColor: selected ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Check size={16} color={colors.textOnBrand} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

// ── Grid tile ────────────────────────────────────────────────────────────────
/** Square tile with a big emoji — the sport picker. */
export function SportTile({
  label,
  emoji,
  selected,
  onPress,
  control = 'radio',
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
  control?: 'radio' | 'checkbox';
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={control}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: '31%',
        minWidth: 96,
        minHeight: 96,
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text variant="title">{emoji}</Text>
      <Text
        variant="captionStrong"
        align="center"
        tone={selected ? 'primary' : 'secondary'}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────
export function CheckboxRow({
  checked,
  onToggle,
  label,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  /** Read out by screen readers; `children` is what is drawn. */
  label: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 44,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radii.xs,
          borderWidth: 1.5,
          borderColor: checked ? colors.primary : colors.borderStrong,
          backgroundColor: checked ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Check size={16} color={colors.textOnBrand} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

// ── Country picker ───────────────────────────────────────────────────────────
const COUNTRIES_BEFORE_EXPAND = 10;

export function CountryPicker({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (country: string) => void;
  label?: string;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q
      ? PRIORITY_COUNTRIES.filter((c) => c.toLowerCase().includes(q))
      : PRIORITY_COUNTRIES;
    if (q || expanded) return all;

    // Keep the first tap cheap: a short list, plus whatever is already chosen.
    const short = all.slice(0, COUNTRIES_BEFORE_EXPAND);
    if (value && !short.includes(value)) short.push(value);
    return short;
  }, [query, expanded, value]);

  const showMore =
    !query.trim() && !expanded && PRIORITY_COUNTRIES.length > COUNTRIES_BEFORE_EXPAND;

  return (
    <View style={{ gap: spacing.md }}>
      <Input
        label={label ?? t('onboarding.countryLabel')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('onboarding.countrySearchPlaceholder')}
        autoCorrect={false}
        icon={<Search size={18} color={colors.textMuted} />}
        returnKeyType="search"
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {matches.map((country) => (
          <Chip
            key={country}
            label={country}
            selected={value === country}
            onPress={() => onChange(country)}
          />
        ))}
        {matches.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('onboarding.countryNoMatch')}
          </Text>
        ) : null}
      </View>

      {showMore ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.countryShowAll')}
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text variant="captionStrong" tone="primary">
            {t('onboarding.countryShowAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Small helpers shared by the two flows ────────────────────────────────────

/** Whole years between a date of birth and today. */
export function calculateAge(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** `yyyy-mm-dd` in local time — never `toISOString()`, which shifts the day. */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(currentLanguage(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Deliberately permissive: the confirmation e-mail is the real check. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export const MIN_PASSWORD_LENGTH = 8;

/** The verdict, not the wording — the meter looks the words up in the reader's language. */
export type PasswordLevel = 'tooShort' | 'weak' | 'good' | 'strong';

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  level: PasswordLevel;
}

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { score: 0, level: 'tooShort' };
  }

  const variety =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/\d/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  if (password.length >= 12 && variety >= 3) return { score: 3, level: 'strong' };
  if (variety >= 2) return { score: 2, level: 'good' };
  return { score: 1, level: 'weak' };
}

/** Three segments that fill as the password gets harder to guess. */
export function PasswordMeter({ strength }: { strength: PasswordStrength }) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;

  const toneColor = [colors.danger, colors.danger, colors.warning, colors.success][strength.score];

  const label = t(`auth.password.${strength.level}Label`);
  const hint =
    strength.level === 'tooShort'
      ? t('auth.passwordMinLength', { count: MIN_PASSWORD_LENGTH })
      : t(`auth.password.${strength.level}Hint`);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {[1, 2, 3].map((segment) => (
          <View
            key={segment}
            style={{
              flex: 1,
              height: 5,
              borderRadius: radii.pill,
              backgroundColor: strength.score >= segment ? toneColor : colors.surfaceSunken,
            }}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {t('auth.password.meterSummary', { label, hint })}
      </Text>
    </View>
  );
}

// ── Terms and privacy line ───────────────────────────────────────────────────
/**
 * One sentence with the Terms and the Privacy Policy tappable inside it.
 *
 * The sentence is a single translated string carrying `{{terms}}` and
 * `{{privacy}}`, so a translator can put the links wherever their language
 * wants them instead of being handed three fragments to glue together.
 */
export function LegalLine({
  templateKey,
  onOpenTerms,
  onOpenPrivacy,
  tone = 'secondary',
  align,
  style,
}: {
  templateKey: string;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  style?: TextStyle;
}) {
  const t = useT();

  // No variables: the placeholders survive so they can be swapped for links.
  const parts = t(templateKey).split(/(\{\{terms\}\}|\{\{privacy\}\})/);

  return (
    <Text variant="caption" tone={tone} align={align} style={style}>
      {parts.map((part, index) => {
        if (part === '{{terms}}') {
          return (
            <Text
              key={index}
              variant="captionStrong"
              tone="primary"
              accessibilityRole="link"
              accessibilityLabel={t('auth.legalTermsA11y')}
              onPress={onOpenTerms}
            >
              {t('auth.legalTermsLink')}
            </Text>
          );
        }
        if (part === '{{privacy}}') {
          return (
            <Text
              key={index}
              variant="captionStrong"
              tone="primary"
              accessibilityRole="link"
              accessibilityLabel={t('auth.legalPrivacyA11y')}
              onPress={onOpenPrivacy}
            >
              {t('common.privacyPolicy')}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { LANGUAGES, LanguageCode } from '@/i18n';

interface Props {
  selected: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  style?: ViewStyle;
  busy?: LanguageCode | null;
}

/**
 * The list of languages, shared by the first-launch picker and Settings.
 *
 * Each row leads with the language's own name in its own script. Someone
 * looking for Arabic is scanning for العربية, not for the word "Arabic" — and
 * on first launch they have not chosen a language yet, so the English label is
 * the secondary line, never the primary one.
 */
export function LanguageList({ selected, onSelect, style, busy }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {LANGUAGES.map((lang) => {
        const active = lang.code === selected;
        const isBusy = busy === lang.code;

        return (
          <Pressable
            key={lang.code}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, busy: isBusy }}
            accessibilityLabel={`${lang.nativeName}, ${lang.name}`}
            onPress={() => onSelect(lang.code)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: theme.hit.comfortable,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radii.md,
              borderWidth: 1.5,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primarySoft : colors.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              <Text
                variant="subheading"
                // Every native name renders left-to-right within its own row,
                // including العربية — the row itself is what mirrors.
                style={{ writingDirection: lang.dir === 'rtl' ? 'rtl' : 'ltr' }}
              >
                {lang.nativeName}
              </Text>
              <Text variant="caption" tone="muted">
                {lang.name}
              </Text>
            </View>

            {active ? <Check size={20} color={colors.primary} strokeWidth={2.6} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

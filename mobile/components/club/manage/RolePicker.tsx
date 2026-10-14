import React from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { INVITABLE_ROLES, type InvitableRole } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';

/** The roles a manager can hand out, each with a line on what it lets you do. */
export function RolePicker({
  value,
  onChange,
  testIDPrefix = 'club-role',
}: {
  value: InvitableRole;
  onChange: (role: InvitableRole) => void;
  testIDPrefix?: string;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();

  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
      {INVITABLE_ROLES.map((role) => {
        const selected = role === value;
        return (
          <Pressable
            key={role}
            onPress={() => onChange(role)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${clubLabel(t, 'role', role)}. ${clubLabel(t, 'roleHint', role)}`}
            testID={`${testIDPrefix}-${role}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: theme.hit.comfortable,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radii.md,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primarySoft : colors.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{clubLabel(t, 'role', role)}</Text>
              <Text variant="caption" tone="muted">
                {clubLabel(t, 'roleHint', role)}
              </Text>
            </View>
            {selected ? <Check size={20} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

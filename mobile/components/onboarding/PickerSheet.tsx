import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Input, Sheet, Text } from '@/components/ui';

/**
 * A field that shows the current choice and opens a searchable list.
 *
 * It looks like an `Input` (same label, box and hint) so a form reads as one
 * column of fields, but tapping it opens `PickerSheet` instead of a keyboard.
 */
export function SelectField({
  label,
  value,
  placeholder,
  hint,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  /** The words for the current choice; empty shows the placeholder. */
  value: string;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <View style={{ gap: 6 }}>
      <Text variant="captionStrong" tone="secondary">
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${value}` : label}
        accessibilityState={{ disabled: !!disabled }}
        testID={testID}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 52,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: disabled ? colors.surfaceAlt : colors.surface,
          opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
        })}
      >
        <Text
          variant="body"
          color={value ? colors.text : colors.textMuted}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface PickerRow {
  /** What is stored when this row is picked. */
  key: string;
  /** What the row says. */
  label: string;
}

/**
 * A bottom sheet with a search box on top and the matching rows under it.
 * The caller filters: it owns the query, so a list that comes from the server
 * (cities) and one that is local (countries) work the same way.
 */
export function PickerSheet({
  visible,
  onClose,
  title,
  query,
  onQueryChange,
  searchPlaceholder,
  rows,
  selected,
  onPick,
  emptyText,
  extraRow,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  rows: PickerRow[];
  selected: string | null;
  onPick: (key: string) => void;
  /** Shown when nothing matches and there is no `extraRow`. */
  emptyText: string;
  /** A row pinned above the list, e.g. "Use “Al Ain”" for a typed city. */
  extraRow?: PickerRow | null;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const row = (item: PickerRow) => {
    const on = item.key === selected;
    return (
      <Pressable
        key={item.key}
        onPress={() => onPick(item.key)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={item.label}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 48,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
        })}
      >
        <Text
          variant={on ? 'bodyStrong' : 'body'}
          color={on ? colors.primary : colors.text}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {item.label}
        </Text>
        {on ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
      </Pressable>
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      height={0.8}
      scrollable={false}
      swipeToDismiss
      contentStyle={{ flexShrink: 1, gap: spacing.md }}
      testID={testID}
    >
      <Input
        value={query}
        onChangeText={onQueryChange}
        placeholder={searchPlaceholder}
        autoCorrect={false}
        autoFocus
        icon={<Search size={18} color={colors.textMuted} />}
        returnKeyType="search"
        testID={testID ? `${testID}-search` : undefined}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => row(item)}
        /* React Native 0.88 list props take `undefined`, not `null`. */
        ListHeaderComponent={extraRow ? row(extraRow) : undefined}
        ListEmptyComponent={
          extraRow ? undefined : (
            <Text variant="caption" tone="muted" style={{ paddingVertical: spacing.md }}>
              {emptyText}
            </Text>
          )
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        style={{ flexShrink: 1 }}
      />
    </Sheet>
  );
}

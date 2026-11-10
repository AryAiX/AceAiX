import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { isRTL } from './rtl';
import { Text } from './Text';
import { ChoiceRow } from './ChoiceRow';

export interface DropdownOption {
  key: string;
  label: string;
  /** An emoji shown before the label (a sport's ball, say). */
  emoji?: string;
  /** Shown faded, e.g. a sport with nothing in it right now. Still pickable. */
  faded?: boolean;
}

interface Props {
  /** The small grey label above the field. */
  label?: string;
  options: DropdownOption[];
  /** Chosen keys. Empty means "Any". */
  value: string[];
  onChange: (next: string[]) => void;
  /** More than one can be ticked, and the list stays open while you tick.
      Otherwise picking one replaces the other and closes the list, and
      tapping the chosen one again clears it. */
  multiple?: boolean;
  /** Shown when nothing is chosen. Defaults to "Any". */
  placeholder?: string;
  /** Type in the row to narrow the list. On by default for lists longer
      than 6; a short list just opens, with no keyboard. */
  searchable?: boolean;
  /** Only the field and the list, always open (inside a sheet that is itself
      the picker). */
  inline?: boolean;
  /** A form field that must have an answer: tapping the chosen option
      again keeps it instead of clearing it. */
  required?: boolean;
  disabled?: boolean;
  testID?: string;
}

const LIST_MAX = 300;

/**
 * One tidy row per filter instead of a wall of chips. The row says what is
 * chosen ("Any" when nothing is). On a long list the row itself is the
 * search box: tap it and type to narrow the list, or tick straight from the
 * list; the arrow opens and closes it without the keyboard. A short list just
 * opens, with no keyboard. Used for every filter list
 * in the app (sport, type, position, level) so they all behave the same.
 */
export function Dropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder,
  searchable,
  inline = false,
  required = false,
  disabled = false,
  testID,
}: Props) {
  const { colors, radii, spacing, font, size } = useTheme();
  const t = useT();
  const input = useRef<TextInputInstance>(null);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState('');
  const expanded = inline || open;
  const canType = searchable ?? options.length > 6;

  const chosen = useMemo(
    () => value.map((key) => options.find((o) => o.key === key)).filter((o): o is DropdownOption => !!o),
    [value, options],
  );
  const anyLabel = placeholder ?? t('common.any');
  const summary =
    chosen.length === 0
      ? ''
      : chosen.length <= 2
        ? chosen.map((o) => o.label).join(', ')
        : `${chosen
            .slice(0, 2)
            .map((o) => o.label)
            .join(', ')} +${chosen.length - 2}`;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    input.current?.blur();
    Keyboard.dismiss();
  };

  const pick = (key: string) => {
    const has = value.includes(key);
    if (multiple) {
      onChange(has ? value.filter((k) => k !== key) : [...value, key]);
      // Keep the list open for the next tick; a finished search word goes.
      if (query) setQuery('');
    } else {
      onChange(has && !required ? [] : [key]);
      if (inline) setQuery('');
      else close();
    }
  };

  /* While typing, the field holds the search word; otherwise it shows the
     choice in bold, or "Any". The ticks in the list show what is chosen. */
  const fieldValue = typing ? query : summary;
  const fieldPlaceholder = typing ? t('common.search') : anyLabel;

  const field = (
    <Pressable
      onPress={() => (canType ? input.current?.focus() : open ? close() : setOpen(true))}
      disabled={disabled}
      accessibilityRole={canType ? undefined : 'button'}
      accessibilityState={canType ? undefined : { expanded: open, disabled }}
      accessibilityLabel={canType ? undefined : label ? `${label}: ${summary || anyLabel}` : summary || anyLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 52,
        paddingLeft: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: expanded && !inline ? colors.primary : typing ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {canType ? (
        <TextInput
          ref={input}
          value={fieldValue}
          onChangeText={(text) => {
            setQuery(text);
            if (!inline) setOpen(true);
          }}
          onFocus={() => {
            setTyping(true);
            if (!inline) setOpen(true);
          }}
          onBlur={() => {
            setTyping(false);
            setQuery('');
          }}
          placeholder={fieldPlaceholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          accessibilityLabel={label ? `${label}: ${summary || anyLabel}` : summary || anyLabel}
          accessibilityHint={t('common.search')}
          testID={testID ? `${testID}-field` : undefined}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: !typing && chosen.length ? font.semibold : font.regular,
            fontSize: size.md,
            paddingVertical: 0,
            minHeight: 48,
            textAlign: isRTL ? 'right' : undefined,
          }}
        />
      ) : (
        <Text
          variant={chosen.length ? 'bodyStrong' : 'body'}
          tone={chosen.length ? undefined : 'muted'}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {summary || anyLabel}
        </Text>
      )}
      {inline ? (
        <View style={{ width: spacing.md }} />
      ) : (
        <Pressable
          onPress={() => (open ? close() : setOpen(true))}
          disabled={disabled}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled }}
          accessibilityLabel={label ?? anyLabel}
          testID={testID ? `${testID}-toggle` : undefined}
          style={{ alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: spacing.md }}
        >
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <ChevronDown size={20} color={open ? colors.primary : colors.textMuted} />
          </View>
        </Pressable>
      )}
    </Pressable>
  );

  const list = (
    <View
      style={
        inline
          ? { marginTop: spacing.sm }
          : {
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.lg,
              backgroundColor: colors.surface,
              overflow: 'hidden',
              marginTop: spacing.xs,
              padding: 4,
            }
      }
    >
      <ScrollView
        contentContainerStyle={{ gap: 4 }}
        style={{ maxHeight: inline ? undefined : LIST_MAX }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {visible.length === 0 ? (
          <Text variant="body" tone="muted" style={{ padding: spacing.md }}>
            {t('common.noResults')}
          </Text>
        ) : null}
        {visible.map((option) => (
          <ChoiceRow
            key={option.key}
            label={option.label}
            emoji={option.emoji}
            faded={option.faded}
            on={value.includes(option.key)}
            multiple={multiple}
            onPress={() => pick(option.key)}
            testID={testID ? `${testID}-${option.key}` : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View testID={testID}>
      {label ? (
        <Text variant="overline" tone="muted" style={{ marginBottom: spacing.sm }}>
          {label}
        </Text>
      ) : null}
      {field}
      {expanded ? list : null}
    </View>
  );
}

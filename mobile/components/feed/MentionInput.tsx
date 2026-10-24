import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import { mentionCandidates, type MentionCandidate } from '@/lib/api';
import {
  MENTION_LIMIT,
  activeMentionQuery,
  adjustMentions,
  applyMention,
  caretAfterEdit,
  type MentionSpan,
} from '@/lib/mentions';

/**
 * A TextInput that can @-mention people.
 *
 * The field itself keeps the caller's props, style and maxLength. While the
 * caret is in an "@query" of at least one character, suggestions appear just
 * above it. Picked names are painted in the primary colour on a mirror of the
 * text; the input's own glyphs are transparent so the caret still sits in the
 * real field.
 */

const SUGGESTION_LIMIT = 5;
const SEARCH_DELAY_MS = 250;

export interface MentionInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onMentionsChange?: (mentions: MentionSpan[]) => void;
  /** Border, padding and background around the field. Suggestions sit above this box. */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * `inline` takes space above the field, which is what a scrolling composer
   * needs. `overlay` draws the list upward over whatever is already there, so
   * a footer field does not get pushed off the bottom of the screen.
   */
  suggestionsLayout?: 'inline' | 'overlay';
}

interface ActiveQuery {
  start: number;
  query: string;
  cursor: number;
}

function sameQuery(a: ActiveQuery | null, b: ActiveQuery | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.start === b.start && a.query === b.query && a.cursor === b.cursor;
}

function queryAt(text: string, cursor: number, mentions: readonly MentionSpan[]): ActiveQuery | null {
  if (mentions.length >= MENTION_LIMIT) return null;
  const active = activeMentionQuery(text, cursor);
  if (!active || active.query.length < 1) return null;
  // That "@" already belongs to a picked name. Typing after it is not a new search.
  if (mentions.some((mention) => mention.start === active.start)) return null;
  return { start: active.start, query: active.query, cursor };
}

function coloredRuns(
  text: string,
  mentions: readonly MentionSpan[],
): { text: string; mention: boolean }[] {
  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const runs: { text: string; mention: boolean }[] = [];
  let index = 0;
  for (const mention of sorted) {
    if (mention.start < index || mention.start >= text.length) continue;
    const end = mention.start + mention.length;
    if (end > text.length) continue;
    const slice = text.slice(mention.start, end);
    if (!slice.startsWith('@')) continue;
    if (mention.start > index) runs.push({ text: text.slice(index, mention.start), mention: false });
    runs.push({ text: slice, mention: true });
    index = end;
  }
  if (index < text.length) runs.push({ text: text.slice(index), mention: false });
  return runs;
}

export const MentionInput = forwardRef<TextInput, MentionInputProps>(function MentionInput(
  {
    value,
    onChangeText,
    onMentionsChange,
    onSelectionChange,
    containerStyle,
    suggestionsLayout = 'inline',
    style,
    editable = true,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const inputRef = useRef<TextInput>(null);
  const valueRef = useRef(value);
  const mentionsRef = useRef<MentionSpan[]>([]);
  const cursorRef = useRef(value.length);
  const onMentionsChangeRef = useRef(onMentionsChange);
  const requestRef = useRef(0);
  const choosingRef = useRef(false);
  const ignoreSelectionUntil = useRef(0);

  const [mentions, setMentions] = useState<MentionSpan[]>([]);
  const [active, setActive] = useState<ActiveQuery | null>(null);
  const [suggestions, setSuggestions] = useState<MentionCandidate[]>([]);
  const [pinnedCaret, setPinnedCaret] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);

  onMentionsChangeRef.current = onMentionsChange;
  const activeRef = useRef(active);
  activeRef.current = active;

  const setRef = (node: TextInput | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const publishQuery = (text: string, cursor: number, nextMentions: readonly MentionSpan[]) => {
    const next = editable === false ? null : queryAt(text, cursor, nextMentions);
    setActive((current) => (sameQuery(current, next) ? current : next));
  };

  const remember = (nextMentions: MentionSpan[]) => {
    mentionsRef.current = nextMentions;
    setMentions(nextMentions);
    onMentionsChangeRef.current?.(nextMentions);
  };

  useEffect(() => {
    if (value === valueRef.current) return;
    const nextMentions = adjustMentions(valueRef.current, value, mentionsRef.current);
    valueRef.current = value;
    const cursor = Math.min(cursorRef.current, value.length);
    cursorRef.current = cursor;
    remember(nextMentions);
    publishQuery(value, cursor, nextMentions);
    // `remember` and `publishQuery` close over the latest refs on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (editable !== false) return;
    requestRef.current += 1;
    setActive(null);
    setSuggestions([]);
  }, [editable]);

  useEffect(() => {
    const generation = ++requestRef.current;
    if (!active) {
      setSuggestions([]);
      return;
    }
    const query = active.query;
    const timer = setTimeout(() => {
      mentionCandidates(query)
        .then((rows) => {
          if (requestRef.current !== generation) return;
          setSuggestions(rows.slice(0, SUGGESTION_LIMIT));
        })
        .catch(() => {
          if (requestRef.current !== generation) return;
          setSuggestions([]);
        });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const handleChange = (next: string) => {
    const cursor = caretAfterEdit(valueRef.current, next);
    const nextMentions = adjustMentions(valueRef.current, next, mentionsRef.current);
    valueRef.current = next;
    cursorRef.current = cursor;
    setPinnedCaret(null);
    remember(nextMentions);
    onChangeText(next);
    publishQuery(next, cursor, nextMentions);
  };

  const handleSelection = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    if (Date.now() < ignoreSelectionUntil.current) return;
    const selection = event.nativeEvent.selection;
    if (pinnedCaret != null && (selection.start !== pinnedCaret || selection.end !== pinnedCaret)) {
      setPinnedCaret(null);
    }
    cursorRef.current = selection.end;
    publishQuery(valueRef.current, selection.end, mentionsRef.current);
    onSelectionChange?.(event);
  };

  const choose = (person: MentionCandidate) => {
    if (choosingRef.current) return;
    const current = activeRef.current;
    const name = person.full_name?.trim() ?? '';
    if (!current || !name) return;
    const result = applyMention(valueRef.current, current.cursor, mentionsRef.current, {
      user_id: person.id,
      full_name: name,
    });
    if (!result) return;

    choosingRef.current = true;
    valueRef.current = result.text;
    cursorRef.current = result.cursor;
    ignoreSelectionUntil.current = Date.now() + 200;
    setPinnedCaret(result.cursor);
    setActive(null);
    requestRef.current += 1;
    setSuggestions([]);
    remember(result.mentions);
    onChangeText(result.text);
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      inputRef.current?.setNativeProps({
        selection: { start: result.cursor, end: result.cursor },
      });
      choosingRef.current = false;
    });
  };

  const flat = StyleSheet.flatten(style) ?? {};
  const marginStyle: ViewStyle = {
    margin: flat.margin,
    marginTop: flat.marginTop,
    marginBottom: flat.marginBottom,
    marginLeft: flat.marginLeft,
    marginRight: flat.marginRight,
    marginHorizontal: flat.marginHorizontal,
    marginVertical: flat.marginVertical,
  };
  const inputStyle: TextStyle = { ...flat };
  delete inputStyle.margin;
  delete inputStyle.marginTop;
  delete inputStyle.marginBottom;
  delete inputStyle.marginLeft;
  delete inputStyle.marginRight;
  delete inputStyle.marginHorizontal;
  delete inputStyle.marginVertical;
  const typeStyle: TextStyle = {
    fontFamily: flat.fontFamily,
    fontSize: flat.fontSize,
    fontStyle: flat.fontStyle,
    fontWeight: flat.fontWeight,
    letterSpacing: flat.letterSpacing,
    lineHeight: flat.lineHeight,
    textAlign: flat.textAlign,
    padding: flat.padding,
    paddingTop: flat.paddingTop,
    paddingBottom: flat.paddingBottom,
    paddingLeft: flat.paddingLeft,
    paddingRight: flat.paddingRight,
    paddingHorizontal: flat.paddingHorizontal,
    paddingVertical: flat.paddingVertical,
  };
  const textColor = typeof flat.color === 'string' ? flat.color : colors.text;
  const runs = coloredRuns(value, mentions);
  const highlight = runs.some((run) => run.mention);

  return (
    <View
      style={[
        marginStyle,
        suggestionsLayout === 'overlay' && suggestions.length > 0
          ? { position: 'relative', zIndex: 30 }
          : null,
      ]}
    >
      {suggestions.length > 0 ? (
        <View
          testID="mention-suggestions"
          style={{
            marginBottom: spacing.xs,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            overflow: 'hidden',
            ...(suggestionsLayout === 'overlay'
              ? {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: '100%',
                  zIndex: 30,
                  elevation: 8,
                }
              : null),
          }}
        >
          {suggestions.map((person, index) => {
            const name = person.full_name?.trim() ?? '';
            if (!name) return null;
            return (
              <Pressable
                key={person.id}
                onPressIn={() => choose(person)}
                accessibilityRole="button"
                accessibilityLabel={name}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  minHeight: theme.hit.min,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                })}
              >
                <Avatar uri={person.avatar_url} name={name} size="xs" verified={person.is_verified} />
                <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={containerStyle}>
        {/* The mirror is aligned to the field, inside the box's padding, so a
            padded comment field and a padding-free caption share one path. */}
        <View style={{ position: 'relative' }}>
          {highlight ? (
            <View
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
            >
              <RNText
                style={[
                  typeStyle,
                  {
                    color: textColor,
                    transform: [{ translateY: -scrollY }],
                  },
                ]}
              >
                {runs.map((run, index) => (
                  <RNText key={index} style={run.mention ? { color: colors.primary } : undefined}>
                    {run.text}
                  </RNText>
                ))}
              </RNText>
            </View>
          ) : null}

          <TextInput
            {...rest}
            ref={setRef}
            value={value}
            editable={editable}
            onChangeText={handleChange}
            onSelectionChange={handleSelection}
            onScroll={(event) => {
              setScrollY(event.nativeEvent.contentOffset.y);
            }}
            {...(pinnedCaret == null
              ? null
              : { selection: { start: pinnedCaret, end: pinnedCaret } })}
            {...(highlight ? { cursorColor: textColor } : null)}
            style={highlight ? [inputStyle, { color: 'transparent' }] : inputStyle}
          />
        </View>
      </View>
    </View>
  );
});

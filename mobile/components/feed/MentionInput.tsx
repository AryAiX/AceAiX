import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextInputSelectionChangeEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtSign, BadgeCheck, Hash } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import {
  HashtagSuggestions,
  SUGGESTION_ROW_HEIGHT,
  SUGGESTION_VISIBLE_ROWS,
} from '@/components/feed/HashtagSuggestions';
import { MatchText } from '@/components/feed/MatchText';
import { mentionSuggestions, type MentionSuggestion } from '@/lib/api';
import { hashtagSuggestions, type HashtagSuggestion } from '@/lib/api.search';
import { activeHashtagQuery, applyHashtag } from '@/lib/hashtags';
import { roleLabel } from '@/lib/format';
import { useT } from '@/i18n';
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
 * caret is in an "@" — including "@" with nothing typed yet — people you can
 * mention appear. "@" alone lists people you follow. Picked names are painted
 * in the primary colour on a mirror of the text; the input's own glyphs are
 * transparent so the caret still sits in the real field.
 *
 * A "#" query is separate from an "@" query. It suggests hashtags and never
 * creates a mention or tells anyone. The two lists are never shown together.
 *
 * `inline` keeps the list above the field. `overlay` draws it over the
 * thread, anchored to the field. `below` puts it under the field. The panel
 * is only as tall as its rows, up to about seven, and then it scrolls.
 */

const SUGGESTION_LIMIT = 20;
const SEARCH_DELAY_MS = 250;
const HASHTAG_SEARCH_DELAY_MS = 200;
/** The comments sheet takes 88% of the screen. The handle and title sit above the thread. */
const COMMENTS_SHEET_FRACTION = 0.88;
const COMMENTS_SHEET_CHROME = 68;
/** Room kept for the composer's pinned Post button, so the list stops above it. */
const BELOW_FOOTER = 120;
/** The title row: padding, then a 22pt icon. Kept in step with the title style below. */
const TITLE_ICON = 22;
const AVATAR_MD = 44;

export interface MentionInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onMentionsChange?: (mentions: MentionSpan[]) => void;
  /** Border, padding and background around the field. */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * `inline` takes space above the field. `overlay` draws the list over
   * whatever is above the field. `below` draws it under the field.
   */
  suggestionsLayout?: 'inline' | 'overlay' | 'below';
  /** Sits at the start of the field row, inside `containerStyle`. */
  leading?: React.ReactNode;
  /** Sits under the field, still inside `containerStyle`. */
  fieldFooter?: React.ReactNode;
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

interface ActiveHashtag {
  start: number;
  tag: string;
  cursor: number;
}

function sameHashtag(a: ActiveHashtag | null, b: ActiveHashtag | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.start === b.start && a.tag === b.tag && a.cursor === b.cursor;
}

function queryAt(text: string, cursor: number, mentions: readonly MentionSpan[]): ActiveQuery | null {
  if (mentions.length >= MENTION_LIMIT) return null;
  const active = activeMentionQuery(text, cursor);
  if (!active) return null;
  // That "@" already belongs to a picked name. Typing after it is not a new search.
  if (mentions.some((mention) => mention.start === active.start)) return null;
  return { start: active.start, query: active.query, cursor };
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
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

export const MentionInput = forwardRef<TextInputInstance, MentionInputProps>(function MentionInput(
  {
    value,
    onChangeText,
    onMentionsChange,
    onSelectionChange,
    onFocus,
    onBlur,
    containerStyle,
    suggestionsLayout = 'inline',
    leading,
    fieldFooter,
    style,
    editable = true,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const inputRef = useRef<TextInputInstance>(null);
  const hostRef = useRef<ViewInstance>(null);
  const valueRef = useRef(value);
  const mentionsRef = useRef<MentionSpan[]>([]);
  const cursorRef = useRef(value.length);
  const onMentionsChangeRef = useRef(onMentionsChange);
  const requestRef = useRef(0);
  const hashtagRequestRef = useRef(0);
  const choosingRef = useRef(false);
  const ignoreSelectionUntil = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mentions, setMentions] = useState<MentionSpan[]>([]);
  const [active, setActive] = useState<ActiveQuery | null>(null);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [hashtag, setHashtag] = useState<ActiveHashtag | null>(null);
  const [hashtagRows, setHashtagRows] = useState<HashtagSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [pinnedCaret, setPinnedCaret] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [keyboardH, setKeyboardH] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  onMentionsChangeRef.current = onMentionsChange;
  const activeRef = useRef(active);
  activeRef.current = active;
  const hashtagRef = useRef(hashtag);
  hashtagRef.current = hashtag;

  const setRef = (node: TextInputInstance | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const publishQuery = (text: string, cursor: number, nextMentions: readonly MentionSpan[]) => {
    const next = editable === false ? null : queryAt(text, cursor, nextMentions);
    setActive((current) => (sameQuery(current, next) ? current : next));
    // A person query wins. A hashtag is only searched when no "@" is active.
    const found = editable === false || next ? null : activeHashtagQuery(text, cursor);
    const hash = found ? { start: found.start, tag: found.tag, cursor } : null;
    setHashtag((current) => (sameHashtag(current, hash) ? current : hash));
  };

  const remember = (nextMentions: MentionSpan[]) => {
    mentionsRef.current = nextMentions;
    setMentions(nextMentions);
    onMentionsChangeRef.current?.(nextMentions);
  };

  const measureHost = useCallback(() => {
    hostRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      const next = {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      };
      setAnchor((current) =>
        current &&
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    });
  }, []);

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
    hashtagRequestRef.current += 1;
    setHashtag(null);
    setHashtagRows([]);
  }, [editable]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardH(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const generation = ++requestRef.current;
    if (!active) {
      setSuggestions([]);
      return;
    }
    const query = active.query;
    const timer = setTimeout(() => {
      mentionSuggestions(query)
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

  useEffect(() => {
    const generation = ++hashtagRequestRef.current;
    setHashtagRows([]);
    if (!hashtag || !focused) return;
    const prefix = hashtag.tag;
    const timer = setTimeout(() => {
      hashtagSuggestions(prefix)
        .then((rows) => {
          if (hashtagRequestRef.current !== generation) return;
          setHashtagRows(rows);
        })
        .catch(() => {
          if (hashtagRequestRef.current !== generation) return;
          setHashtagRows([]);
        });
    }, HASHTAG_SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hashtag, focused]);

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

  const handleSelection = (event: TextInputSelectionChangeEvent) => {
    if (Date.now() < ignoreSelectionUntil.current) return;
    const selection = event.nativeEvent.selection;
    if (pinnedCaret != null && (selection.start !== pinnedCaret || selection.end !== pinnedCaret)) {
      setPinnedCaret(null);
    }
    cursorRef.current = selection.end;
    publishQuery(valueRef.current, selection.end, mentionsRef.current);
    onSelectionChange?.(event);
  };

  const choose = (person: MentionSuggestion) => {
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
      inputRef.current?.setSelection(result.cursor, result.cursor);
      choosingRef.current = false;
    });
  };

  const pickHashtag = (tag: string) => {
    if (choosingRef.current) return;
    const current = hashtagRef.current;
    if (!current) return;
    const result = applyHashtag(valueRef.current, current.start, current.cursor, tag);
    choosingRef.current = true;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    handleChange(result.text);
    cursorRef.current = result.cursor;
    ignoreSelectionUntil.current = Date.now() + 200;
    setPinnedCaret(result.cursor);
    setHashtag(null);
    hashtagRequestRef.current += 1;
    setHashtagRows([]);
    setFocused(true);
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      inputRef.current?.setSelection(result.cursor, result.cursor);
      choosingRef.current = false;
    });
  };

  const flat = StyleSheet.flatten(style) ?? {};
  const {
    margin: _margin,
    marginTop: _marginTop,
    marginBottom: _marginBottom,
    marginLeft: _marginLeft,
    marginRight: _marginRight,
    marginHorizontal: _marginHorizontal,
    marginVertical: _marginVertical,
    ...inputStyle
  }: TextStyle = flat;
  const marginStyle: ViewStyle = {
    margin: flat.margin,
    marginTop: flat.marginTop,
    marginBottom: flat.marginBottom,
    marginLeft: flat.marginLeft,
    marginRight: flat.marginRight,
    marginHorizontal: flat.marginHorizontal,
    marginVertical: flat.marginVertical,
  };
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
  const people = suggestions
    .filter((person) => (person.full_name?.trim() ?? '').length > 0)
    .slice(0, SUGGESTION_LIMIT);
  const showPeople = focused && people.length > 0;
  const showHashtags = focused && !active && people.length === 0 && hashtagRows.length > 0;
  const showPanel = showPeople || showHashtags;

  useEffect(() => {
    if (!showPanel || suggestionsLayout === 'inline') return;
    const frame = requestAnimationFrame(measureHost);
    return () => cancelAnimationFrame(frame);
  }, [showPanel, suggestionsLayout, keyboardH, screenH, measureHost]);

  // The list grows with its rows and stops at about seven. The title sits above that.
  const titleBlock = spacing.sm + TITLE_ICON + spacing.sm;
  const listCap =
    SUGGESTION_ROW_HEIGHT * SUGGESTION_VISIBLE_ROWS +
    StyleSheet.hairlineWidth * (SUGGESTION_VISIBLE_ROWS - 1);
  let ceiling = titleBlock + listCap;
  // The edge against the field is square. The outer corners are rounded, and
  // start/end radii flip in Arabic. The shadow sits on that outer edge.
  const meetsBelow = suggestionsLayout === 'below';
  let panelStyle: ViewStyle = { marginBottom: 0 };

  if (suggestionsLayout === 'overlay') {
    panelStyle = {
      position: 'absolute',
      left: anchor ? -anchor.x : 0,
      ...(anchor ? { width: screenW } : { right: 0 }),
      bottom: '100%',
      zIndex: 40,
    };
    if (anchor) {
      const base = screenH * COMMENTS_SHEET_FRACTION;
      const maxH =
        keyboardH > 0 ? Math.min(base, screenH - keyboardH - insets.top - spacing.md) : base;
      const sheetTop = (keyboardH > 0 ? screenH - keyboardH : screenH) - maxH;
      const coverTop = sheetTop + COMMENTS_SHEET_CHROME;
      const coverHeight = anchor.y - coverTop;
      if (coverHeight > SUGGESTION_ROW_HEIGHT) ceiling = Math.min(ceiling, coverHeight);
    }
  } else if (suggestionsLayout === 'below' && anchor) {
    const reserved = BELOW_FOOTER + (keyboardH > 0 ? 0 : insets.bottom);
    const spaceBelow = screenH - keyboardH - reserved - (anchor.y + anchor.height);
    if (spaceBelow > SUGGESTION_ROW_HEIGHT) {
      ceiling = Math.min(ceiling, spaceBelow);
      panelStyle = {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '100%',
        zIndex: 20,
      };
    } else {
      panelStyle = { marginTop: spacing.sm };
    }
  } else if (suggestionsLayout === 'below') {
    panelStyle = { marginTop: spacing.sm };
  }

  const listMaxHeight = Math.max(0, ceiling - titleBlock);
  const rowCount = showPeople ? people.length : hashtagRows.length;
  const contentHeight =
    rowCount * SUGGESTION_ROW_HEIGHT + Math.max(0, rowCount - 1) * StyleSheet.hairlineWidth;
  const listHeight = Math.min(contentHeight, listMaxHeight);
  const lift = theme.elevation(3);
  const liftDown = 'shadowOffset' in lift && lift.shadowOffset ? lift.shadowOffset.height : 3;
  const shadow = meetsBelow
    ? lift
    : { ...lift, shadowOffset: { width: 0, height: -Math.abs(liftDown) } };
  const radius = theme.radii.xl;
  const corners: ViewStyle = meetsBelow
    ? {
        borderTopStartRadius: 0,
        borderTopEndRadius: 0,
        borderBottomStartRadius: radius,
        borderBottomEndRadius: radius,
      }
    : {
        borderTopStartRadius: radius,
        borderTopEndRadius: radius,
        borderBottomStartRadius: 0,
        borderBottomEndRadius: 0,
      };
  const queryText = showPeople ? (active?.query ?? '') : (hashtag?.tag ?? '');

  const panel = showPanel ? (
    <View
      testID={showPeople ? 'mention-suggestions' : 'hashtag-suggestions'}
      style={[
        panelStyle,
        shadow,
        corners,
        {
          maxHeight: ceiling,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[{ overflow: 'hidden' }, corners]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{
              width: TITLE_ICON,
              height: TITLE_ICON,
              borderRadius: theme.radii.pill,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPeople ? (
              <AtSign size={13} color={colors.textOnBrand} strokeWidth={2.5} />
            ) : (
              <Hash size={13} color={colors.textOnBrand} strokeWidth={2.5} />
            )}
          </View>
          <Text variant="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {showPeople ? t('feed.mentionPanelTitle') : t('feed.hashtagPanelTitle')}
          </Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={{ height: listHeight, flexGrow: 0 }}
          showsVerticalScrollIndicator
        >
          {showPeople
            ? people.map((person, index) => {
                const name = person.full_name?.trim() ?? '';
                const role = roleLabel(person.role);
                const detail = person.following ? `${role} · ${t('feed.mentionFollowing')}` : role;
                return (
                  <View key={person.id}>
                    {index > 0 ? (
                      <View
                        style={{
                          height: StyleSheet.hairlineWidth,
                          backgroundColor: colors.divider,
                          marginStart: spacing.md + AVATAR_MD + spacing.md,
                          marginEnd: spacing.md,
                        }}
                      />
                    ) : null}
                    <Pressable
                      onPressIn={() => choose(person)}
                      accessibilityRole="button"
                      accessibilityLabel={person.following ? `${name}, ${detail}` : `${name}, ${role}`}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        minHeight: SUGGESTION_ROW_HEIGHT,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                      })}
                    >
                      <Avatar uri={person.avatar_url} name={name} size="md" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MatchText text={name} query={queryText} style={{ flexShrink: 1 }} />
                          {person.is_verified ? (
                            <BadgeCheck
                              size={16}
                              color={colors.info}
                              fill={theme.alpha(colors.info, 0.16)}
                            />
                          ) : null}
                        </View>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {detail}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })
            : (
              <HashtagSuggestions
                suggestions={hashtagRows}
                query={queryText}
                onPick={pickHashtag}
              />
            )}
        </ScrollView>
      </View>
    </View>
  ) : null;

  const field = (
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
        onFocus={(event) => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          // A tap on a row blurs the field first. Wait so that tap can land,
          // then hide the list if focus did not come back.
          blurTimer.current = setTimeout(() => setFocused(false), HASHTAG_SEARCH_DELAY_MS);
          onBlur?.(event);
        }}
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
  );

  return (
    <View
      ref={hostRef}
      collapsable={false}
      onLayout={suggestionsLayout === 'inline' ? undefined : measureHost}
      style={[
        marginStyle,
        showPanel && suggestionsLayout !== 'inline' ? { zIndex: 30 } : null,
      ]}
    >
      {suggestionsLayout === 'below' ? null : panel}

      <View style={containerStyle}>
        {leading}
        <View style={leading || fieldFooter ? { flex: 1 } : undefined}>
          {field}
          {fieldFooter}
        </View>
      </View>

      {suggestionsLayout === 'below' ? panel : null}
    </View>
  );
});

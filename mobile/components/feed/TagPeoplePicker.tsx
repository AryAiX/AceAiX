import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Input, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { mentionCandidates, type MentionCandidate } from '@/lib/api';
import type { TaggedPerson } from '@/lib/api.postTags';
import { displayName, roleLabel } from '@/lib/format';

/**
 * The people picker the composer and a post's author share.
 *
 * Search uses the same mention list the caption does, so who can be tagged
 * follows the same server rule. A tick adds or removes. Twenty is the limit.
 */

export const TAG_LIMIT = 20;
const SEARCH_DELAY_MS = 250;

function asTagged(row: MentionCandidate): TaggedPerson {
  return {
    id: row.id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    is_verified: row.is_verified,
    role: row.role,
  };
}

export function TagPeoplePicker({
  visible,
  people,
  onChange,
  onClose,
  onDone,
  disabled = false,
}: {
  visible: boolean;
  people: TaggedPerson[];
  onChange: (next: TaggedPerson[]) => void;
  onClose: () => void;
  /** Saves. When omitted, Done only closes the sheet. */
  onDone?: (people: TaggedPerson[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MentionCandidate[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) return;
    setQuery('');
    setResults([]);
    setSearching(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      mentionCandidates(term)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible]);

  const chosen = new Set(people.map((person) => person.id));
  const atLimit = people.length >= TAG_LIMIT;
  const extras = results.filter((row) => !chosen.has(row.id));

  const toggle = (person: TaggedPerson) => {
    if (disabled) return;
    if (chosen.has(person.id)) {
      onChange(people.filter((item) => item.id !== person.id));
      return;
    }
    if (atLimit) return;
    onChange([...people, person]);
  };

  const row = (person: TaggedPerson) => {
    const on = chosen.has(person.id);
    const name = displayName(person.full_name);
    return (
      <Pressable
        key={person.id}
        onPress={() => toggle(person)}
        disabled={disabled || (!on && atLimit)}
        accessibilityRole="button"
        accessibilityState={{ selected: on, disabled: disabled || (!on && atLimit) }}
        accessibilityLabel={name}
        testID={`tag-person-${person.id}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Avatar uri={person.avatar_url} name={person.full_name} size="sm" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          {person.role ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {roleLabel(person.role)}
            </Text>
          ) : null}
        </View>
        {on ? <Check size={18} color={colors.primary} /> : null}
      </Pressable>
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('feed.tagPeople')}
      dismissable={!disabled}
      testID="tag-people-sheet"
      footer={
        <Button
          label={t('common.done')}
          fullWidth
          loading={disabled}
          disabled={disabled}
          onPress={() => {
            if (onDone) void onDone(people);
            else onClose();
          }}
          testID="tag-people-done"
        />
      }
    >
      <View style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('feed.tagPeopleSearch')}
          accessibilityLabel={t('feed.tagPeopleSearch')}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          testID="tag-people-search"
        />
        {atLimit ? (
          <Text variant="caption" tone="muted">
            {t('feed.tagPeopleLimit')}
          </Text>
        ) : null}
        {people.length === 0 && query.trim().length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('feed.tagPeopleHint')}
          </Text>
        ) : null}
        {people.map(row)}
        {extras.map((item) => row(asTagged(item)))}
        {query.trim().length > 0 && !searching && results.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('feed.tagPeopleNone')}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

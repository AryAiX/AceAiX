import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Divider, EmptyState, Input, ListItem, Loader, Sheet, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { searchPeople } from '@/lib/api';
import { displayName, roleLabel } from '@/lib/format';
import type { PersonResult } from '@/types/models';

const DEBOUNCE = 300;

/**
 * Find someone on AceAiX to link to a squad line. Uses the app's people search,
 * so a minor shows up only once a guardian has made them discoverable.
 */
export function PersonPicker({
  visible,
  onClose,
  onPick,
  role,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (person: PersonResult) => void;
  role?: 'athlete' | 'coach';
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setTerm(query.trim()), DEBOUNCE);
    return () => clearTimeout(id);
  }, [query]);

  const results = useAsync(() => searchPeople(term, role, 20), [term, role], {
    enabled: visible && term.length >= 2,
  });
  const rows = term.length >= 2 ? (results.data ?? []) : [];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('clubManage.member.findTitle')}
      subtitle={t('clubManage.member.findSubtitle')}
    >
      <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('clubManage.member.findPlaceholder')}
          autoCorrect={false}
          autoCapitalize="none"
          icon={<Search size={18} color={colors.textMuted} />}
          testID="club-person-search"
        />
        {term.length < 2 ? (
          <Text variant="caption" tone="muted">
            {t('clubManage.member.findHint')}
          </Text>
        ) : results.loading ? (
          <Loader />
        ) : results.error ? (
          <Text variant="caption" tone="danger">
            {results.error}
          </Text>
        ) : rows.length === 0 ? (
          <EmptyState compact title={t('clubManage.member.findNone')} />
        ) : (
          <View>
            {rows.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Divider /> : null}
                <ListItem
                  title={displayName(p.full_name)}
                  subtitle={[roleLabel(p.role), sportLabel(t, p.sport), p.city].filter(Boolean).join(' · ')}
                  left={<Avatar uri={p.avatar_url} name={p.full_name} size="sm" verified={p.is_verified} />}
                  onPress={() => onPick(p)}
                  testID={`club-person-${p.id}`}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}

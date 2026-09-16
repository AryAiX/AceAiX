import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Clock, Search, SearchX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Chip,
  EmptyState,
  ErrorState,
  Input,
  ListItem,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
} from '@/components/ui';
import { AthleteCard } from '@/components/discover/AthleteCard';
import { ClubCard } from '@/components/discover/ClubCard';
import { CoachRow } from '@/components/discover/CoachRow';
import { NO_CRITERIA } from '@/components/discover/MatchBadge';
import { SPORTS, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { discoverAthletes, searchOrganizations } from '@/lib/api';
import { listCoaches } from '@/lib/api.discover';
import { Routes } from '@/lib/routes';
import type { DiscoveredAthlete, Organization, PersonResult } from '@/types/models';

type Scope = 'athletes' | 'coaches' | 'clubs';

const SCOPES: { value: Scope; labelKey: string }[] = [
  { value: 'athletes', labelKey: 'discover.tabAthletes' },
  { value: 'coaches', labelKey: 'discover.tabCoaches' },
  { value: 'clubs', labelKey: 'discover.tabClubs' },
];

const RECENTS_KEY = 'aceaix.recent-searches';
const MAX_RECENTS = 8;
const DEBOUNCE_MS = 300;
const SUGGESTED_SPORTS = SPORTS.slice(0, 6);

/* Results carry the term that produced them. Without it the previous term's
   rows sit on screen, unlabelled, for the length of the next request. */
interface Page<T> {
  term: string;
  rows: T[];
}

/* AsyncStorage throws in a few real contexts (private browsing on web, a
   corrupted store). Recent searches are a convenience — never a failure. */
async function readRecents(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

async function writeRecents(terms: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(terms));
  } catch {
    /* the search still works, it just will not be remembered */
  }
}

export default function SearchScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const router = useRouter();

  const [scope, setScope] = useState<Scope>('athletes');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    readRecents().then((list) => {
      if (!cancelled) setRecents(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const remember = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecents((current) => {
      const next = [clean, ...current.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        MAX_RECENTS,
      );
      writeRecents(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeRecents([]);
  }, []);

  const active = debounced.length > 0;

  const athletes = useAsync<Page<DiscoveredAthlete>>(
    async () => ({
      term: debounced,
      rows: await discoverAthletes({ query: debounced, sort: 'match' }, 0, 20),
    }),
    [debounced],
    { enabled: active && scope === 'athletes' },
  );
  const coaches = useAsync<Page<PersonResult>>(
    async () => ({ term: debounced, rows: await listCoaches(debounced, 20) }),
    [debounced],
    { enabled: active && scope === 'coaches' },
  );
  const clubs = useAsync<Page<Organization>>(
    async () => ({ term: debounced, rows: await searchOrganizations(debounced, 20) }),
    [debounced],
    { enabled: active && scope === 'clubs' },
  );

  const source = scope === 'athletes' ? athletes : scope === 'coaches' ? coaches : clubs;
  const settled = source.data?.term === debounced;
  const busy = !source.error && (source.loading || !settled);

  const listStyle = {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.giant,
    gap: spacing.md,
  };

  const emptyResults = (
    <EmptyState
      icon={<SearchX size={26} color={colors.textMuted} />}
      title={t('discover.search.emptyTitle', { term: debounced })}
      body={t('discover.search.emptyBody')}
      actionLabel={t('discover.search.clearSearch')}
      onAction={() => setQuery('')}
    />
  );

  function renderResults() {
    if (busy) {
      return (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SkeletonList count={4} variant="row" />
        </View>
      );
    }
    if (source.error) return <ErrorState message={source.error} onRetry={source.reload} />;

    if (scope === 'athletes') {
      return (
        <FlatList<DiscoveredAthlete>
          style={{ flex: 1 }}
          data={athletes.data?.rows ?? []}
          keyExtractor={(item) => item.athlete_id}
          contentContainerStyle={listStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            // A free-text search sets no criteria, so there is no honest match
            // percentage to show — only the talent score.
            <AthleteCard athlete={item} criteria={NO_CRITERIA} />
          )}
          ListEmptyComponent={emptyResults}
        />
      );
    }

    if (scope === 'coaches') {
      return (
        <FlatList<PersonResult>
          style={{ flex: 1 }}
          data={coaches.data?.rows ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ ...listStyle, gap: spacing.sm }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => <CoachRow person={item} />}
          ListEmptyComponent={emptyResults}
        />
      );
    }

    return (
      <FlatList<Organization>
        style={{ flex: 1 }}
        data={clubs.data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ ...listStyle, gap: spacing.sm }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => <ClubCard organization={item} />}
        ListEmptyComponent={emptyResults}
      />
    );
  }

  const startState = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.giant,
        gap: spacing.xl,
      }}
    >
      {recents.length > 0 ? (
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.xs,
            }}
          >
            <Text variant="overline" tone="muted">
              {t('discover.search.recent')}
            </Text>
            <Pressable
              onPress={clearRecents}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('discover.search.clearRecentsA11y')}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: spacing.sm })}
            >
              <Text variant="captionStrong" tone="primary">
                {t('common.clear')}
              </Text>
            </Pressable>
          </View>
          {recents.map((term) => (
            <ListItem
              key={term}
              title={term}
              showChevron={false}
              left={<Clock size={18} color={colors.textMuted} />}
              onPress={() => {
                setQuery(term);
                remember(term);
              }}
            />
          ))}
        </View>
      ) : null}

      <View>
        <Text variant="overline" tone="muted" style={{ marginBottom: spacing.md }}>
          {t('discover.search.trySport')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {SUGGESTED_SPORTS.map((sport) => (
            <Chip
              key={sport.key}
              label={sportLabel(t, sport.key)}
              icon={<Text variant="caption">{sport.emoji}</Text>}
              onPress={() => {
                setScope('athletes');
                /* The search term goes to the database, which stores sports in
                   English — only the chip's label is translated. */
                setQuery(sport.label);
                remember(sport.label);
              }}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Screen scroll={false} padded={false} keyboardAvoiding testID="search-screen">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(Routes.home))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('discover.search.back')}
          style={({ pressed }) => ({
            width: theme.hit.min,
            height: theme.hit.min,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>

        <Input
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          onSubmitEditing={() => remember(query)}
          placeholder={t('discover.search.fieldPlaceholder')}
          accessibilityLabel={t('discover.search.fieldA11y')}
          icon={<Search size={18} color={colors.textMuted} />}
          containerStyle={{ flex: 1 }}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <SegmentedControl<Scope>
          options={SCOPES.map((entry) => ({ value: entry.value, label: t(entry.labelKey) }))}
          value={scope}
          onChange={setScope}
          testID="search-scope"
        />
      </View>

      {active ? renderResults() : startState}
    </Screen>
  );
}

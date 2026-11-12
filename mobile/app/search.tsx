import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clock, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { LogoColors } from '@/theme/tokens';
import { Chip, Input, ListItem, Screen, Text, TextTabs, ChevronBack } from '@/components/ui';
import { AllResults } from '@/components/search/AllResults';
import { PeopleResults, type PeopleKind } from '@/components/search/PeopleResults';
import { PostResults } from '@/components/search/PostResults';
import { SPORTS, englishSportTerm, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { fold } from '@/lib/searchRank';
import { Routes } from '@/lib/routes';
import type { DiscoveryFilters } from '@/types/models';

/* All, then the two kinds worth a full list of their own. Everything else
   (clubs, trials, challenges, meetups, sponsors) shows on All with a
   "See all" into its own page. */
type Tab = 'all' | 'people' | 'posts';

/** `useLocalSearchParams` may hand a string or a one-element list. */
function firstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.find((item) => typeof item === 'string');
  return undefined;
}

function isSearchTab(value: string | undefined): value is Tab {
  return value === 'all' || value === 'people' || value === 'posts';
}

const RECENTS_KEY = 'aceaix.recent-searches';
const MAX_RECENTS = 8;
const DEBOUNCE_MS = 300;
const SUGGESTED_SPORTS = SPORTS.slice(0, 6);

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
  const params = useLocalSearchParams<{ q?: string | string[]; tab?: string | string[] }>();
  /* A hashtag tap opens this screen with the tag and the Posts tab already
     set. The debounced word starts as that query, so results do not wait.
     With neither param, this is the same empty search as before. */
  const openingQuery = firstParam(params.q) ?? '';
  const openingTab = firstParam(params.tab);

  const [tab, setTab] = useState<Tab>(isSearchTab(openingTab) ? openingTab : 'all');
  const [query, setQuery] = useState(openingQuery);
  const [debounced, setDebounced] = useState(openingQuery.trim());
  const [recents, setRecents] = useState<string[]>([]);
  const [peopleKind, setPeopleKind] = useState<PeopleKind>('athletes');
  const [peopleFilters, setPeopleFilters] = useState<DiscoveryFilters>({});

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

  /* A new word starts from All with no leftover filters. */
  useEffect(() => {
    setPeopleFilters({});
  }, [debounced]);

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
  /* Sports are stored in English, so a translated sport name is turned back
     only for the lookups; the box keeps what was typed. */
  const queryForSearch = englishSportTerm(t, debounced);
  const sportKey = useMemo(() => {
    const word = fold(debounced);
    if (!word) return null;
    const hit = SPORTS.find(
      (s) => fold(s.key) === word || fold(s.label) === word || fold(sportLabel(t, s.key)) === word,
    );
    return hit ? hit.key : null;
  }, [debounced, t]);

  const endPadding = spacing.giant;
  const opened = () => remember(query);

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
                setTab('all');
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
              tone="accent"
              key={sport.key}
              label={sportLabel(t, sport.key)}
              icon={<Text variant="caption">{sport.emoji}</Text>}
              onPress={() => {
                const label = sportLabel(t, sport.key);
                setTab('all');
                setQuery(label);
                remember(label);
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
          <ChevronBack size={24} color={colors.text} />
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

      {active ? (
        <>
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
            <TextTabs<Tab>
              options={[
                { value: 'all', label: t('discover.search.tabAll') },
                { value: 'people', label: t('discover.search.tabPeople') },
                { value: 'posts', label: t('discover.search.tabPosts') },
              ]}
              value={tab}
              onChange={setTab}
              color={LogoColors.flame}
              testID="search-tabs"
            />
          </View>
          {tab === 'all' ? (
            <AllResults
              term={debounced}
              queryForSearch={queryForSearch}
              sportKey={sportKey}
              onSeePeople={() => {
                remember(query);
                setPeopleKind('athletes');
                setTab('people');
              }}
              onSeePosts={() => {
                remember(query);
                setTab('posts');
              }}
              onOpen={opened}
              endPadding={endPadding}
            />
          ) : tab === 'people' ? (
            <View style={{ flex: 1, paddingTop: spacing.md }}>
              <PeopleResults
                term={debounced}
                queryForSearch={queryForSearch}
                sportKey={sportKey}
                kind={peopleKind}
                onKind={setPeopleKind}
                filters={peopleFilters}
                onFilters={setPeopleFilters}
                onOpen={opened}
                endPadding={endPadding}
              />
            </View>
          ) : (
            <View style={{ flex: 1, paddingTop: spacing.md }}>
              <PostResults term={debounced} onOpen={opened} endPadding={endPadding} />
            </View>
          )}
        </>
      ) : (
        startState
      )}
    </Screen>
  );
}

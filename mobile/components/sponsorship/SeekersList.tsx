import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { HandCoins, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, EmptyState, ErrorState, Input, Reveal, SkeletonList, Text } from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { SPORTS, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSeekers, type Seeker } from '@/lib/api.sponsorship';
import { displayName } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { SeekerCard } from './SeekerCard';
import { OfferSheet } from './Sheets';

const DEBOUNCE_MS = 300;

/**
 * Discover, for a sponsor: athletes who have asked for backing.
 *
 * An unverified sponsor can read the list — it is how they decide the app is
 * worth verifying for — but sees no amounts and cannot make an offer.
 */
export function SeekersList() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const verified = profile?.is_verified === true;

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [offerTo, setOfferTo] = useState<Seeker | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const seekers = useAsync(() => getSeekers({ sport, query: debounced }), [sport, debounced], {
    refetchOnFocus: true,
  });
  const openProfile = useCallback((id: string) => router.push(Routes.profile(id)), [router]);
  const rows = seekers.data ?? [];

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t('sponsorship.seekersSearch')}
        accessibilityLabel={t('sponsorship.seekersSearch')}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        icon={<Search size={18} color={colors.textMuted} />}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
        style={{ marginHorizontal: -spacing.lg }}
        contentInset={{ left: spacing.lg, right: spacing.lg }}
      >
        <View style={{ width: spacing.lg - spacing.sm }} />
        <Chip label={t('sponsorship.anySport')} selected={!sport} onPress={() => setSport(null)} />
        {SPORTS.map((s) => (
          <Chip
            key={s.key}
            label={sportLabel(t, s.key)}
            icon={<Text variant="caption">{s.emoji}</Text>}
            selected={sport === s.key}
            onPress={() => setSport((cur) => (cur === s.key ? null : s.key))}
          />
        ))}
        <View style={{ width: spacing.lg - spacing.sm }} />
      </ScrollView>
      {!verified ? (
        <InfoNote
          tone="warning"
          icon="warning"
          actionLabel={t('sponsorship.requestVerification')}
          onAction={() => router.push(Routes.settingsAccount)}
        >
          {t('sponsorship.notVerifiedBody')}
        </InfoNote>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }} testID="seekers-list">
      <FlatList
        data={seekers.loading && !seekers.data ? [] : rows}
        keyExtractor={(row) => row.request_id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.giant, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={seekers.refreshing}
            onRefresh={seekers.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item, index }) => (
          <Reveal index={index}>
            <SeekerCard seeker={item} onOffer={verified ? setOfferTo : undefined} onOpenProfile={openProfile} />
          </Reveal>
        )}
        ListEmptyComponent={
          seekers.loading ? (
            <SkeletonList count={3} variant="card" />
          ) : seekers.error ? (
            <ErrorState message={seekers.error} onRetry={seekers.reload} compact />
          ) : (
            <EmptyState
              icon={<HandCoins size={26} color={colors.textMuted} />}
              title={t('sponsorship.seekersEmpty')}
              body={t('sponsorship.seekersEmptyBody')}
            />
          )
        }
      />
      <OfferSheet
        target={
          offerTo
            ? {
                requestId: offerTo.request_id,
                name: displayName(offerTo.full_name),
                currency: offerTo.currency,
                amount: offerTo.amount,
              }
            : null
        }
        onClose={() => setOfferTo(null)}
        onSent={() => {
          setOfferTo(null);
          seekers.reload();
        }}
      />
    </View>
  );
}

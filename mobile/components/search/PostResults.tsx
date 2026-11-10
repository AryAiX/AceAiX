import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { Grid3x3 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { MediaGrid } from '@/components/profile/MediaGrid';
import { useT } from '@/i18n';
import { POST_PAGE, searchPosts, type PostHit } from '@/lib/api.search';
import { errorMessage } from '@/lib/errors';
import { truncate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { posterOf } from '@/lib/mediaUrl';

interface Props {
  term: string;
  onOpen: () => void;
  endPadding: number;
}

/** Every post whose words or #tags match, newest first, more as you scroll. */
export function PostResults({ term, onOpen, endPadding }: Props) {
  const { colors, spacing } = useTheme();
  const t = useT();
  const router = useRouter();

  const [rows, setRows] = useState<PostHit[]>([]);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const batch = await searchPosts(term, nextPage);
        setRows((current) => (reset ? batch : [...current, ...batch]));
        setPage(nextPage);
        setDone(batch.length < POST_PAGE);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [term],
  );

  useEffect(() => {
    setRows([]);
    setDone(false);
    void load(0, true);
  }, [load]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 400;
    if (nearEnd && !loading && !done && rows.length > 0) void load(page + 1, false);
  };

  if (rows.length === 0) {
    return (
      <View style={{ paddingHorizontal: spacing.lg }}>
        {error ? (
          <ErrorState message={error} onRetry={() => void load(0, true)} />
        ) : loading ? (
          <SkeletonList count={3} variant="row" />
        ) : (
          <EmptyState
            icon={<Grid3x3 size={26} color={colors.textMuted} />}
            title={t('discover.search.emptyTitle', { term })}
            body={t('discover.search.emptyBodyPosts')}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      onScroll={onScroll}
      scrollEventThrottle={200}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: endPadding }}
      testID="search-posts"
    >
      <MediaGrid
        tiles={rows.map((post) => ({
          id: post.id,
          uri: posterOf(post.media?.[0]),
          isVideo: post.media?.[0]?.type === 'video',
          caption: post.caption ? truncate(post.caption, 60) : null,
        }))}
        onPressTile={(id) => {
          onOpen();
          router.push(Routes.post(id));
        }}
      />
      {loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} /> : null}
    </ScrollView>
  );
}

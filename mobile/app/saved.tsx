import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ErrorState,
  Header,
  Screen,
  Sheet,
  SkeletonList,
  Text,
  TextTabs,
  useToast,
} from '@/components/ui';
import { SavedRow } from '@/components/saved/SavedRow';
import { NewPlaybookTile, PlaybookCover } from '@/components/saved/PlaybookCover';
import { NewPlaybookForm, PlaybookSheet } from '@/components/saved/PlaybookSheet';
import { groupedRowStyle } from '@/components/discover/groupedRow';
import { opportunityTypeLabel, sportConfig, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSavedPosts, toggleSave, toggleSaveOpportunity } from '@/lib/api';
import { savedOpportunities } from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { displayName, fullDate, metaLine, relativeTime } from '@/lib/format';
import { removeFromAllPlaybooks, usePlaybooks, type PlaybookItem } from '@/lib/playbooks';
import { Routes } from '@/lib/routes';
import { unsaveCall, useSavedCalls, type SavedCall } from '@/lib/savedCalls';
import { useAuth } from '@/providers/AuthProvider';
import type { Opportunity, SavedPost } from '@/types/models';

type Tab = 'all' | 'posts' | 'trials' | 'sponsors';

/* Saved posts come a page at a time from the server; one generous page is
   plenty for a list of what someone kept. */
const POSTS_LIMIT = 60;

function postThumb(post: SavedPost): string | null {
  const first = post.media[0];
  if (!first) return null;
  return first.type === 'video' ? (first.thumbnail ?? null) : first.url;
}

/**
 * Everything the athlete saved, in one place: their playbooks along the top,
 * then the posts and trials they bookmarked as compact rows. The bookmark on
 * a row unsaves it; pressing and holding a row adds it to a playbook.
 */
export default function SavedScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const playbooks = usePlaybooks(user?.id);
  const callRows = useSavedCalls(user?.id);

  const [tab, setTab] = useState<Tab>('all');
  const [creating, setCreating] = useState(false);
  const [sheetItem, setSheetItem] = useState<Omit<PlaybookItem, 'addedAt'> | null>(null);
  const [gonePosts, setGonePosts] = useState<Set<string>>(new Set());
  const [goneTrials, setGoneTrials] = useState<Set<string>>(new Set());

  const posts = useAsync<SavedPost[]>(() => getSavedPosts({ limit: POSTS_LIMIT }), [], {
    refetchOnFocus: true,
  });
  const trials = useAsync<Opportunity[]>(() => savedOpportunities(), [], { refetchOnFocus: true });

  const postRows = useMemo(
    () => (posts.data ?? []).filter((p) => !gonePosts.has(p.id)),
    [posts.data, gonePosts],
  );
  const trialRows = useMemo(
    () => (trials.data ?? []).filter((o) => !goneTrials.has(o.id)),
    [trials.data, goneTrials],
  );

  const refreshing = posts.refreshing || trials.refreshing;
  const refresh = useCallback(() => {
    setGonePosts(new Set());
    setGoneTrials(new Set());
    posts.refresh();
    trials.refresh();
  }, [posts, trials]);

  const unsavePost = async (post: SavedPost) => {
    setGonePosts((s) => new Set(s).add(post.id));
    try {
      await toggleSave(post.id);
      if (user) void removeFromAllPlaybooks(user.id, 'post', post.id);
    } catch (err) {
      setGonePosts((s) => {
        const next = new Set(s);
        next.delete(post.id);
        return next;
      });
      toast.error(errorMessage(err));
    }
  };

  const unsaveTrial = async (trial: Opportunity) => {
    setGoneTrials((s) => new Set(s).add(trial.id));
    try {
      await toggleSaveOpportunity(trial.id, true);
      if (user) void removeFromAllPlaybooks(user.id, 'trial', trial.id);
    } catch (err) {
      setGoneTrials((s) => {
        const next = new Set(s);
        next.delete(trial.id);
        return next;
      });
      toast.error(errorMessage(err));
    }
  };

  const unsaveSponsorCall = (call: SavedCall) => {
    if (!user) return;
    void unsaveCall(user.id, call.id);
    void removeFromAllPlaybooks(user.id, 'call', call.id);
  };

  const postItem = (post: SavedPost): Omit<PlaybookItem, 'addedAt'> => ({
    kind: 'post',
    id: post.id,
    title: displayName(post.author_name),
    subtitle: post.caption,
    thumb: postThumb(post),
  });
  const trialItem = (trial: Opportunity): Omit<PlaybookItem, 'addedAt'> => ({
    kind: 'trial',
    id: trial.id,
    title: trial.title,
    subtitle: trial.org_name,
    thumb: trial.org_logo,
  });

  const callItem = (call: SavedCall): Omit<PlaybookItem, 'addedAt'> => ({
    kind: 'call',
    id: call.id,
    title: call.brand,
    subtitle: call.title,
    thumb: call.avatar,
  });

  const radius = theme.radii.xl;
  const groupStyle = (i: number, n: number) => groupedRowStyle(i, n, colors, radius);

  const trialList = (
    <View>
      {trialRows.map((trial, i) => {
        const emoji = sportConfig(trial.sport)?.emoji;
        return (
          <SavedRow
            key={trial.id}
            kind="trial"
            seed={trial.id}
            title={trial.title}
            line={trial.org_name}
            thumb={trial.org_logo}
            tags={{
              type: opportunityTypeLabel(t, trial.type),
              sport: trial.sport ? `${emoji ?? ''} ${sportLabel(t, trial.sport)}`.trim() : null,
              deadline: trial.deadline,
            }}
            action="unsave"
            onPress={() => router.push(Routes.opportunity(trial.id))}
            onAction={() => void unsaveTrial(trial)}
            onLongPress={() => setSheetItem(trialItem(trial))}
            style={groupStyle(i, trialRows.length)}
          />
        );
      })}
    </View>
  );

  const postList = (
    <View>
      {postRows.map((post, i) => (
        <SavedRow
          key={post.id}
          kind="post"
          seed={post.author_id}
          title={displayName(post.author_name)}
          line={post.caption}
          thumb={postThumb(post)}
          meta={metaLine(t('feed.playbooks.kindPost'), t('feed.playbooks.savedAgo', { when: relativeTime(post.saved_at) }))}
          action="unsave"
          onPress={() => router.push(Routes.post(post.id))}
          onAction={() => void unsavePost(post)}
          onLongPress={() => setSheetItem(postItem(post))}
          style={groupStyle(i, postRows.length)}
        />
      ))}
    </View>
  );

  const callList = (
    <View>
      {callRows.map((call, i) => (
        <SavedRow
          key={call.id}
          kind="call"
          seed={call.id}
          title={call.brand}
          line={call.title}
          thumb={call.avatar}
          meta={metaLine(
            t('feed.playbooks.kindCall'),
            call.sport ? sportLabel(t, call.sport) : null,
            call.deadline ? t('sponsorship.deadline', { date: fullDate(call.deadline) }) : null,
          )}
          action="unsave"
          onPress={() => router.push(Routes.discoverSection('sponsors'))}
          onAction={() => unsaveSponsorCall(call)}
          onLongPress={() => setSheetItem(callItem(call))}
          style={groupStyle(i, callRows.length)}
        />
      ))}
    </View>
  );

  const loading = (posts.loading && !posts.data) || (trials.loading && !trials.data);
  const failed = (posts.error && !posts.data) || (trials.error && !trials.data);
  const total = postRows.length + trialRows.length + callRows.length;

  const sectionTitle = (label: string) => (
    <Text variant="heading" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {label}
    </Text>
  );

  const tabEmpty =
    total === 0 ||
    (tab === 'posts' && postRows.length === 0) ||
    (tab === 'trials' && trialRows.length === 0) ||
    (tab === 'sponsors' && callRows.length === 0);

  /* An empty tab: one small card under the tabs that says what belongs here
     and where to find it. */
  const empty =
    tab === 'posts'
      ? { title: t('feed.playbooks.emptyPostsTitle'), body: t('feed.playbooks.emptyPostsBody'), go: Routes.home }
      : tab === 'trials'
        ? { title: t('feed.playbooks.emptyTrialsTitle'), body: t('feed.playbooks.emptyTrialsBody'), go: Routes.opportunities }
        : tab === 'sponsors'
          ? {
              title: t('feed.playbooks.emptySponsorsTitle'),
              body: t('feed.playbooks.emptySponsorsBody'),
              go: Routes.discoverSection('sponsors'),
            }
          : { title: t('feed.savedEmptyTitle'), body: t('feed.playbooks.emptyBody'), go: null };
  const emptyGo = empty.go;
  const emptyCard = (
    <View
      testID="saved-empty"
      style={[
        {
          marginTop: spacing.md,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: theme.radii.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        theme.raised('card'),
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.alpha(colors.primary, 0.1),
        }}
      >
        <Bookmark size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{empty.title}</Text>
        <Text variant="caption" tone="secondary">
          {empty.body}
        </Text>
        {emptyGo ? (
          <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
            <Button
              label={t('feed.playbooks.browse')}
              size="sm"
              variant="soft"
              onPress={() => router.push(emptyGo)}
              testID="saved-empty-browse"
            />
          </View>
        ) : (
          /* Nothing saved at all: one small link to where each kind lives. */
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              label={t('feed.playbooks.posts')}
              size="sm"
              variant="soft"
              onPress={() => router.push(Routes.home)}
              testID="saved-empty-posts"
            />
            <Button
              label={t('feed.playbooks.trials')}
              size="sm"
              variant="soft"
              onPress={() => router.push(Routes.opportunities)}
              testID="saved-empty-trials"
            />
            <Button
              label={t('feed.playbooks.sponsors')}
              size="sm"
              variant="soft"
              onPress={() => router.push(Routes.discoverSection('sponsors'))}
              testID="saved-empty-sponsors"
            />
          </View>
        )}
      </View>
    </View>
  );

  let body: React.ReactNode;
  if (loading) body = <SkeletonList count={4} variant="row" />;
  else if (failed)
    body = <ErrorState message={posts.error ?? trials.error ?? ''} onRetry={refresh} />;
  else if (tabEmpty) body = emptyCard;
  else if (tab === 'posts') body = <View style={{ marginTop: spacing.md }}>{postList}</View>;
  else if (tab === 'trials') body = <View style={{ marginTop: spacing.md }}>{trialList}</View>;
  else if (tab === 'sponsors') body = <View style={{ marginTop: spacing.md }}>{callList}</View>;
  else
    body = (
      <>
        {trialRows.length > 0 ? (
          <>
            {sectionTitle(t('feed.playbooks.trials'))}
            {trialList}
          </>
        ) : null}
        {callRows.length > 0 ? (
          <>
            {sectionTitle(t('feed.playbooks.sponsors'))}
            {callList}
          </>
        ) : null}
        {postRows.length > 0 ? (
          <>
            {sectionTitle(t('feed.playbooks.posts'))}
            {postList}
          </>
        ) : null}
      </>
    );

  return (
    <Screen header={<Header back title={t('feed.savedTitle')} />} scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.giant }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        testID="saved-screen"
      >
        <Text variant="heading" style={{ marginTop: spacing.xs }}>
          {t('feed.playbooks.title')}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginBottom: spacing.md }}>
          {t('feed.playbooks.onThisPhone')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.lg }}
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
        >
          {playbooks.map((p) => (
            <PlaybookCover key={p.id} playbook={p} onPress={() => router.push(Routes.playbook(p.id))} />
          ))}
          <NewPlaybookTile onPress={() => setCreating(true)} />
        </ScrollView>

        {/* Four tabs can outgrow a small phone in some languages, so they scroll. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.lg }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{ flexGrow: 1 }}>
            <TextTabs<Tab>
              options={[
                { value: 'all', label: `${t('feed.playbooks.all')} ${total}` },
                { value: 'posts', label: `${t('feed.playbooks.posts')} ${postRows.length}` },
                { value: 'trials', label: `${t('feed.playbooks.trials')} ${trialRows.length}` },
                { value: 'sponsors', label: `${t('feed.playbooks.sponsors')} ${callRows.length}` },
              ]}
              value={tab}
              onChange={setTab}
              testID="saved-tabs"
            />
          </View>
        </ScrollView>

        {body}

        {!loading && !failed && !tabEmpty ? (
          <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.lg }}>
            {t('feed.playbooks.holdHint')}
          </Text>
        ) : null}
      </ScrollView>

      <Sheet visible={creating} onClose={() => setCreating(false)} title={t('feed.playbooks.new')}>
        <NewPlaybookForm onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Sheet>
      <PlaybookSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </Screen>
  );
}

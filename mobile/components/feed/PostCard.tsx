import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, Platform, Pressable, Share, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { ImagePlus, Link2, MoreHorizontal, Share2, Smartphone } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, Tappable, Text, useToast } from '@/components/ui';
import { ShareSheet, type ShareOption } from '@/components/share/ShareSheet';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { TranslatableText } from '@/components/common/TranslatableText';
import { FollowButton } from '@/components/discover/FollowButton';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { useAuth } from '@/providers/AuthProvider';
import { toggleLike, toggleSave } from '@/lib/api';
import { offerPlaybooks, removeFromAllPlaybooks } from '@/lib/playbooks';
import { applyToggleFollow } from '@/lib/followCounts';
import { getPostAudience, postLink } from '@/lib/api.feed';
import { brandedShareCaption, buildBrandedImage, type BrandedKind } from '@/lib/brandedShare';
import { errorMessage } from '@/lib/errors';
import { displayName, metaLine, relativeTime } from '@/lib/format';
import { shareContent } from '@/lib/share';
import type { FeedPost } from '@/types/models';
import { OffscreenBrandedCard } from './BrandedShareCard';
import { HeartBurst } from './HeartBurst';
import { MediaCarousel } from './MediaCarousel';
import { ScorePeek } from './ScorePeek';
import { PostActions } from './PostActions';
import { LikedBy, LikersSheet } from './PostLikers';
import { PostTagged } from './PostTagged';

/**
 * The most-seen component in the app.
 *
 * Two rules it must never break: tapping the avatar or the name opens that
 * person's profile, and every post is one tap away from the safety menu.
 */

const CAPTION_LINES = 4;
/** Roughly four lines on a phone. Only decides whether "more" is offered. */
const CAPTION_CHARS = 170;
/**
 * How long a first tap on the media waits to see whether a second one is
 * coming. Long enough for a thumb, short enough that opening a post still feels
 * immediate — and nothing else in the card is ever held up by it.
 */
const DOUBLE_TAP_MS = 260;

export interface PostCardProps {
  post: FeedPost;
  /** True while this card is the one on screen — controls video playback. */
  isActive?: boolean;
  /** Full caption, no truncation. Used on the single-post screen. */
  expanded?: boolean;
  /** Apply an optimistic change to this post in whatever list holds it. */
  onPatch: (postId: string, changes: Partial<FeedPost>) => void;
  onOpenComments: (post: FeedPost) => void;
  onOpenActions: (post: FeedPost) => void;
  onOpenProfile: (userId: string) => void;
  /** Omit on the single-post screen — there is nowhere further to go. */
  onOpenPost?: (post: FeedPost) => void;
  /**
   * Home only. When passed, the card offers Follow for an author you do not
   * follow yet, and reports the change so the list can update every post by
   * that author. Saved and the single-post screen leave it out.
   */
  onFollowChange?: (authorId: string, following: boolean) => void;
  /** Playfeed: an athlete's photo or video post shows their Talent Score in
      a cut corner of the media; tapping it opens a quick look at the score. */
  scoreCorner?: boolean;
  /** Single-post screen, your own post: your score the day it went up. */
  scoreThen?: number | null;
}

function PostCardBase({
  post,
  isActive = false,
  expanded = false,
  onPatch,
  onOpenComments,
  onOpenActions,
  onOpenProfile,
  onOpenPost,
  onFollowChange,
  scoreCorner = false,
  scoreThen = null,
}: PostCardProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const toast = useToast();
  const t = useT();
  const { user, profile } = useAuth();

  const [showAll, setShowAll] = useState(expanded);
  const [peek, setPeek] = useState(false);
  const showCorner =
    scoreCorner && post.author_role === 'athlete' && post.media.length > 0;
  /* No score worked out yet: the corner says New instead of 0, and has no pop-up. */
  const scored = post.author_score > 0;

  const lastMediaTap = useRef(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareLookup = useRef(false);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (shareTimer.current) clearTimeout(shareTimer.current);
    },
    [],
  );

  const name = displayName(post.author_name);
  const caption = post.caption?.trim() ?? '';
  /* Sport and position are stored in English; only their labels are translated. */
  const meta = metaLine(
    positionLabel(t, post.athlete_position, post.athlete_sport),
    sportLabel(t, post.athlete_sport),
    relativeTime(post.created_at),
  );
  const mightOverflow =
    caption.length > CAPTION_CHARS || caption.split('\n').length > CAPTION_LINES;

  const handleLike = useCallback(async () => {
    const liked = !post.viewer_liked;
    const optimistic = Math.max(0, post.like_count + (liked ? 1 : -1));
    onPatch(post.id, { viewer_liked: liked, like_count: optimistic });

    try {
      const result = await toggleLike(post.id);
      onPatch(post.id, { viewer_liked: result.liked, like_count: result.like_count });
    } catch (err) {
      onPatch(post.id, {
        viewer_liked: post.viewer_liked,
        like_count: post.like_count,
      });
      toast.error(errorMessage(err));
    }
  }, [post.id, post.viewer_liked, post.like_count, onPatch, toast]);

  const handleSave = useCallback(async () => {
    const saved = !post.viewer_saved;
    onPatch(post.id, { viewer_saved: saved });

    try {
      const result = await toggleSave(post.id);
      onPatch(post.id, { viewer_saved: result.saved });
      /* Saved: offer to put it in a playbook too. Unsaved: it leaves them. */
      if (result.saved) {
        const picture = post.media[0];
        offerPlaybooks({
          kind: 'post',
          id: post.id,
          title: displayName(post.author_name),
          subtitle: post.caption,
          thumb: picture ? (picture.type === 'video' ? (picture.thumbnail ?? null) : picture.url) : null,
        });
      } else if (user) {
        void removeFromAllPlaybooks(user.id, 'post', post.id);
      }
    } catch (err) {
      onPatch(post.id, { viewer_saved: post.viewer_saved });
      toast.error(errorMessage(err));
    }
  }, [post, onPatch, toast, user]);

  /*
   * Quick follow (Home only — the list passes `onFollowChange`).
   *
   * Offered only to someone you do not follow yet. `viewer_follows` is also
   * true when you follow the club a post was made for, and FeedPost carries no
   * club id, so a toggle on the author from here could not undo that — those
   * posts never show the button. Once tapped, it stays on this card, so the
   * person can see, and undo, what they did.
   */
  const isOwnPost = !!user && post.author_id === user.id;
  const [followTapped, setFollowTapped] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  /* A club is followed through its club page (organization_follows), not
     through the account that posted — so a club's post never offers this. */
  const showFollow =
    !!onFollowChange &&
    !isOwnPost &&
    post.author_role !== 'club' &&
    (!post.viewer_follows || followTapped);

  const handleFollow = useCallback(async () => {
    if (!onFollowChange || followPending) return;
    const next = !post.viewer_follows;
    setFollowTapped(true);
    setFollowPending(true);
    onFollowChange(post.author_id, next);
    try {
      const result = await applyToggleFollow({
        targetId: post.author_id,
        myId: user?.id ?? null,
        wasFollowing: !next,
        targetFollowers: null,
        myFollowing: profile?.following_count ?? 0,
      });
      if (result.following !== next) onFollowChange(post.author_id, result.following);
    } catch (err) {
      onFollowChange(post.author_id, !next);
      toast.error(errorMessage(err));
    } finally {
      setFollowPending(false);
    }
  }, [
    onFollowChange,
    followPending,
    post.viewer_follows,
    post.author_id,
    user?.id,
    profile?.following_count,
    toast,
  ]);

  const firstMedia = post.media[0];
  const canBrandShare =
    Platform.OS !== 'web' &&
    !!user &&
    post.author_id === user.id &&
    profile?.is_minor === false &&
    (profile.age_band === '18_24' || profile.age_band === '25_plus') &&
    !!firstMedia &&
    (firstMedia.type === 'photo' || (firstMedia.type === 'video' && !!firstMedia.thumbnail));

  const [shareOpen, setShareOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  /* The story / post images are only offered for a public post. */
  const [brandOk, setBrandOk] = useState(false);
  const [rendering, setRendering] = useState(false);
  const shareJob = useRef<{
    kind: BrandedKind;
    imageUrl: string;
    isVideo: boolean;
    name: string;
    sport: string;
    caption: string;
    link: string;
    sportKey: string | null;
    findMePrefix: string;
    preparing: string;
    copied: string;
    failed: string;
  } | null>(null);

  const handleShare = useCallback(async () => {
    const link = postLink(post.id);
    try {
      const outcome = await shareContent({ message: link, url: link });
      if (outcome === 'copied') toast.success(t('feed.linkCopied'));
    } catch {
      toast.error(t('common.somethingWentWrong'));
    }
  }, [post.id, t, toast]);

  const onShare = useCallback(() => {
    setBrandOk(false);
    setShareOpen(true);
    if (!canBrandShare || shareLookup.current) return;
    shareLookup.current = true;
    void (async () => {
      try {
        setBrandOk((await getPostAudience(post.id)) === 'public');
      } catch {
        setBrandOk(false);
      } finally {
        shareLookup.current = false;
      }
    })();
  }, [canBrandShare, post.id]);

  const copyLink = useCallback(() => {
    Clipboard.setString(postLink(post.id));
    setShareOpen(false);
    toast.success(t('feed.linkCopied'));
  }, [post.id, t, toast]);

  /* The sheet is a Modal. iOS will not present the system share sheet until
     that modal has left, so the link row closes first and then calls the
     original share. */
  const shareLinkFromSheet = useCallback(() => {
    setShareOpen(false);
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => {
      shareTimer.current = null;
      void handleShare();
    }, 280);
  }, [handleShare]);

  const startBrandedShare = useCallback(
    (kind: BrandedKind) => {
      const media = post.media[0];
      const imageUrl = media?.type === 'video' ? media.thumbnail : media?.url;
      if (!media || !imageUrl) return;
      shareJob.current = {
        kind,
        imageUrl,
        isVideo: media.type === 'video',
        name,
        sport: sportLabel(t, post.athlete_sport),
        caption: post.caption ?? '',
        link: postLink(post.id),
        sportKey: post.athlete_sport,
        findMePrefix: t('feed.findMeSharePrefix'),
        preparing: t('feed.sharePreparing'),
        copied: t('feed.shareCaptionCopied'),
        failed: t('feed.shareImageFailed'),
      };
      setShareOpen(false);
      setRendering(true);
    },
    [name, post.athlete_sport, post.caption, post.id, post.media, t],
  );

  useEffect(() => {
    if (!rendering || !shareJob.current) return;
    const job = shareJob.current;
    shareJob.current = null;
    let live = true;
    void (async () => {
      toast.info(job.preparing);
      try {
        const uri = await buildBrandedImage({
          kind: job.kind,
          imageUrl: job.imageUrl,
          isVideo: job.isVideo,
          name: job.name,
          sport: job.sport,
        });
        if (!live) return;
        Clipboard.setString(
          brandedShareCaption({
            caption: job.caption,
            link: job.link,
            sportKey: job.sportKey,
            findMePrefix: job.findMePrefix,
          }),
        );
        toast.success(job.copied);
        await presentPng(uri);
      } catch (err) {
        console.warn('Could not create the branded share image', err);
        if (live) toast.error(job.failed);
      } finally {
        if (live) setRendering(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [rendering, toast]);

  /* Each double tap bumps this and the burst plays once. */
  const [bursts, setBursts] = useState(0);
  const burst = useCallback(() => setBursts((n) => n + 1), []);

  const openPost = onOpenPost ? () => onOpenPost(post) : undefined;

  /**
   * One tap opens the post, two likes it — the gesture this audience already
   * has in its thumbs. The like is applied before anything moves; only the
   * *navigation* waits out the double-tap window, and only when there is
   * somewhere to navigate to.
   */
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    const isSecond = now - lastMediaTap.current < DOUBLE_TAP_MS;

    if (isSecond) {
      lastMediaTap.current = 0;
      if (openTimer.current) {
        clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      /* A double tap only ever likes. Taking a like back is deliberate, and
         belongs to the heart button. */
      if (!post.viewer_liked) handleLike();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      burst();
      return;
    }

    lastMediaTap.current = now;
    /* On the single-post screen a lone tap has nowhere to go; the second one
       of a pair still likes. */
    if (!onOpenPost) return;
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      onOpenPost(post);
    }, DOUBLE_TAP_MS);
  }, [post, onOpenPost, handleLike, burst]);
  /* On the single-post screen the caption is already full and there is
     nowhere further to go, so it stops being a button. */
  const captionIsInert = showAll && !openPost;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* One target covering avatar and name: the profile tap must never
            land in the gap between them. */}
        <Tappable
          onPress={() => onOpenProfile(post.author_id)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.openProfileOf', { name })}
          hitSlop={6}
          scaleTo={0.985}
          containerStyle={{ flex: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: theme.hit.min,
          }}
        >
          {post.author_role === 'club' ? (
            /* Square, so a club never reads as a person. */
            <ClubLogo uri={post.author_avatar} name={name} size="sm" />
          ) : (
            <Avatar
              uri={post.author_avatar}
              name={name}
              size="md"
              score={post.author_score}
              verified={post.author_verified}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text variant="name" numberOfLines={1}>
              {name}
            </Text>
            {meta ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
            {scoreThen != null && scoreThen > 0 && post.author_score > 0 ? (
              <View
                testID="post-score-then"
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: radii.sm,
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Text variant="captionStrong" tone="secondary">
                  {t(scoreThen === post.author_score ? 'feed.postedAtSame' : 'feed.postedAtNow', {
                    then: scoreThen,
                    now: post.author_score,
                  })}
                </Text>
                {scoreThen !== post.author_score ? (
                  <Text variant="captionStrong" tone={post.author_score > scoreThen ? 'success' : 'danger'}>
                    {post.author_score > scoreThen
                      ? `↑ +${post.author_score - scoreThen}`
                      : `↓ −${scoreThen - post.author_score}`}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </Tappable>

        {showFollow ? (
          /* Wrapped: Button sets `alignSelf: 'flex-start'`, which in this row
             would pin it to the top instead of centring it on the name. */
          <View>
            <FollowButton
              following={post.viewer_follows}
              pending={followPending}
              onPress={handleFollow}
              role={post.author_role}
              name={name}
            />
          </View>
        ) : null}

        <Tappable
          onPress={() => onOpenActions(post)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.postMoreOptions', { name })}
          hitSlop={12}
          scaleTo={0.9}
          style={({ pressed }) => ({
            width: theme.hit.min,
            height: theme.hit.min,
            borderRadius: radii.button,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <MoreHorizontal size={20} color={colors.textSecondary} />
        </Tappable>
      </View>

      {caption ? (
        <TranslatableText
          text={caption}
          mentions={post.mentions}
          sourceRef={{ type: 'post', id: post.id }}
          variant="body"
          numberOfLines={showAll ? undefined : CAPTION_LINES}
          /* Inert on the single-post screen: it is already whole and there is
             nowhere further to go. */
          onPressText={
            captionIsInert ? undefined : () => (showAll ? openPost?.() : setShowAll(true))
          }
          pressLabel={showAll ? t('feed.openPost') : t('feed.showFullCaption')}
          footer={
            !showAll && mightOverflow ? (
              <Text variant="captionStrong" tone="muted" style={{ marginTop: 2 }}>
                {t('common.showMore')}
              </Text>
            ) : null
          }
          /* Not while it is truncated — see the prop's own note. */
          offer={showAll || captionIsInert}
        />
      ) : null}

      {caption && (post.tagged?.length ?? 0) > 0 ? (
        <PostTagged post={post} onPatch={onPatch} />
      ) : null}

      {post.media.length > 0 ? (
        <View>
          <MediaCarousel
            media={post.media}
            postId={post.id}
            isActive={isActive}
            onPress={handleMediaTap}
          />
          {/* Announced nowhere and touchable nowhere: the like it stands for is
              already announced by the heart button below. */}
          <HeartBurst trigger={bursts} size={theme.hit.comfortable * 2} />
          {showCorner ? (
            <ScoreCorner score={post.author_score} onPress={scored ? () => setPeek(true) : undefined} />
          ) : null}
        </View>
      ) : null}
      {showCorner && scored ? (
        <ScorePeek
          visible={peek}
          onClose={() => setPeek(false)}
          userId={post.author_id}
          name={post.author_name ?? ''}
          avatar={post.author_avatar}
          score={post.author_score}
          postedAt={post.created_at}
          postId={post.id}
        />
      ) : null}

      {!caption && (post.tagged?.length ?? 0) > 0 ? (
        <PostTagged post={post} onPatch={onPatch} />
      ) : null}

      <PostActions
        liked={post.viewer_liked}
        likeCount={post.like_count}
        commentCount={post.comment_count}
        saved={post.viewer_saved}
        onLike={handleLike}
        onPressLikeCount={() => setLikersOpen(true)}
        onComment={() => onOpenComments(post)}
        onShare={onShare}
        onSave={handleSave}
      />

      {likersOpen ? (
        <LikersSheet postId={post.id} onClose={() => setLikersOpen(false)} />
      ) : null}

      {/* The name line stays on your own posts. The count above opens the list for anyone. */}
      {isOwnPost ? <LikedBy postId={post.id} likeCount={post.like_count} /> : null}

      {rendering ? <OffscreenBrandedCard /> : null}

      {shareOpen ? (
        <ShareSheet
          visible
          onClose={() => setShareOpen(false)}
          link={postLink(post.id)}
          options={[
            ...(brandOk
              ? ([
                  {
                    key: 'story',
                    label: t('feed.shareAsStory'),
                    icon: <Smartphone size={18} color={colors.textSecondary} />,
                    onPress: () => startBrandedShare('story'),
                  },
                  {
                    key: 'post',
                    label: t('feed.shareAsPost'),
                    icon: <ImagePlus size={18} color={colors.textSecondary} />,
                    onPress: () => startBrandedShare('post'),
                  },
                ] as ShareOption[])
              : []),
            {
              key: 'copy',
              label: t('messaging.copyLink'),
              icon: <Link2 size={18} color={colors.textSecondary} />,
              onPress: copyLink,
            },
            {
              key: 'link',
              label: t('messaging.moreOptions'),
              icon: <Share2 size={18} color={colors.textSecondary} />,
              onPress: shareLinkFromSheet,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/** iOS takes a file URL on the system sheet. Android only shares the file through expo-sharing. */
async function presentPng(uri: string): Promise<void> {
  if (Platform.OS === 'android' && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    return;
  }
  await Share.share({ url: uri });
}

/* A deeper shade of each tier's colour, so the small number reads on white.
   Dark mode uses the tier colour itself, which reads on the dark card. */
const TIER_INK = {
  rising: '#1E8FD6',
  bronze: '#2F6BFF',
  silver: '#7A6CFF',
  gold: '#C77D00',
  elite: '#E8372B',
} as const;

const CORNER = 52;
/* The cut's diagonal: corner × √2. */
const EDGE = Math.round(CORNER * Math.SQRT2 * 10) / 10;

/** The cut corner on the media, with the score in the tier's colour. */
function ScoreCorner({ score, onPress }: { score: number; onPress?: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const t = useT();
  const tier = tierForScore(score);
  const ink = theme.scheme === 'dark' ? TierColors[tier] : TIER_INK[tier];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? t('feed.scorePeekA11y', { score }) : t('feed.scoreNew')}
      testID="post-score-corner"
      style={{ position: 'absolute', top: 0, right: 0, width: CORNER, height: CORNER }}
    >
      {/* A triangle in the card's own colour: the photo looks cut on the diagonal. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderTopWidth: CORNER,
          borderLeftWidth: CORNER,
          borderTopColor: colors.surface,
          borderLeftColor: 'transparent',
        }}
      />
      {/* A thin line in the tier's colour along the cut, like a folded sticker. */}
      <View
        style={{
          position: 'absolute',
          left: CORNER / 2 - EDGE / 2,
          top: CORNER / 2 - 1.5,
          width: EDGE,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: ink,
          transform: [{ rotate: '45deg' }],
        }}
      />
      {/* The score ring's own number font, so it reads as a score. */}
      {onPress ? null : (
        <Text
          variant="stat"
          /* Kept inside the white triangle: longer words get a smaller size. */
          style={{
            position: 'absolute',
            top: 6,
            right: 5,
            fontSize: t('feed.scoreNew').length <= 3 ? 12 : 10,
            lineHeight: 14,
            letterSpacing: 0.6,
            color: ink,
          }}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {t('feed.scoreNew')}
        </Text>
      )}
      {onPress ? <Text
        variant="stat"
        style={{
          position: 'absolute',
          top: 2,
          right: 7,
          /* "100" is a digit wider; a size down keeps it inside the white. */
          fontSize: score >= 100 ? 17 : 21,
          lineHeight: score >= 100 ? 21 : 25,
          color: ink,
        }}
        allowFontScaling={false}
      >
        {score}
      </Text> : null}
    </Pressable>
  );
}

export const PostCard = memo(PostCardBase);

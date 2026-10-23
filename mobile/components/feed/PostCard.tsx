import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, Platform, Share, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { MoreHorizontal } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Divider, ListItem, Sheet, Tappable, Text, useToast } from '@/components/ui';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { TranslatableText } from '@/components/common/TranslatableText';
import { useAuth } from '@/providers/AuthProvider';
import { toggleLike, toggleSave } from '@/lib/api';
import { getPostAudience, postLink } from '@/lib/api.feed';
import { brandedShareCaption, buildBrandedImage, type BrandedKind } from '@/lib/brandedShare';
import { errorMessage } from '@/lib/errors';
import { displayName, metaLine, relativeTime } from '@/lib/format';
import { shareContent } from '@/lib/share';
import type { FeedPost } from '@/types/models';
import { OffscreenBrandedCard } from './BrandedShareCard';
import { HeartBurst } from './HeartBurst';
import { MediaCarousel } from './MediaCarousel';
import { PostActions } from './PostActions';

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
}: PostCardProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const toast = useToast();
  const t = useT();
  const { user, profile } = useAuth();

  const [showAll, setShowAll] = useState(expanded);

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
    positionLabel(t, post.athlete_position),
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
      if (result.saved) toast.success(t('common.saved'));
    } catch (err) {
      onPatch(post.id, { viewer_saved: post.viewer_saved });
      toast.error(errorMessage(err));
    }
  }, [post.id, post.viewer_saved, onPatch, toast, t]);

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
    if (!canBrandShare) {
      void handleShare();
      return;
    }
    if (shareLookup.current) return;
    shareLookup.current = true;
    void (async () => {
      try {
        const audience = await getPostAudience(post.id);
        if (audience === 'public') setShareOpen(true);
        else void handleShare();
      } catch {
        void handleShare();
      } finally {
        shareLookup.current = false;
      }
    })();
  }, [canBrandShare, handleShare, post.id]);

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
          <Avatar
            uri={post.author_avatar}
            name={name}
            size="md"
            score={post.author_score}
            verified={post.author_verified}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            {meta ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </Tappable>

        <Tappable
          onPress={() => onOpenActions(post)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.postMoreOptions', { name })}
          hitSlop={12}
          scaleTo={0.9}
          style={({ pressed }) => ({
            width: theme.hit.min,
            height: theme.hit.min,
            borderRadius: radii.pill,
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
        </View>
      ) : null}

      <PostActions
        liked={post.viewer_liked}
        likeCount={post.like_count}
        commentCount={post.comment_count}
        saved={post.viewer_saved}
        onLike={handleLike}
        onComment={() => onOpenComments(post)}
        onShare={onShare}
        onSave={handleSave}
      />

      {rendering ? <OffscreenBrandedCard /> : null}

      {shareOpen ? (
      <Sheet
        visible
        onClose={() => setShareOpen(false)}
        title={t('common.share')}
      >
        <ListItem
          title={t('feed.shareAsStory')}
          showChevron={false}
          testID="share-story"
          onPress={() => startBrandedShare('story')}
        />
        <Divider />
        <ListItem
          title={t('feed.shareAsPost')}
          showChevron={false}
          testID="share-post"
          onPress={() => startBrandedShare('post')}
        />
        <Divider />
        <ListItem
          title={t('feed.shareLink')}
          showChevron={false}
          testID="share-link"
          onPress={shareLinkFromSheet}
        />
      </Sheet>
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

export const PostCard = memo(PostCardBase);

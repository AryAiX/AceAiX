import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EyeOff, Play } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, RemoteImage, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { getPostById } from '@/lib/api.feed';
import { getProfile } from '@/lib/api';
import { getHighlightClip } from '@/lib/api.explore';
import { Routes } from '@/lib/routes';
import { sportLabel } from '@/constants/sports';
import { displayName } from '@/lib/format';
import type { SharedLink } from '@/lib/webLinks';

const WIDTH = 240;

interface Loaded {
  title: string;
  avatar: string | null;
  subtitle: string;
  image: string | null;
  video: boolean;
}

/**
 * A post or profile sent from Share, drawn in the chat as a small card that
 * opens it. If the person reading cannot see it (a private post, a deleted
 * one, someone blocked), the card says so and shows nothing of it.
 */
export function SharedCard({ link, isOwn }: { link: SharedLink; isOwn: boolean }) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<Loaded | 'loading' | 'gone'>('loading');

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<Loaded | 'gone'> => {
      if (link.kind === 'post') {
        const post = await getPostById(link.id);
        if (!post) return 'gone';
        const media = post.media[0];
        return {
          title: displayName(post.author_name),
          avatar: post.author_avatar,
          subtitle: [sportLabel(t, post.athlete_sport), t('messaging.tapToOpen')].filter(Boolean).join(' · '),
          image: media ? (media.type === 'video' ? media.thumbnail ?? null : media.url) : null,
          video: media?.type === 'video',
        };
      }
      if (link.kind === 'clip') {
        const clip = await getHighlightClip(link.id);
        if (!clip) return 'gone';
        const media = clip.media[0];
        return {
          title: displayName(clip.author_name),
          avatar: clip.author_avatar,
          subtitle: [t('explore.highlight'), t('messaging.tapToWatch')].join(' · '),
          image: media?.thumbnail ?? null,
          video: true,
        };
      }
      const bundle = await getProfile(link.id);
      return {
        title: displayName(bundle.user.full_name),
        avatar: bundle.user.avatar_url,
        subtitle: [sportLabel(t, bundle.athlete?.sport ?? null), t('messaging.viewProfile')].filter(Boolean).join(' · '),
        image: null,
        video: false,
      };
    };
    load()
      .then((next) => !cancelled && setState(next))
      .catch(() => !cancelled && setState('gone'));
    return () => {
      cancelled = true;
    };
  }, [link.kind, link.id, t]);

  const frame = {
    width: WIDTH,
    alignSelf: isOwn ? ('flex-end' as const) : ('flex-start' as const),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
  };

  if (state === 'gone') {
    return (
      <View style={[frame, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }]}>
        <EyeOff size={18} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={{ flex: 1 }}>
          {link.kind === 'post'
            ? t('messaging.postUnavailable')
            : link.kind === 'clip'
              ? t('messaging.clipUnavailable')
              : t('messaging.profileUnavailable')}
        </Text>
      </View>
    );
  }

  const loaded = state === 'loading' ? null : state;
  return (
    <Pressable
      onPress={() =>
        link.kind === 'clip'
          ? router.push({ pathname: Routes.reels, params: { start: link.id, source: 'clip' } })
          : router.push(link.kind === 'post' ? Routes.post(link.id) : Routes.profile(link.id))
      }
      accessibilityRole="button"
      accessibilityLabel={loaded ? `${loaded.title}. ${loaded.subtitle}` : undefined}
      style={({ pressed }) => [frame, { opacity: pressed ? 0.85 : 1 }]}
    >
      {link.kind !== 'profile' && (loaded === null || loaded.image) ? (
        <View style={{ height: 170, backgroundColor: colors.surfaceAlt }}>
          {loaded?.image ? (
            <RemoteImage uri={loaded.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : null}
          {loaded?.video ? (
            <View
              style={{
                position: 'absolute',
                left: spacing.sm,
                bottom: spacing.sm,
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
        <Avatar uri={loaded?.avatar ?? null} name={loaded?.title ?? ''} size="sm" />
        <View style={{ flex: 1 }}>
          <Text variant="captionStrong" numberOfLines={1}>
            {loaded?.title ?? ' '}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {loaded?.subtitle ?? ' '}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

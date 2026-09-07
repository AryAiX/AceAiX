import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck,
  Flag,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Share2,
  ShieldBan,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore, tierGradient } from '@/theme/tokens';
import {
  AnimatedGradient,
  Avatar,
  Badge,
  Button,
  ConfirmSheet,
  Divider,
  IconButton,
  Lightbox,
  ListItem,
  Reveal,
  Sheet,
  Shine,
  Text,
  useToast,
} from '@/components/ui';
import { blockUser, canMessage, reportContent, startConversation, toggleFollow } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { levelLabelI18n, positionLabel, sportLabel } from '@/constants/sports';
import { ageBandLabel, compactNumber, displayName, metaLine, roleLabel } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import type { MessageBlockReason, ProfileBundle } from '@/types/models';

/** Plain-language answers to "why can't I message this person?". */
const MESSAGE_BLOCK_KEYS: Record<MessageBlockReason, string> = {
  minor_requires_verified_sender: 'profile.messageBlock.minorRequiresVerifiedSender',
  minor_requires_guardian_consent: 'profile.messageBlock.minorRequiresGuardianConsent',
  recipient_messages_off: 'profile.messageBlock.recipientMessagesOff',
  recipient_only_accepts_followed: 'profile.messageBlock.recipientOnlyAcceptsFollowed',
  recipient_only_accepts_verified: 'profile.messageBlock.recipientOnlyAcceptsVerified',
  not_permitted: 'profile.messageBlock.notPermitted',
  not_found: 'profile.messageBlock.notFound',
};

/** The reason key is what the server stores; only the two lines are translated. */
const REPORT_REASONS: { key: string; label: string; hint: string }[] = [
  {
    key: 'child_safety',
    label: 'profile.reportReason.childSafety',
    hint: 'profile.reportReason.childSafetyHint',
  },
  {
    key: 'harassment',
    label: 'profile.reportReason.harassment',
    hint: 'profile.reportReason.harassmentHint',
  },
  { key: 'hate', label: 'profile.reportReason.hate', hint: 'profile.reportReason.hateHint' },
  {
    key: 'nudity',
    label: 'profile.reportReason.nudity',
    hint: 'profile.reportReason.nudityHint',
  },
  {
    key: 'violence',
    label: 'profile.reportReason.violence',
    hint: 'profile.reportReason.violenceHint',
  },
  {
    key: 'impersonation',
    label: 'profile.reportReason.impersonation',
    hint: 'profile.reportReason.impersonationHint',
  },
  { key: 'scam', label: 'profile.reportReason.scam', hint: 'profile.reportReason.scamHint' },
  { key: 'spam', label: 'profile.reportReason.spam', hint: 'profile.reportReason.spamHint' },
  { key: 'other', label: 'profile.reportReason.other', hint: 'profile.reportReason.otherHint' },
];

interface Props {
  bundle: ProfileBundle;
  /** Called after a change the parent should reload for (block, unblock). */
  onChanged?: () => void;
}

export function ProfileHeader({ bundle, onChanged }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();

  const { user, athlete, coach, score, viewer } = bundle;
  const isSelf = viewer?.is_self === true;

  // Optimistic follow state — the row flips instantly and rolls back on failure.
  const [following, setFollowing] = useState(viewer?.is_following === true);
  const [followers, setFollowers] = useState(user?.followers_count ?? 0);
  const [followBusy, setFollowBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [messageBlock, setMessageBlock] = useState<MessageBlockReason | null>(null);
  const [messageBusy, setMessageBusy] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const tier = score ? tierForScore(score.overall) : null;
  const tierColor = tier ? TierColors[tier] : colors.play.azure;

  /* Whatever the person set. Failing that, the tier's own two colours, and for
     somebody with no score at all a stable pick from their id — so a coach's
     header is still *a* colour and never the absence of one. */
  const cover = user?.cover_url ?? null;
  const coverStops: readonly [string, string, string] = tier
    ? [tierGradient(tier)[0], tierGradient(tier)[1], theme.alpha(tierColor, 0.9)]
    : [theme.hueFor(user?.id), theme.hueFor(`${user?.id}-b`), colors.play.violet];

  const name = displayName(user?.full_name);

  const meta = useMemo(() => {
    /* Sport and position are stored in English; only the label is translated.
       Club and specialty are what the person typed, so they stand as written. */
    if (athlete) {
      return metaLine(
        positionLabel(t, athlete.position),
        sportLabel(t, athlete.sport),
        athlete.club,
      );
    }
    if (coach) return metaLine(roleLabel(user?.role), coach.specialty, coach.current_club);
    return roleLabel(user?.role);
  }, [athlete, coach, t, user?.role]);

  const location = metaLine(user?.city, user?.country);

  /**
   * Safety rule, not a detail: the server returns `age: null` for anyone under
   * 18 and gives a band instead. Show the band, never a derived number.
   */
  const ageText = athlete
    ? athlete.age != null
      ? t('common.ageYears', { age: athlete.age })
      : ageBandLabel(athlete.age_band)
    : null;

  const onToggleFollow = useCallback(async () => {
    if (followBusy) return;
    const next = !following;
    setFollowBusy(true);
    setFollowing(next);
    setFollowers((count) => Math.max(0, count + (next ? 1 : -1)));
    try {
      const result = await toggleFollow(user.id);
      setFollowing(result.following);
      if (typeof result.followers_count === 'number') setFollowers(result.followers_count);
    } catch (err) {
      setFollowing(!next);
      setFollowers((count) => Math.max(0, count + (next ? -1 : 1)));
      toast.error(errorMessage(err));
    } finally {
      setFollowBusy(false);
    }
  }, [followBusy, following, toast, user.id]);

  const onMessage = useCallback(async () => {
    if (messageBusy) return;
    setMessageBusy(true);
    try {
      if (!viewer?.can_message) {
        // Ask the server for the machine reason so the copy is never a guess.
        const permission = await canMessage(user.id);
        if (!permission.allowed) {
          setMessageBlock(permission.reason ?? 'not_permitted');
          return;
        }
      }
      const conversationId = await startConversation(user.id);
      router.push(Routes.chat(conversationId));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMessageBusy(false);
    }
  }, [messageBusy, viewer?.can_message, user.id, router, toast]);

  const onShare = useCallback(async () => {
    setMenuOpen(false);
    try {
      await Share.share({
        message: t('profile.shareMessage', {
          name,
          url: `https://aceaix.com/app/u/${user.id}`,
        }),
      });
    } catch {
      /* the person dismissed the share sheet */
    }
  }, [name, t, user.id]);

  const onReport = useCallback(
    async (reason: string) => {
      setReportOpen(false);
      try {
        await reportContent('user', user.id, reason);
        toast.success(t('profile.reportThanks'));
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [t, toast, user.id],
  );

  const onBlock = useCallback(async () => {
    setBlocking(true);
    try {
      await blockUser(user.id);
      setBlockOpen(false);
      toast.success(t('profile.blockedToast', { name }));
      onChanged?.();
      if (router.canGoBack()) router.back();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBlocking(false);
    }
  }, [name, onChanged, router, t, toast, user.id]);

  return (
    <View>
      {/*
        The wallpaper. It used to be a 26%-opacity wash of the tier colour over
        the page background — and since two of the five tiers were grey, most
        people's profiles opened on a grey band. Now it is either the photo they
        chose or a full-strength gradient that moves.
      */}
      <View
        style={{
          height: 168,
          borderBottomLeftRadius: radii.xl,
          borderBottomRightRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: colors.surfaceAlt,
        }}
      >
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            testID="profile-cover"
          />
        ) : (
          <AnimatedGradient
            colors={coverStops}
            period={14}
            style={StyleSheet.absoluteFill}
            testID="profile-cover"
          />
        )}

        {/* The avatar and the name sit over the bottom edge, so it darkens. */}
        <LinearGradient
          colors={['transparent', theme.alpha(colors.scheme === 'dark' ? '#06050E' : '#161327', 0.42)]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Shine every={7} />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: -48 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            padding: 3,
            backgroundColor: colors.bg,
          }}
        >
          <Avatar
            uri={user?.avatar_url}
            name={name}
            size="xl"
            score={score?.overall ?? null}
            verified={user?.is_verified}
            /* Tapping it opens the photo full size — the picture is the
               introduction on a network like this one, and an 88pt circle is
               not enough of it to recognise anyone by. Always tappable: with no
               photo uploaded the viewer enlarges the monogram, which is better
               than a tap that silently does nothing. */
            onPress={() => setPhotoOpen(true)}
            pressLabel={t('profile.viewPhotoA11y', { name })}
            testID="profile-avatar"
          />
        </View>

        <Reveal>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}
          >
            <Text variant="title" numberOfLines={2} style={{ flexShrink: 1 }}>
              {name}
            </Text>
            {user?.is_verified ? (
              <BadgeCheck size={20} color={colors.info} fill={colors.infoSoft} strokeWidth={2.2} />
            ) : null}
          </View>

          {meta ? (
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              {meta}
            </Text>
          ) : null}
        </Reveal>

        {location ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs }}
          >
            <MapPin size={13} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {location}
            </Text>
          </View>
        ) : null}

        <Reveal index={1}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            {ageText ? <Badge label={ageText} tone="neutral" /> : null}
            {athlete?.level ? (
              <Badge label={levelLabelI18n(t, athlete.level)} tone="neutral" />
            ) : null}
            {athlete?.is_open_to_offers ? (
              <Badge label={t('profile.openToOffers')} tone="success" />
            ) : null}
          </View>
        </Reveal>

        {user?.bio ? (
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.md }}>
            {user.bio}
          </Text>
        ) : null}

        {/* Follower counts */}
        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg }}>
          <CountLink
            value={followers}
            label={t('common.followers')}
            onPress={() => router.push(Routes.followers(user.id))}
            accessibilityLabel={t('profile.followersA11y', { count: followers })}
          />
          <CountLink
            value={user?.following_count ?? 0}
            label={t('common.followingCount')}
            onPress={() => router.push(Routes.following(user.id))}
            accessibilityLabel={t('profile.followingA11y', {
              count: user?.following_count ?? 0,
            })}
          />
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.lg,
          }}
        >
          {isSelf ? (
            <>
              <Button
                label={t('profile.editProfile')}
                variant="secondary"
                style={{ flex: 1 }}
                fullWidth
                onPress={() => router.push(Routes.editProfile)}
              />
              <IconButton
                icon={<Settings size={20} color={colors.text} />}
                label={t('profile.settings')}
                size={52}
                onPress={() => router.push(Routes.settings)}
              />
            </>
          ) : (
            <>
              <Button
                label={t(following ? 'common.following' : 'common.follow')}
                variant={following ? 'secondary' : 'primary'}
                style={{ flex: 1 }}
                fullWidth
                loading={followBusy}
                onPress={onToggleFollow}
              />
              <Button
                label={t('common.message')}
                variant="secondary"
                style={{ flex: 1 }}
                fullWidth
                loading={messageBusy}
                icon={
                  viewer?.can_message ? (
                    <MessageCircle size={16} color={colors.text} />
                  ) : (
                    <Lock size={16} color={colors.textMuted} />
                  )
                }
                /* Kept tappable on purpose: a dead button teaches nothing, so a
                   tap explains why messaging is limited instead. */
                accessibilityHint={
                  viewer?.can_message ? undefined : t('profile.messageLimitedHint')
                }
                onPress={onMessage}
              />
            </>
          )}
          <IconButton
            icon={<MoreHorizontal size={20} color={colors.text} />}
            label={t('profile.moreOptions')}
            size={52}
            onPress={() => setMenuOpen(true)}
          />
        </View>
      </View>

      {/* ── The photo, full size ── */}
      <Lightbox
        visible={photoOpen}
        uri={user?.avatar_url ?? null}
        caption={name}
        onClose={() => setPhotoOpen(false)}
      />

      {/* ── Overflow menu ── */}
      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={name} scrollable={false}>
        <ListItem
          title={t('profile.shareProfile')}
          left={<Share2 size={20} color={colors.textSecondary} />}
          onPress={onShare}
        />
        {!isSelf ? (
          <>
            <Divider />
            <ListItem
              title={t('profile.reportAccount')}
              subtitle={t('profile.reportAccountSubtitle')}
              left={<Flag size={20} color={colors.textSecondary} />}
              onPress={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
            />
            <Divider />
            <ListItem
              title={t('profile.blockPerson', { name })}
              subtitle={t('profile.blockPersonSubtitle')}
              destructive
              left={<ShieldBan size={20} color={colors.danger} />}
              onPress={() => {
                setMenuOpen(false);
                setBlockOpen(true);
              }}
            />
          </>
        ) : null}
      </Sheet>

      {/* ── Report ── */}
      <Sheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t('profile.reportAccount')}
        subtitle={t('profile.reportSheetSubtitle')}
      >
        {REPORT_REASONS.map((reason, index) => (
          <View key={reason.key}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={t(reason.label)}
              subtitle={t(reason.hint)}
              onPress={() => onReport(reason.key)}
              showChevron
            />
          </View>
        ))}
      </Sheet>

      {/* ── Block ── */}
      <ConfirmSheet
        visible={blockOpen}
        title={t('profile.blockConfirmTitle', { name })}
        message={t('profile.blockConfirmBody', { name })}
        confirmLabel={t('common.block')}
        destructive
        loading={blocking}
        onConfirm={onBlock}
        onCancel={() => setBlockOpen(false)}
      />

      {/* ── Why messaging is limited ── */}
      <Sheet
        visible={messageBlock !== null}
        onClose={() => setMessageBlock(null)}
        title={t('profile.messageBlockTitle')}
        scrollable={false}
      >
        <Text variant="body" tone="secondary">
          {messageBlock ? t(MESSAGE_BLOCK_KEYS[messageBlock]) : ''}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {t('profile.messageBlockNote')}
        </Text>
        <Button
          label={t('profile.gotIt')}
          variant="secondary"
          fullWidth
          style={{ marginTop: spacing.xl }}
          onPress={() => setMessageBlock(null)}
        />
      </Sheet>
    </View>
  );
}

function CountLink({
  value,
  label,
  onPress,
  accessibilityLabel,
}: {
  value: number;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
        minHeight: 44,
        paddingVertical: theme.spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text variant="bodyStrong">{compactNumber(value)}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

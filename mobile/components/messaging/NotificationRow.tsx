import React from 'react';
import { Pressable, View } from 'react-native';
import {
  AtSign,
  Award,
  Bell,
  Building2,
  Megaphone,
  Radio,
  ShieldCheck,
  Trophy,
  Briefcase,
  Handshake,
  CalendarCheck,
  CalendarX,
  ClipboardCheck,
  Eye,
  Heart,
  Mail,
  MessageCircle,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { relativeTime } from '@/lib/format';
import type { Translate } from '@/lib/i18n-bridge';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * One notification.
 *
 * A row is only a Pressable when it actually leads somewhere — `notificationTarget`
 * returning null is how the router says "there is nothing behind this", and a
 * tap that goes nowhere is worse than a row that never invited the tap.
 */

type IconComponent = typeof Bell;

interface Skin {
  Icon: IconComponent;
  /** Key into the palette, resolved against the live theme. */
  tint:
    | 'primary'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger'
    | 'textSecondary';
}

function skinFor(type: NotificationType): Skin {
  switch (type) {
    case 'follow':
      return { Icon: UserPlus, tint: 'info' };
    case 'like':
      return { Icon: Heart, tint: 'danger' };
    case 'comment':
    case 'reply':
      return { Icon: MessageCircle, tint: 'primary' };
    case 'mention':
      return { Icon: AtSign, tint: 'primary' };
    case 'message':
      return { Icon: Mail, tint: 'info' };
    case 'application_received':
    case 'application_status':
      return { Icon: ClipboardCheck, tint: 'success' };
    case 'profile_view':
      return { Icon: Eye, tint: 'textSecondary' };
    case 'endorsement':
      return { Icon: Award, tint: 'warning' };
    case 'score_tier_up':
      // Volt is reserved for the Talent Score screen itself, so a tier-up
      // reads as "good news" here rather than borrowing the score's colour.
      return { Icon: TrendingUp, tint: 'success' };
    case 'opportunity':
      return { Icon: Briefcase, tint: 'primary' };
    case 'sponsorship_offer':
    case 'sponsorship_application':
    case 'sponsorship_response':
      return { Icon: Handshake, tint: 'warning' };
    case 'coaching_booked':
      return { Icon: CalendarCheck, tint: 'success' };
    case 'coaching_cancelled':
      return { Icon: CalendarX, tint: 'danger' };
    case 'meetup_request':
    case 'meetup_accepted':
    case 'meetup_declined':
    case 'meetup_cancelled':
    case 'meetup_nearby':
      return { Icon: Users, tint: 'primary' };
    case 'club_broadcast':
      return { Icon: Megaphone, tint: 'primary' };
    case 'club_invite':
    case 'club_invite_accepted':
    case 'club_squad_link':
      return { Icon: Building2, tint: 'info' };
    case 'club_event_new':
    case 'club_event_registration':
    case 'club_event_registration_minor':
      return { Icon: CalendarCheck, tint: 'success' };
    case 'club_event_cancelled':
      return { Icon: CalendarX, tint: 'danger' };
    case 'club_match_live':
      return { Icon: Radio, tint: 'danger' };
    case 'club_match_scheduled':
    case 'club_match_result':
      return { Icon: Trophy, tint: 'warning' };
    case 'club_verification_approved':
      return { Icon: ShieldCheck, tint: 'success' };
    case 'club_verification_rejected':
    case 'club_verification_more_info':
      return { Icon: ShieldCheck, tint: 'warning' };
    case 'referral_joined':
      return { Icon: UserPlus, tint: 'success' };
    case 'referral_token':
      return { Icon: Award, tint: 'warning' };
    default:
      return { Icon: Bell, tint: 'textSecondary' };
  }
}

/**
 * "Jane Doe and 4 others liked your post".
 *
 * The server writes the title with the newest actor's name at the front and
 * counts the rest in `actor_count`, so the name is swapped for the group
 * phrase only when it is genuinely the prefix — never by blind string surgery.
 *
 * KNOWN GAP: `n.title` and `n.body` arrive from the database as finished
 * English sentences — the notification triggers in
 * `20260904000004_notifications_and_counters.sql` concatenate them at insert
 * time ("<name> started following you", "Your application to <role> is now
 * <status>"). There is no key to look up here, so they are rendered exactly as
 * they arrive and stay English in every language. Fixing it properly means
 * changing the triggers to store the notification's type plus its parameters
 * (actor name, opportunity title, status) in `data`, and composing the
 * sentence on the client from a per-type key — which also fixes word order,
 * which no amount of client-side surgery on a finished sentence can.
 */
export function notificationTitle(n: AppNotification, t: Translate): string {
  const name = n.actor?.full_name?.trim();
  if (n.actor_count > 1 && name && n.title.startsWith(name)) {
    return t('messaging.groupedTitle', {
      actors: t('messaging.actorAndOthers', { name, count: n.actor_count - 1 }),
      // Server-written, untranslated: everything after the actor's name.
      rest: n.title.slice(name.length),
    });
  }
  return n.title;
}

/**
 * "New game near you" is composed on the client.
 * Sport and city live in `data`; if either is missing, the stored English
 * sentence is used instead.
 */
function nearbyCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  if (n.type !== 'meetup_nearby') return null;
  const sportKey = n.data?.sport;
  const city = n.data?.city;
  if (typeof sportKey !== 'string' || sportKey.trim() === '') return null;
  if (typeof city !== 'string' || city.trim() === '') return null;
  const gameTitle = n.data?.title;
  return {
    title: t('messaging.meetupNearbyTitle', { sport: sportLabel(t, sportKey), city }),
    body: typeof gameTitle === 'string' ? gameTitle : n.body,
  };
}

const JOINED_SUFFIX = ' joined through your invite';
const JOINED_ANONYMOUS = `A friend${JOINED_SUFFIX}`;
const TOKEN_BODY = /^(\d+) friends have joined AceAiX through your invite\.?$/;

/**
 * The server stores these two sentences in English. The name is the first
 * name it put in front of a fixed ending; the token body starts with the
 * count. Anything we cannot recognise stays as the stored sentence.
 */
function referralCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  if (n.type === 'referral_joined') {
    if (n.title === JOINED_ANONYMOUS) {
      return { title: t('messaging.referralJoinedNoName'), body: n.body };
    }
    if (n.title.endsWith(JOINED_SUFFIX)) {
      const name = n.title.slice(0, -JOINED_SUFFIX.length).trim();
      if (name) return { title: t('messaging.referralJoined', { name }), body: n.body };
    }
    return null;
  }
  if (n.type !== 'referral_token') return null;
  const count = TOKEN_BODY.exec(n.body?.trim() ?? '');
  const friends = count ? Number(count[1]) : null;
  return {
    title: t('messaging.referralTokenTitle'),
    body:
      friends == null
        ? n.body
        : t('messaging.referralTokenBody', { n: friends, count: friends }),
  };
}

/** "{name} mentioned you in a post", or in a comment when `data.comment_id` is set. */
function mentionCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  if (n.type !== 'mention') return null;
  const name = n.actor?.full_name?.trim();
  if (!name) return null;
  const commentId = n.data?.comment_id;
  const inComment = typeof commentId === 'string' ? commentId.trim().length > 0 : commentId != null;
  return {
    title: t(inComment ? 'messaging.mentionedInComment' : 'messaging.mentionedInPost', { name }),
    body: n.body,
  };
}

/** Title and body, including the sentences composed on the client. */
export function notificationCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } {
  const nearby = nearbyCopy(n, t);
  if (nearby) return nearby;
  const mention = mentionCopy(n, t);
  if (mention) return mention;
  const referral = referralCopy(n, t);
  if (referral) return referral;
  return { title: notificationTitle(n, t), body: n.body };
}

interface Props {
  notification: AppNotification;
  /** Omitted when the notification has no destination. */
  onPress?: () => void;
}

export function NotificationRow({ notification, onPress }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const skin = skinFor(notification.type);
  const tint = colors[skin.tint];
  const unread = !notification.is_read;
  /* KNOWN GAP: title and body are finished English sentences written by the
     database triggers — see `notificationTitle` above for what a real fix
     needs. Everything around them on this row is translated. */
  const copy = notificationCopy(notification, t);
  const title = copy.title;
  const body = copy.body;
  const when = relativeTime(notification.created_at);

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        minHeight: 72,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <View>
        {notification.actor_id ? (
          <Avatar
            uri={notification.actor?.avatar_url}
            name={notification.actor?.full_name}
            size="md"
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.pill,
              backgroundColor: theme.alpha(tint, 0.14),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <skin.Icon size={20} color={tint} strokeWidth={2.1} />
          </View>
        )}

        {notification.actor_id ? (
          <View
            style={{
              position: 'absolute',
              right: -3,
              bottom: -3,
              width: 22,
              height: 22,
              borderRadius: radii.pill,
              backgroundColor: theme.alpha(tint, 0.18),
              borderWidth: 2,
              borderColor: colors.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <skin.Icon size={11} color={tint} strokeWidth={2.6} />
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant={unread ? 'bodyStrong' : 'body'} numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {body}
          </Text>
        ) : null}
        <Text variant="overline" tone="muted" style={{ marginTop: 2 }}>
          {when}
        </Text>
      </View>

      {unread ? (
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            marginTop: spacing.sm,
          }}
        />
      ) : null}
    </View>
  );

  if (!onPress) {
    // Still announced, just not offered as a button.
    return (
      <View
        accessible
        accessibilityLabel={[title, body, when].filter(Boolean).join('. ')}
        style={{ backgroundColor: unread ? colors.surfaceAlt : colors.bg }}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        body,
        when,
        unread ? t('messaging.unread') : null,
      ]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? colors.surfaceSunken
          : unread
            ? colors.surfaceAlt
            : colors.bg,
      })}
    >
      {content}
    </Pressable>
  );
}

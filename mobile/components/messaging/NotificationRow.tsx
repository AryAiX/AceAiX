import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import {
  AtSign,
  Tag,
  Award,
  Bell,
  Building2,
  Megaphone,
  Radio,
  ShieldAlert,
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
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, RemoteImage, Text } from '@/components/ui';
import { FollowButton } from '@/components/discover/FollowButton';
import { LogoColors, TierLabels, type Tier } from '@/theme/tokens';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { relativeTime } from '@/lib/format';
import { currentLanguage, intlLocale, type Translate } from '@/lib/i18n-bridge';
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
    | 'like'
    | 'textSecondary';
}

function skinFor(type: NotificationType): Skin {
  switch (type) {
    case 'follow':
      return { Icon: UserPlus, tint: 'info' };
    case 'like':
      return { Icon: Heart, tint: 'like' };
    case 'comment':
    case 'reply':
      return { Icon: MessageCircle, tint: 'primary' };
    case 'mention':
      return { Icon: AtSign, tint: 'primary' };
    case 'post_tag':
      return { Icon: Tag, tint: 'primary' };
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
    case 'challenge_verified':
      return { Icon: Trophy, tint: 'success' };
    case 'challenge_rejected':
      return { Icon: Trophy, tint: 'warning' };
    case 'challenge_entry':
      return { Icon: Trophy, tint: 'primary' };
    case 'gi_completed':
    case 'sport_fit_completed':
      return { Icon: Sparkles, tint: 'primary' };
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
    case 'guardian_consent_granted':
      return { Icon: ShieldCheck, tint: 'success' };
    case 'guardian_consent_changed':
      return { Icon: ShieldCheck, tint: 'info' };
    case 'guardian_consent_revoked':
      return { Icon: ShieldAlert, tint: 'warning' };
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
    case 'sport_request_approved':
      return { Icon: Award, tint: 'success' };
    case 'sport_request_matched':
      return { Icon: Trophy, tint: 'primary' };
    case 'sport_request_rejected':
      return { Icon: ShieldAlert, tint: 'warning' };
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
 * KNOWN GAP: every sentence is composed on the phone, except a club
 * broadcast, a new event, a scheduled match and a match result. Those are
 * only names and punctuation, so the stored text reads the same in every
 * language.
 *
 * The stored text is translated only when it matches a sentence we recognise
 * exactly. Names, titles and a coach's note stay as written. A tier change
 * reads `data.tier` and `data.overall`, and only when both are there. An
 * application status reads `data.status`, and only when it is the status in
 * the sentence. A meetup's place and time are rewritten from the stored UTC
 * line when that line is the English date we know. Anything else stays as
 * stored.
 *
 * Composed on the phone: follow, like, comment, reply, message and
 * profile_view (the actor's name, "name and N others", or the organisation
 * when the title does not start with the actor); mention and
 * post_tag; challenge_verified and challenge_rejected (the challenge title
 * when the stored sentence has it, and the two default coach notes);
 * challenge_entry (the name, the challenge, and the default new-clip note);
 * meetup_nearby, the titles of a meetup request, acceptance, decline and
 * cancellation, and the place and time on an acceptance or a cancellation;
 * referral_joined, referral_token, and the sport-request decisions; club
 * verification, a club invite and its acceptance, a squad link, a cancelled
 * event, an event registration (a person's name, or "Your child"), and a
 * live match; guardian consent; Game Intelligence and Sport Fit finished;
 * a score tier; an application and its status; an endorsement; a coaching
 * booking and a cancellation; and a sponsorship offer, application and
 * answer.
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

/** "{name} tagged you in a post". The server stores the same sentence in English. */
function tagCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  if (n.type !== 'post_tag') return null;
  const name = n.actor?.full_name?.trim();
  if (!name) return null;
  return {
    title: t('messaging.taggedInPost', { name }),
    body: n.body,
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

/**
 * "Your sport was approved: Kabaddi". The sport comes from `data.sport`.
 * A rejection keeps the server body, which is the admin's note.
 */
function sportRequestCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  if (
    n.type !== 'sport_request_approved' &&
    n.type !== 'sport_request_matched' &&
    n.type !== 'sport_request_rejected'
  ) {
    return null;
  }
  if (n.type === 'sport_request_rejected') {
    return { title: t('messaging.sportRejected'), body: n.body };
  }
  const raw = n.data?.sport;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const sport = sportLabel(t, raw);
  return {
    title: t(
      n.type === 'sport_request_approved' ? 'messaging.sportApproved' : 'messaging.sportMatched',
      { sport },
    ),
    body: null,
  };
}

/**
 * A sentence that is only the person's name plus a fixed ending.
 *
 * The stored title has to be that name followed by the ending, or the older
 * merged form ("Sara and 2 others started following you"). Anything else, or
 * a missing name, keeps the stored title.
 *
 * A profile view may start with the viewer's organisation instead. When the
 * actor's name is not the start of the title, that organisation is the part
 * before " viewed your profile", and only when the ending appears once and
 * the part has no space at either end. "and N others" stays the actor-name form.
 */
const ACTOR_SENTENCE: Partial<Record<NotificationType, { suffix: string; key: string }>> = {
  follow: { suffix: ' started following you', key: 'messaging.followedYou' },
  like: { suffix: ' liked your post', key: 'messaging.likedYourPost' },
  comment: { suffix: ' commented on your post', key: 'messaging.commentedOnPost' },
  reply: { suffix: ' replied to you', key: 'messaging.repliedToYou' },
  message: { suffix: ' sent you a message', key: 'messaging.sentYouMessage' },
  profile_view: { suffix: ' viewed your profile', key: 'messaging.viewedYourProfile' },
};

function actorPhrase(n: AppNotification, t: Translate, name: string): string {
  if (n.actor_count > 1) {
    return t('messaging.actorAndOthers', { name, count: n.actor_count - 1 });
  }
  return name;
}

function matchesActorTitle(title: string, name: string, suffix: string, actorCount: number): boolean {
  if (title === `${name}${suffix}`) return true;
  if (actorCount > 1) {
    const others = actorCount - 1;
    const word = others === 1 ? 'other' : 'others';
    if (title === `${name} and ${others} ${word}${suffix}`) return true;
  }
  return false;
}

function actorCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  const spec = ACTOR_SENTENCE[n.type];
  if (!spec) return null;
  const name = n.actor?.full_name?.trim();
  if (!name) return null;
  if (matchesActorTitle(n.title, name, spec.suffix, n.actor_count)) {
    return {
      title: t(spec.key, { actors: actorPhrase(n, t, name) }),
      body: n.body,
    };
  }
  if (n.type !== 'profile_view' || n.title.startsWith(name)) return null;
  const organisation = beforePhrase(n.title, spec.suffix);
  if (!organisation) return null;
  return {
    title: t(spec.key, { actors: organisation }),
    body: n.body,
  };
}

const CHALLENGE_PREFIX = 'Your ';
const CHALLENGE_CONFIRMED_SUFFIX = ' entry is confirmed';
const CHALLENGE_ANOTHER_SUFFIX = ' entry needs another go';
const COACH_CONFIRMED = 'A coach watched it and confirmed the result.';
const COACH_RETRY = 'Read the brief again and send a new clip.';

/** The challenge name between a fixed prefix and ending, or null when it is not that sentence. */
function challengeName(title: string, suffix: string): string | null {
  if (!title.startsWith(CHALLENGE_PREFIX) || !title.endsWith(suffix)) return null;
  if (title.length <= CHALLENGE_PREFIX.length + suffix.length) return null;
  const middle = title.slice(CHALLENGE_PREFIX.length, title.length - suffix.length);
  if (!middle || middle !== middle.trim()) return null;
  return middle;
}

/**
 * A judged challenge. The title is translated with the challenge name only
 * when the stored sentence is exactly "Your <title> entry is …". The body is
 * the coach's note, and only the two default notes are translated.
 */
function challengeResultCopy(
  n: AppNotification,
  t: Translate,
): { title: string; body: string | null } | null {
  if (n.type !== 'challenge_verified' && n.type !== 'challenge_rejected') return null;
  const confirmed = n.type === 'challenge_verified';
  const challenge = challengeName(n.title, confirmed ? CHALLENGE_CONFIRMED_SUFFIX : CHALLENGE_ANOTHER_SUFFIX);
  const title = challenge
    ? t(confirmed ? 'messaging.challengeConfirmed' : 'messaging.challengeAnotherGo', { challenge })
    : t(confirmed ? 'messaging.challengeConfirmedPlain' : 'messaging.challengeAnotherGoPlain');
  const note = n.body?.trim();
  let body = n.body;
  if (note === COACH_CONFIRMED) body = t('messaging.challengeCoachConfirmed');
  else if (note === COACH_RETRY) body = t('messaging.challengeCoachRetry');
  return { title, body };
}

type NoticeCopy = { title: string; body: string | null };

function phraseCount(title: string, phrase: string): number {
  return title.split(phrase).length - 1;
}

/** Non-empty, and no space at either end. */
function exactPiece(value: string): string | null {
  if (!value || value !== value.trim()) return null;
  return value;
}

/**
 * "{name}<phrase><rest>".
 *
 * An actor name, when the notice has one, has to be the prefix. Otherwise
 * the phrase has to appear exactly once, and the name is what sits before it.
 */
function namedSplit(
  title: string,
  phrase: string,
  actorName: string | null | undefined,
): { name: string; rest: string } | null {
  const actor = actorName?.trim() ?? '';
  if (actor) {
    if (!title.startsWith(actor + phrase)) return null;
    const rest = title.slice(actor.length + phrase.length);
    if (rest !== '' && exactPiece(rest) === null) return null;
    return { name: actor, rest };
  }
  if (phraseCount(title, phrase) !== 1) return null;
  const at = title.indexOf(phrase);
  const name = exactPiece(title.slice(0, at));
  if (!name) return null;
  const rest = title.slice(at + phrase.length);
  if (rest !== '' && exactPiece(rest) === null) return null;
  return { name, rest };
}

/** The value after a fixed prefix, only when that prefix appears once. */
function afterPhrase(title: string, prefix: string): string | null {
  if (phraseCount(title, prefix) !== 1 || !title.startsWith(prefix)) return null;
  return exactPiece(title.slice(prefix.length));
}

/** The value before a fixed ending, only when that ending appears once. */
function beforePhrase(title: string, ending: string): string | null {
  if (phraseCount(title, ending) !== 1 || !title.endsWith(ending)) return null;
  return exactPiece(title.slice(0, -ending.length));
}

function exactTitle(
  n: AppNotification,
  t: Translate,
  type: NotificationType,
  stored: string,
  key: string,
): NoticeCopy | null {
  if (n.type !== type || n.title !== stored) return null;
  return { title: t(key), body: n.body };
}

function clubVerificationApprovedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  return exactTitle(n, t, 'club_verification_approved', 'Your club page is verified', 'messaging.clubPageVerified');
}

function clubVerificationRejectedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  return exactTitle(
    n,
    t,
    'club_verification_rejected',
    'Your club verification was not approved',
    'messaging.clubVerificationRejected',
  );
}

function clubVerificationMoreInfoCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  return exactTitle(
    n,
    t,
    'club_verification_more_info',
    'We need more information to verify your club',
    'messaging.clubVerificationMoreInfo',
  );
}

function clubInviteAcceptedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  return exactTitle(n, t, 'club_invite_accepted', 'Your invitation was accepted', 'messaging.clubInviteAccepted');
}

function guardianConsentGrantedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  return exactTitle(n, t, 'guardian_consent_granted', 'Your parent approved your account', 'messaging.guardianApproved');
}

function guardianConsentChangedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  return exactTitle(
    n,
    t,
    'guardian_consent_changed',
    'Your parent changed what you can do',
    'messaging.guardianChanged',
  );
}

function guardianConsentRevokedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'guardian_consent_revoked') return null;
  if (n.title === 'Your parent did not approve your request') {
    return { title: t('messaging.guardianNotApproved'), body: n.body };
  }
  if (n.title === 'Your parent approval was withdrawn') {
    return { title: t('messaging.guardianWithdrawn'), body: n.body };
  }
  return null;
}

const GI_ENDING = ' finished the Game Intelligence games';
const GI_BODY = 'Their results are private unless they choose to share them.';

function giCompletedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'gi_completed') return null;
  const found = namedSplit(n.title, GI_ENDING, n.actor?.full_name);
  if (!found || found.rest !== '') return null;
  return {
    title: t('messaging.giCompleted', { name: found.name }),
    body: n.body === GI_BODY ? t('messaging.giCompletedPrivate') : n.body,
  };
}

const SPORT_FIT_ENDING = ' completed Sport Fit';
const SPORT_FIT_BODY = 'Their answers and result are private to them.';

function sportFitCompletedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'sport_fit_completed') return null;
  const found = namedSplit(n.title, SPORT_FIT_ENDING, n.actor?.full_name);
  if (!found || found.rest !== '') return null;
  return {
    title: t('messaging.sportFitCompleted', { name: found.name }),
    body: n.body === SPORT_FIT_BODY ? t('messaging.sportFitPrivate') : n.body,
  };
}

/** The same names the score card reads out. English initcap matches the stored title. */
const TIER_LABEL_KEY: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && value in TIER_LABEL_KEY;
}

/**
 * "You reached Gold tier" / "Your Talent Score is now 80."
 *
 * Both come from `data.tier` and `data.overall`. The stored sentences have
 * to be exactly the English those two fields produce; otherwise we keep them.
 */
function scoreTierCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'score_tier_up') return null;
  const tier = n.data?.tier;
  const overall = n.data?.overall;
  if (!isTier(tier) || typeof overall !== 'number' || !Number.isInteger(overall)) return null;
  if (n.title !== `You reached ${TierLabels[tier]} tier`) return null;
  if (n.body !== `Your Talent Score is now ${overall}.`) return null;
  return {
    title: t('messaging.scoreTierReached', { tier: t(TIER_LABEL_KEY[tier]) }),
    body: t('messaging.scoreTierNow', { score: overall }),
  };
}

function clubInviteCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'club_invite') return null;
  const club = afterPhrase(n.title, 'You were invited to help run ');
  if (!club) return null;
  return { title: t('messaging.clubInviteRun', { club }), body: n.body };
}

function clubEventCancelledCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'club_event_cancelled') return null;
  const event = beforePhrase(n.title, ' was cancelled');
  if (!event) return null;
  return { title: t('messaging.clubEventCancelled', { event }), body: n.body };
}

const REGISTERED_FOR = ' registered for ';

/** "{name} registered for {event}". A minor notice may say "Your child" instead of a name. */
function clubEventRegistrationCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'club_event_registration' && n.type !== 'club_event_registration_minor') return null;
  const found = namedSplit(n.title, REGISTERED_FOR, n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  const child = n.type === 'club_event_registration_minor' && found.name === 'Your child';
  return {
    title: child
      ? t('messaging.clubEventChildRegistered', { event: found.rest })
      : t('messaging.clubEventRegistered', { name: found.name, event: found.rest }),
    body: n.body,
  };
}

const SQUAD_PHRASE = ' added you to its ';
const SQUAD_ENDING = ' squad';

/** "{club} added you to its {squad} squad". The squad is everything between "its " and " squad". */
function clubSquadLinkCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'club_squad_link') return null;
  if (phraseCount(n.title, SQUAD_PHRASE) !== 1) return null;
  const at = n.title.indexOf(SQUAD_PHRASE);
  const club = exactPiece(n.title.slice(0, at));
  const after = n.title.slice(at + SQUAD_PHRASE.length);
  if (!club || phraseCount(after, SQUAD_ENDING) !== 1 || !after.endsWith(SQUAD_ENDING)) return null;
  const squad = exactPiece(after.slice(0, -SQUAD_ENDING.length));
  if (!squad) return null;
  return { title: t('messaging.clubSquadAdded', { club, squad }), body: n.body };
}

const VERSUS = ' vs ';
const LIVE_ENDING = ' is live';

/** "{club} vs {opponent} is live". " vs " has to appear exactly once. */
function clubMatchLiveCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'club_match_live') return null;
  if (phraseCount(n.title, VERSUS) !== 1 || !n.title.endsWith(LIVE_ENDING)) return null;
  const head = n.title.slice(0, -LIVE_ENDING.length);
  const at = head.indexOf(VERSUS);
  if (at < 0) return null;
  const club = exactPiece(head.slice(0, at));
  const opponent = exactPiece(head.slice(at + VERSUS.length));
  if (!club || !opponent) return null;
  return { title: t('messaging.clubMatchLive', { club, opponent }), body: n.body };
}

function meetupRequestCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'meetup_request') return null;
  const found = namedSplit(n.title, ' wants to join ', n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  return { title: t('messaging.meetupWantsToJoin', { name: found.name, meetup: found.rest }), body: n.body };
}

function meetupAcceptedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'meetup_accepted') return null;
  const meetup = afterPhrase(n.title, 'You are in: ');
  if (!meetup) return null;
  return { title: t('messaging.meetupYouAreIn', { meetup }), body: meetupWhen(n) };
}

function meetupDeclinedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'meetup_declined') return null;
  const meetup = afterPhrase(n.title, 'Not this time: ');
  if (!meetup) return null;
  return { title: t('messaging.meetupNotThisTime', { meetup }), body: n.body };
}

function meetupCancelledCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'meetup_cancelled') return null;
  const meetup = beforePhrase(n.title, ' was called off');
  if (!meetup) return null;
  return { title: t('messaging.meetupCalledOff', { meetup }), body: meetupWhen(n) };
}

const NEW_CLIP = 'A new clip is waiting for you.';

/** "{name} entered {challenge}". Only the default clip line is translated; a coach's note stays. */
function challengeEntryCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'challenge_entry') return null;
  const found = namedSplit(n.title, ' entered ', n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  return {
    title: t('messaging.challengeEntered', { name: found.name, challenge: found.rest }),
    body: n.body === NEW_CLIP ? t('messaging.challengeNewClip') : n.body,
  };
}

/** "{name} applied to {opportunity}". */
function applicationReceivedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'application_received') return null;
  const found = namedSplit(n.title, ' applied to ', n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  return { title: t('messaging.appliedTo', { name: found.name, what: found.rest }), body: n.body };
}

const APPLICATION_STATUSES = new Set([
  'applied',
  'in_review',
  'shortlisted',
  'invited',
  'accepted',
  'rejected',
  'withdrawn',
]);

/**
 * "Your application to {opportunity} is now {status}".
 *
 * The status word has to be `data.status`, and one of the statuses the
 * opportunity screen already names. The label replaces the raw word, so
 * English no longer shows "in_review".
 */
function applicationStatusCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'application_status') return null;
  const prefix = 'Your application to ';
  const gap = ' is now ';
  if (!n.title.startsWith(prefix)) return null;
  const rest = n.title.slice(prefix.length);
  if (phraseCount(rest, gap) !== 1) return null;
  const at = rest.indexOf(gap);
  const opportunity = exactPiece(rest.slice(0, at));
  const status = exactPiece(rest.slice(at + gap.length));
  const recorded = n.data?.status;
  if (!opportunity || !status || typeof recorded !== 'string' || recorded !== status) return null;
  if (!APPLICATION_STATUSES.has(status)) return null;
  return {
    title: t('messaging.applicationNow', {
      opportunity,
      status: t(`opportunities.status.athlete.${status}`),
    }),
    body: n.body,
  };
}

/** "{name} endorsed you for {skill}". The body is the coach's note, kept as stored. */
function endorsementCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'endorsement') return null;
  const found = namedSplit(n.title, ' endorsed you for ', n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  return { title: t('messaging.endorsedYouFor', { name: found.name, skill: found.rest }), body: n.body };
}

/** "{name} booked {service}". */
function coachingBookedCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'coaching_booked') return null;
  const found = namedSplit(n.title, ' booked ', n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  return { title: t('messaging.bookedService', { name: found.name, service: found.rest }), body: n.body };
}

const ENGLISH_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "16 Nov": two digits, one space, an English month. The year is not in the sentence. */
function sessionDay(text: string): string | null {
  const match = /^(\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = ENGLISH_MONTHS.indexOf(match[2] as (typeof ENGLISH_MONTHS)[number]);
  if (month < 0 || day < 1 || day > 31) return null;
  // 2024 is a leap year, so the 29th of February still has a day to format.
  const utc = new Date(Date.UTC(2024, month, day));
  if (utc.getUTCMonth() !== month || utc.getUTCDate() !== day) return null;
  return new Intl.DateTimeFormat(intlLocale(currentLanguage()), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(utc);
}

/** A cancelled booking with no service title says "a session". */
function sessionWord(session: string, t: Translate): string {
  return session === 'a session' ? t('messaging.aSession') : session;
}

/**
 * Several cancellation sentences share this type. The first exact one wins,
 * so a dated session is not read as "{name} cancelled {session}", and a
 * parent's cancellation is not read as a name.
 */
function coachingCancelledCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'coaching_cancelled') return null;
  if (n.title === 'A booking was cancelled by a guardian') {
    return { title: t('messaging.bookingCancelledByGuardian'), body: n.body };
  }
  const reason = afterPhrase(n.title, 'AceAiX cancelled a coaching session: ');
  if (reason) return { title: t('messaging.coachingCancelledByAce', { reason }), body: n.body };

  const dated = namedSplit(n.title, ' cancelled the session on ', n.actor?.full_name);
  const date = dated ? sessionDay(dated.rest) : null;
  if (dated && date) {
    return { title: t('messaging.cancelledSessionOn', { name: dated.name, date }), body: n.body };
  }

  const yours = afterPhrase(n.title, 'Your parent cancelled ');
  if (yours) return { title: t('messaging.parentCancelled', { session: sessionWord(yours, t) }), body: n.body };

  const parentPhrase = "'s parent cancelled ";
  if (phraseCount(n.title, parentPhrase) === 1) {
    const at = n.title.indexOf(parentPhrase);
    const child = exactPiece(n.title.slice(0, at));
    const session = exactPiece(n.title.slice(at + parentPhrase.length));
    if (child && session) {
      return {
        title: t('messaging.childParentCancelled', { child, session: sessionWord(session, t) }),
        body: n.body,
      };
    }
  }

  const actor = n.actor?.full_name?.trim();
  if (actor && n.title.startsWith(`${actor} cancelled `)) {
    const session = exactPiece(n.title.slice(actor.length + ' cancelled '.length));
    if (session) {
      return { title: t('messaging.cancelledSession', { name: actor, session: sessionWord(session, t) }), body: n.body };
    }
  }
  return null;
}

/**
 * The sponsor in the sentence is a company name, which is not the actor's
 * name, so the phrase is split once rather than taken from the actor.
 */
function sponsorshipOfferCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'sponsorship_offer') return null;
  const toChild = namedSplit(n.title, ' made a sponsorship offer to your child', null);
  if (toChild && toChild.rest === '') {
    return { title: t('messaging.sponsorshipOfferToChild', { sponsor: toChild.name }), body: n.body };
  }
  const found = namedSplit(n.title, ' made a sponsorship offer for ', null);
  if (!found || exactPiece(found.rest) === null) return null;
  return {
    title: t('messaging.sponsorshipOfferFor', { sponsor: found.name, request: found.rest }),
    body: n.body,
  };
}

/** "{name} applied to {call}", or the guardian's "Your child applied…" line. */
function sponsorshipApplicationCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'sponsorship_application') return null;
  const call = afterPhrase(n.title, 'Your child applied to a sponsorship call: ');
  if (call) return { title: t('messaging.childAppliedToCall', { call }), body: n.body };
  const found = namedSplit(n.title, ' applied to ', n.actor?.full_name);
  if (!found || exactPiece(found.rest) === null) return null;
  const name = found.name === 'An athlete' ? t('messaging.anAthlete') : found.name;
  return { title: t('messaging.appliedTo', { name, what: found.rest }), body: n.body };
}

const PARENT_RESPONSES: { ending: string; key: string }[] = [
  { ending: "'s parent accepted your sponsorship offer", key: 'messaging.childParentAcceptedOffer' },
  { ending: "'s parent declined your sponsorship offer", key: 'messaging.childParentDeclinedOffer' },
  { ending: "'s parent withdrew the application to your call", key: 'messaging.childParentWithdrewCall' },
];

const NAMED_RESPONSES: { phrase: string; key: string }[] = [
  { phrase: ' accepted your sponsorship offer', key: 'messaging.acceptedYourOffer' },
  { phrase: ' declined your sponsorship offer', key: 'messaging.declinedYourOffer' },
  { phrase: ' accepted your sponsorship application', key: 'messaging.acceptedYourApplication' },
  { phrase: ' declined your sponsorship application', key: 'messaging.declinedYourApplication' },
];

/** The name before an ending, only when that ending appears once and finishes the title. */
function nameBeforeEnding(title: string, ending: string): string | null {
  if (phraseCount(title, ending) !== 1 || !title.endsWith(ending)) return null;
  return exactPiece(title.slice(0, -ending.length));
}

/**
 * Who answered a sponsorship deal. The "{child}'s parent" sentences are
 * recognised before "{name} accepted…", because the parent sentence also
 * ends with the name sentence.
 */
function sponsorshipResponseCopy(n: AppNotification, t: Translate): NoticeCopy | null {
  if (n.type !== 'sponsorship_response') return null;
  for (const row of PARENT_RESPONSES) {
    const child = nameBeforeEnding(n.title, row.ending);
    if (child) return { title: t(row.key, { child }), body: n.body };
  }
  for (const row of NAMED_RESPONSES) {
    const found = namedSplit(n.title, row.phrase, n.actor?.full_name);
    if (found && found.rest === '') return { title: t(row.key, { name: found.name }), body: n.body };
  }
  const acceptedFrom = afterPhrase(n.title, 'Your parent accepted the sponsorship offer from ');
  if (acceptedFrom) return { title: t('messaging.parentAcceptedOfferFrom', { brand: acceptedFrom }), body: n.body };
  const declinedFrom = afterPhrase(n.title, 'Your parent declined the sponsorship offer from ');
  if (declinedFrom) return { title: t('messaging.parentDeclinedOfferFrom', { brand: declinedFrom }), body: n.body };
  const withdrew = afterPhrase(n.title, 'Your parent withdrew your application to ');
  if (withdrew) return { title: t('messaging.parentWithdrewApplication', { brand: withdrew }), body: n.body };
  return (
    exactTitle(n, t, 'sponsorship_response', 'A sponsorship offer for your child was accepted', 'messaging.childOfferAccepted') ??
    exactTitle(n, t, 'sponsorship_response', 'A sponsorship offer for your child was declined', 'messaging.childOfferDeclined') ??
    exactTitle(
      n,
      t,
      'sponsorship_response',
      'A sponsorship application for your child was accepted',
      'messaging.childApplicationAccepted',
    ) ??
    exactTitle(
      n,
      t,
      'sponsorship_response',
      'A sponsorship application for your child was declined',
      'messaging.childApplicationDeclined',
    )
  );
}

const MEETUP_WHEN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{2}):(\d{2})$/;

/**
 * The stored line is "{city} · {Mon DD, HH:MI}" in UTC, with no year. The
 * year is the one that puts that UTC moment closest to when the notice was
 * written; the clock is then the phone's own.
 */
function meetupWhen(n: AppNotification): string | null {
  const body = n.body;
  if (!body) return body;
  const sep = ' · ';
  if (phraseCount(body, sep) !== 1) return body;
  const at = body.indexOf(sep);
  const city = exactPiece(body.slice(0, at));
  const match = MEETUP_WHEN.exec(body.slice(at + sep.length));
  if (!city || !match) return body;
  const month = ENGLISH_MONTHS.indexOf(match[1] as (typeof ENGLISH_MONTHS)[number]);
  const day = Number(match[2]);
  const hour = Number(match[3]);
  const minute = Number(match[4]);
  if (month < 0 || hour > 23 || minute > 59 || day < 1 || day > 31) return body;
  const created = new Date(n.created_at);
  if (Number.isNaN(created.getTime())) return body;
  const year = created.getUTCFullYear();
  let best: Date | null = null;
  let bestDist = Infinity;
  for (const candidateYear of [year - 1, year, year + 1]) {
    const candidate = new Date(Date.UTC(candidateYear, month, day, hour, minute));
    if (
      candidate.getUTCFullYear() !== candidateYear ||
      candidate.getUTCMonth() !== month ||
      candidate.getUTCDate() !== day
    ) {
      continue;
    }
    const dist = Math.abs(candidate.getTime() - created.getTime());
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  if (!best) return body;
  const formatted = new Intl.DateTimeFormat(intlLocale(currentLanguage()), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(best);
  return `${city} · ${formatted}`;
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
  const tagged = tagCopy(n, t);
  if (tagged) return tagged;
  const referral = referralCopy(n, t);
  if (referral) return referral;
  const sportRequest = sportRequestCopy(n, t);
  if (sportRequest) return sportRequest;
  const actor = actorCopy(n, t);
  if (actor) return actor;
  const challenge = challengeResultCopy(n, t);
  if (challenge) return challenge;
  const recognised =
    clubVerificationApprovedCopy(n, t) ??
    clubVerificationRejectedCopy(n, t) ??
    clubVerificationMoreInfoCopy(n, t) ??
    clubInviteAcceptedCopy(n, t) ??
    guardianConsentGrantedCopy(n, t) ??
    guardianConsentChangedCopy(n, t) ??
    guardianConsentRevokedCopy(n, t) ??
    giCompletedCopy(n, t) ??
    sportFitCompletedCopy(n, t) ??
    scoreTierCopy(n, t) ??
    clubInviteCopy(n, t) ??
    clubEventCancelledCopy(n, t) ??
    clubEventRegistrationCopy(n, t) ??
    clubSquadLinkCopy(n, t) ??
    clubMatchLiveCopy(n, t) ??
    meetupRequestCopy(n, t) ??
    meetupAcceptedCopy(n, t) ??
    meetupDeclinedCopy(n, t) ??
    meetupCancelledCopy(n, t) ??
    challengeEntryCopy(n, t) ??
    applicationReceivedCopy(n, t) ??
    applicationStatusCopy(n, t) ??
    endorsementCopy(n, t) ??
    coachingBookedCopy(n, t) ??
    coachingCancelledCopy(n, t) ??
    sponsorshipOfferCopy(n, t) ??
    sponsorshipApplicationCopy(n, t) ??
    sponsorshipResponseCopy(n, t);
  if (recognised) return recognised;
  const body =
    n.type === 'meetup_accepted' || n.type === 'meetup_cancelled' ? meetupWhen(n) : n.body;
  return { title: notificationTitle(n, t), body };
}

interface Props {
  notification: AppNotification;
  /** Omitted when the notification has no destination. */
  onPress?: () => void;
  /** Draw as one row of a white card (see groupedRowStyle). */
  grouped?: ViewStyle;
  /** The post's picture, on the right of a like or a comment. */
  thumbUri?: string | null;
  /** The same person liked this many of your posts: one row says so. */
  postCount?: number;
  /** A new follower: offer Follow back right on the row. */
  follow?: { following: boolean; pending: boolean; onPress: () => void };
}

export function NotificationRow({ notification, onPress, grouped, thumbUri, postCount = 1, follow }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();

  const skin = skinFor(notification.type);
  const tint = colors[skin.tint];
  const unread = !notification.is_read;
  /* Sentences we can recognise are composed here. The rest stay as stored —
     see the note above `notificationTitle`. */
  const copy = notificationCopy(notification, t);
  const name = notification.actor?.full_name?.trim() ?? '';
  const title =
    postCount > 1 && notification.type === 'like' && name
      ? t('messaging.likedYourPosts', { name, count: postCount })
      : copy.title;
  const body = copy.body;
  const when = relativeTime(notification.created_at);

  /* The person's name in bold, so who it is reads first; the time sits at
     the end of the sentence. */
  const lead = name && title.startsWith(name) ? name : null;
  const rest = lead ? title.slice(lead.length) : title;

  const badgeTint = skin.tint === 'textSecondary' ? colors.textMuted : tint;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 64,
        paddingHorizontal: grouped ? spacing.md : spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <View>
        {notification.actor_id ? (
          <Avatar uri={notification.actor?.avatar_url} name={notification.actor?.full_name} size="md" />
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
          /* Solid colour with a white icon: readable at a glance. */
          <View
            style={{
              position: 'absolute',
              right: -3,
              bottom: -3,
              width: 20,
              height: 20,
              borderRadius: radii.pill,
              backgroundColor: badgeTint,
              borderWidth: 2,
              borderColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <skin.Icon size={10} color="#FFFFFF" strokeWidth={2.8} />
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" numberOfLines={3}>
          {lead ? <Text variant="bodyStrong">{lead}</Text> : null}
          {rest}
          {when ? (
            <Text variant="caption" tone="muted">
              {'  '}
              {when}
            </Text>
          ) : null}
        </Text>
        {body ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {body}
          </Text>
        ) : null}
      </View>

      {follow ? (
        <FollowButton
          following={follow.following}
          pending={follow.pending}
          onPress={follow.onPress}
          name={name}
          back
        />
      ) : thumbUri ? (
        <RemoteImage
          uri={thumbUri}
          style={{ width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt }}
        />
      ) : null}

      {unread ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: radii.pill,
            backgroundColor: LogoColors.flame,
          }}
        />
      ) : null}
    </View>
  );

  /* Unread rows carry a light blue tint inside the card. */
  const fill = unread ? theme.alpha(colors.primary, theme.scheme === 'dark' ? 0.14 : 0.06) : grouped ? colors.surface : colors.bg;

  if (!onPress) {
    // Still announced, just not offered as a button.
    return (
      <View
        accessible
        accessibilityLabel={[title, body, when].filter(Boolean).join('. ')}
        style={[grouped, { backgroundColor: fill }]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, body, when, unread ? t('messaging.unread') : null].filter(Boolean).join('. ')}
      style={({ pressed }) => [grouped, { backgroundColor: pressed ? colors.surfaceSunken : fill }]}
    >
      {content}
    </Pressable>
  );
}

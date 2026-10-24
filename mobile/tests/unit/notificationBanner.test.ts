import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Pressable: () => null,
  View: () => null,
  Platform: { OS: 'ios', select: (options: { ios?: unknown }) => options.ios },
  I18nManager: { isRTL: false },
  NativeModules: {},
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock('lucide-react-native', () => {
  const Icon = () => null;
  return {
    AtSign: Icon,
    Award: Icon,
    Bell: Icon,
    Building2: Icon,
    Megaphone: Icon,
    Radio: Icon,
    ShieldCheck: Icon,
    Trophy: Icon,
    Briefcase: Icon,
    Handshake: Icon,
    CalendarCheck: Icon,
    CalendarX: Icon,
    ClipboardCheck: Icon,
    Eye: Icon,
    Heart: Icon,
    Mail: Icon,
    MessageCircle: Icon,
    TrendingUp: Icon,
    UserPlus: Icon,
    Users: Icon,
  };
});

vi.mock('@/components/ui', () => ({
  Avatar: () => null,
  Text: () => null,
}));

vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({}),
}));

vi.mock('@/i18n', () => ({
  useT: () => (key: string) => key,
}));

import { notificationCopy } from '@/components/messaging/NotificationRow';
import { en } from '@/i18n/locales/en';
import {
  applyHydratedRow,
  bannerEventFromPayload,
  bannerText,
  isUnreadNotification,
  newerBannerEvent,
  rowNeedsHydration,
  shouldShowBanner,
  type BannerContext,
  type BannerEvent,
  type BannerRow,
} from '@/lib/notificationBanner';
import { getOpenConversation, setOpenConversation } from '@/lib/openScreen';
import type { Translate } from '@/lib/i18n-bridge';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * Banner rules.
 *
 * The commit time and the row timestamps are both server times. A case whose
 * timestamps are years behind the test runner must still show, which is how
 * we know the phone clock is not part of the decision.
 */

const COMMIT = '2020-06-01T12:00:00.000Z';

function at(offsetMs: number): string {
  return new Date(Date.parse(COMMIT) + offsetMs).toISOString();
}

function event(over: Partial<Omit<BannerEvent, 'row'>> & { row?: Partial<BannerRow> } = {}): BannerEvent {
  const { row, ...rest } = over;
  return {
    eventType: 'INSERT',
    commitTimestamp: COMMIT,
    ...rest,
    row: {
      id: 'n1',
      type: 'like',
      title: 'Sam liked your post',
      body: null,
      is_read: false,
      read: false,
      entity_type: 'post',
      entity_id: 'post-1',
      created_at: COMMIT,
      updated_at: COMMIT,
      ...row,
    },
  };
}

function ctx(over: Partial<BannerContext> = {}): BannerContext {
  return { openConversation: null, path: '/', ...over };
}

describe('shouldShowBanner', () => {
  describe('INSERT', () => {
    it('shows a like, follow, or any other insert', () => {
      expect(shouldShowBanner(event(), ctx())).toBe('show');
      expect(shouldShowBanner(event({ row: { type: 'follow', entity_type: 'user' } }), ctx())).toBe('show');
      expect(shouldShowBanner(event({ row: { type: 'club_match_live', entity_type: 'club_match' } }), ctx())).toBe('show');
    });

    it('shows an insert that has no actor', () => {
      for (const type of ['score_tier_up', 'system', 'club_verification_approved', 'challenge_verified']) {
        expect(
          shouldShowBanner(
            event({
              row: {
                type,
                title: 'You reached Gold tier',
                body: 'Your Talent Score is now 80.',
                actor_id: null,
                entity_type: type === 'system' ? 'moderation' : 'score',
                entity_id: null,
              },
            }),
            ctx(),
          ),
        ).toBe('show');
      }
    });

    it('shows an insert even when the row is already marked read and the timestamps are old', () => {
      expect(
        shouldShowBanner(
          event({
            row: { is_read: true, read: true, created_at: '2010-01-01T00:00:00.000Z' },
          }),
          ctx(),
        ),
      ).toBe('show');
    });
  });

  describe('UPDATE', () => {
    const fresh = { eventType: 'UPDATE' as const };

    it('shows an unread update whose activity is within 3 seconds of the commit', () => {
      expect(
        shouldShowBanner(event({ ...fresh, row: { created_at: at(3000), updated_at: at(3000) } }), ctx()),
      ).toBe('show');
      expect(
        shouldShowBanner(event({ ...fresh, row: { created_at: at(-3000), updated_at: at(-3000) } }), ctx()),
      ).toBe('show');
    });

    it('uses the later of created_at and updated_at', () => {
      expect(
        shouldShowBanner(
          event({
            ...fresh,
            row: { created_at: at(-60_000), updated_at: at(1000) },
          }),
          ctx(),
        ),
      ).toBe('show');
      expect(
        shouldShowBanner(
          event({
            ...fresh,
            row: { created_at: at(500), updated_at: at(-60_000) },
          }),
          ctx(),
        ),
      ).toBe('show');
    });

    it('skips an update that is only a mark-as-read', () => {
      expect(shouldShowBanner(event({ ...fresh, row: { is_read: true, read: true } }), ctx())).toBe('skip:read');
      expect(shouldShowBanner(event({ ...fresh, row: { is_read: true, read: false } }), ctx())).toBe('skip:read');
      expect(shouldShowBanner(event({ ...fresh, row: { is_read: false, read: true } }), ctx())).toBe('skip:read');
    });

    it('skips an update unless both is_read and the legacy read flag are false', () => {
      expect(shouldShowBanner(event({ ...fresh, row: { is_read: false, read: null } }), ctx())).toBe('skip:read');
      expect(shouldShowBanner(event({ ...fresh, row: { is_read: null, read: false } }), ctx())).toBe('skip:read');
      expect(shouldShowBanner(event({ ...fresh, row: { is_read: false, read: undefined } }), ctx())).toBe('skip:read');
    });

    it('skips an unread update whose activity is more than 3 seconds from the commit', () => {
      expect(shouldShowBanner(event({ ...fresh, row: { created_at: at(3001), updated_at: at(3001) } }), ctx())).toBe(
        'skip:stale',
      );
      expect(shouldShowBanner(event({ ...fresh, row: { created_at: at(-3001), updated_at: at(-3001) } }), ctx())).toBe(
        'skip:stale',
      );
    });

    it('skips an unread update with no server time to compare', () => {
      expect(shouldShowBanner(event({ ...fresh, commitTimestamp: null }), ctx())).toBe('skip:stale');
      expect(
        shouldShowBanner(event({ ...fresh, row: { created_at: null, updated_at: null } }), ctx()),
      ).toBe('skip:stale');
      expect(
        shouldShowBanner(event({ ...fresh, row: { created_at: 'not-a-time', updated_at: null } }), ctx()),
      ).toBe('skip:stale');
    });

    it('compares the commit time with the row, not the phone clock', () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(0);
      try {
        expect(
          shouldShowBanner(
            event({
              ...fresh,
              commitTimestamp: '2020-06-01T12:00:00.000000Z',
              row: { created_at: '2020-06-01T12:00:00.000Z', updated_at: '2020-06-01T12:00:01.000Z' },
            }),
            ctx(),
          ),
        ).toBe('show');
        expect(now).not.toHaveBeenCalled();
      } finally {
        now.mockRestore();
      }
    });
  });

  describe('the notifications list', () => {
    it('skips every row while that screen is open', () => {
      for (const path of ['/notifications', '/notifications/', '/notifications?x=1']) {
        expect(shouldShowBanner(event(), ctx({ path }))).toBe('skip:notifications');
        expect(shouldShowBanner(event({ eventType: 'UPDATE' }), ctx({ path }))).toBe('skip:notifications');
      }
    });

    it('does not treat Settings → Notifications as that screen', () => {
      for (const path of ['/settings/notifications', '/settings/notifications/', '/settings/notifications?x=1']) {
        expect(shouldShowBanner(event(), ctx({ path }))).toBe('show');
      }
    });
  });

  describe('the open chat', () => {
    const message = {
      type: 'message',
      entity_type: 'conversation',
      entity_id: 'conv-9',
    };

    it('skips a message for the conversation that is open', () => {
      const open = ctx({ openConversation: 'conv-9', path: '/chat/conv-9' });
      expect(shouldShowBanner(event({ row: message }), open)).toBe('skip:open-conversation');
      expect(shouldShowBanner(event({ eventType: 'UPDATE', row: message }), open)).toBe('skip:open-conversation');
    });

    it('skips when the type is message even if the entity type is something else', () => {
      expect(
        shouldShowBanner(
          event({ row: { type: 'message', entity_type: 'post', entity_id: 'conv-9' } }),
          ctx({ openConversation: 'conv-9' }),
        ),
      ).toBe('skip:open-conversation');
    });

    it('skips when the entity is a conversation even if the type is not message', () => {
      expect(
        shouldShowBanner(
          event({ row: { type: 'like', entity_type: 'conversation', entity_id: 'conv-9' } }),
          ctx({ openConversation: 'conv-9' }),
        ),
      ).toBe('skip:open-conversation');
    });

    it('shows a message for a different conversation', () => {
      expect(
        shouldShowBanner(event({ row: message }), ctx({ openConversation: 'conv-other', path: '/chat/conv-other' })),
      ).toBe('show');
    });

    it('shows a message when no conversation is open, even if the path looks like that chat', () => {
      expect(shouldShowBanner(event({ row: message }), ctx({ openConversation: null, path: '/chat/conv-9' }))).toBe(
        'show',
      );
    });

    it('does not treat a missing entity id as the open conversation', () => {
      expect(
        shouldShowBanner(
          event({ row: { type: 'message', entity_type: 'conversation', entity_id: null } }),
          ctx({ openConversation: null }),
        ),
      ).toBe('show');
      expect(
        shouldShowBanner(
          event({ row: { type: 'message', entity_type: 'conversation', entity_id: null } }),
          ctx({ openConversation: 'conv-9' }),
        ),
      ).toBe('show');
    });

    it('still shows a like while a chat is open', () => {
      expect(shouldShowBanner(event(), ctx({ openConversation: 'conv-9', path: '/chat/conv-9' }))).toBe('show');
    });

    it('names the open conversation ahead of the inbox when both match', () => {
      expect(
        shouldShowBanner(event({ row: message }), ctx({ openConversation: 'conv-9', path: '/inbox' })),
      ).toBe('skip:open-conversation');
    });
  });

  describe('the inbox', () => {
    const message = { type: 'message', entity_type: 'conversation', entity_id: 'conv-9' };

    it('skips a message while the inbox is open', () => {
      for (const path of ['/inbox', '/inbox/', '/inbox?x=1']) {
        expect(shouldShowBanner(event({ row: message }), ctx({ path }))).toBe('skip:inbox');
        expect(shouldShowBanner(event({ eventType: 'UPDATE', row: message }), ctx({ path }))).toBe('skip:inbox');
      }
    });

    it('still shows a like on the inbox', () => {
      expect(shouldShowBanner(event(), ctx({ path: '/inbox' }))).toBe('show');
    });
  });

  describe('other events', () => {
    it('skips a delete', () => {
      expect(shouldShowBanner(event({ eventType: 'DELETE' }), ctx())).toBe('skip:event');
    });

    it('skips a delete even while the notifications list is open', () => {
      expect(shouldShowBanner(event({ eventType: 'DELETE' }), ctx({ path: '/notifications' }))).toBe('skip:event');
    });
  });

  it('reads is_read and the legacy read flag off a realtime payload', () => {
    const parsed = bannerEventFromPayload({
      eventType: 'UPDATE',
      commit_timestamp: '2020-06-01T12:00:00.000000Z',
      new: {
        type: 'like',
        entity_type: 'post',
        entity_id: 'post-1',
        is_read: false,
        read: true,
        created_at: COMMIT,
        updated_at: COMMIT,
      },
    });
    expect(isUnreadNotification(parsed.row)).toBe(false);
    expect(shouldShowBanner(parsed, ctx())).toBe('skip:read');
  });
});

describe('banner text', () => {
  it('joins the title and body the row shows, and keeps a title that has no body', () => {
    expect(bannerText('You reached Gold tier', 'Your Talent Score is now 80.')).toBe(
      'You reached Gold tier\nYour Talent Score is now 80.',
    );
    expect(bannerText('Sam started following you', null)).toBe('Sam started following you');
    expect(bannerText('  ', null)).toBe('');
  });
});

describe('partial realtime rows', () => {
  it('reads jsonb data and actor_count when they arrive as strings', () => {
    const parsed = bannerEventFromPayload({
      eventType: 'INSERT',
      commit_timestamp: COMMIT,
      new: {
        id: 'n1',
        type: 'meetup_nearby',
        title: 'New football game in Dubai',
        body: 'Tuesday kickabout',
        actor_count: '2',
        data: '{"sport":"football","city":"Dubai","title":"Tuesday kickabout"}',
        is_read: false,
        read: false,
        created_at: COMMIT,
        updated_at: COMMIT,
      },
    });
    expect(parsed.row.actor_count).toBe(2);
    expect(parsed.row.data).toEqual({
      sport: 'football',
      city: 'Dubai',
      title: 'Tuesday kickabout',
    });
    expect(rowNeedsHydration(parsed)).toBe(false);
  });

  it('loads the stored row when an update left out the tap target', () => {
    const partial = event({
      eventType: 'UPDATE',
      row: {
        type: undefined,
        title: 'Sam liked your post',
        entity_type: null,
        entity_id: null,
        actor_count: null,
        data: null,
      },
    });
    expect(rowNeedsHydration(partial)).toBe(true);
    const filled = applyHydratedRow(partial, {
      type: 'like',
      entity_type: 'post',
      entity_id: 'post-1',
      actor_count: 3,
      data: { post_id: 'post-1' },
      is_read: true,
    });
    expect(filled.row.type).toBe('like');
    expect(filled.row.entity_type).toBe('post');
    expect(filled.row.entity_id).toBe('post-1');
    expect(filled.row.actor_count).toBe(3);
    expect(filled.row.is_read).toBe(false);
  });

  it('does not fetch a complete insert', () => {
    expect(rowNeedsHydration(event({ row: { actor_id: null, data: { tier: 'gold' } } }))).toBe(false);
  });
});

describe('newerBannerEvent', () => {
  it('keeps the row with the later server activity time', () => {
    const older = event({ row: { id: 'old', created_at: at(0) } });
    const newer = event({ row: { id: 'new', created_at: at(2000) } });
    expect(newerBannerEvent(older, newer).row.id).toBe('new');
    expect(newerBannerEvent(newer, older).row.id).toBe('new');
  });

  it('keeps the one that just arrived when the times match', () => {
    const first = event({ row: { id: 'first' } });
    const second = event({ row: { id: 'second' } });
    expect(newerBannerEvent(first, second).row.id).toBe('second');
  });
});

/** English catalogue, including plural keys such as `actorAndOthers_one`. */
const english: Translate = (key, vars) => {
  const parts = key.split('.');
  let node: unknown = en;
  for (const part of parts) {
    if (!node || typeof node !== 'object') return key;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'string' && vars && typeof vars.count === 'number') {
    const category = new Intl.PluralRules('en').select(vars.count);
    const stem = parts.slice(0, -1);
    const last = parts[parts.length - 1];
    for (const suffix of [category, 'other']) {
      let next: unknown = en;
      for (const part of [...stem, `${last}_${suffix}`]) {
        if (!next || typeof next !== 'object') {
          next = undefined;
          break;
        }
        next = (next as Record<string, unknown>)[part];
      }
      if (typeof next === 'string') {
        node = next;
        break;
      }
    }
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    vars[name] === undefined ? whole : String(vars[name]),
  );
};

/**
 * Every type the server can write, with the English sentence the notifications
 * screen shows. Mention and a nearby game are composed here; the rest keep
 * the sentence stored on the row.
 */
const NOTIFICATION_TYPES: Array<{
  type: string;
  title: string;
  expectedTitle?: string;
  actorName?: string;
  data?: Record<string, unknown>;
}> = [
  { type: 'follow', title: 'Sam started following you' },
  { type: 'message', title: 'Sam sent you a message' },
  { type: 'comment', title: 'Sam commented on your post' },
  { type: 'reply', title: 'Sam replied to you' },
  { type: 'like', title: 'Sam liked your post' },
  {
    type: 'mention',
    title: 'Sam mentioned you in a post',
    actorName: 'Sam',
    expectedTitle: 'Sam mentioned you in a post',
  },
  { type: 'application_received', title: 'Sam applied to a trial' },
  { type: 'application_status', title: 'Your application to a trial is now accepted' },
  { type: 'profile_view', title: 'Sam viewed your profile' },
  { type: 'endorsement', title: 'Sam endorsed you for pace' },
  { type: 'score_tier_up', title: 'You reached Gold tier' },
  { type: 'challenge_entry', title: 'Sam entered the sprint challenge' },
  { type: 'challenge_verified', title: 'Your sprint challenge entry is confirmed' },
  { type: 'challenge_rejected', title: 'Your sprint challenge entry needs another go' },
  { type: 'meetup_request', title: 'Sam wants to join Tuesday kickabout' },
  { type: 'meetup_accepted', title: 'You are in: Tuesday kickabout' },
  { type: 'meetup_declined', title: 'Not this time: Tuesday kickabout' },
  { type: 'meetup_cancelled', title: 'Tuesday kickabout was called off' },
  {
    type: 'meetup_nearby',
    title: 'New Football game in Dubai',
    data: { sport: 'Football', city: 'Dubai', title: 'Tuesday kickabout' },
    expectedTitle: 'New Football game in Dubai',
  },
  { type: 'sponsorship_offer', title: 'Sam made a sponsorship offer for boots' },
  { type: 'sponsorship_application', title: 'Sam applied to a summer kit call' },
  { type: 'sponsorship_response', title: 'Sam accepted your sponsorship offer' },
  { type: 'coaching_booked', title: 'Sam booked a footwork session' },
  { type: 'coaching_cancelled', title: 'Sam cancelled a session' },
  { type: 'club_invite', title: 'You were invited to help run Riverside' },
  { type: 'club_invite_accepted', title: 'Your invitation was accepted' },
  { type: 'club_broadcast', title: 'Riverside: Training moved' },
  { type: 'club_squad_link', title: 'Riverside added you to its U16 Football squad' },
  { type: 'club_event_new', title: 'Riverside: Open trial' },
  { type: 'club_event_registration', title: 'Sam registered for Open trial' },
  { type: 'club_event_registration_minor', title: 'Sam registered for Open trial' },
  { type: 'club_event_cancelled', title: 'Open trial was cancelled' },
  { type: 'club_match_scheduled', title: 'Riverside vs Marina' },
  { type: 'club_match_live', title: 'Riverside vs Marina is live' },
  { type: 'club_match_result', title: 'Riverside 2–1 Marina' },
  { type: 'club_verification_approved', title: 'Your club page is verified' },
  { type: 'club_verification_rejected', title: 'Your club verification was not approved' },
  { type: 'club_verification_more_info', title: 'We need more information to verify your club' },
  { type: 'gi_completed', title: 'Sam finished the Game Intelligence games' },
  { type: 'sport_fit_completed', title: 'Sam completed Sport Fit' },
  { type: 'system', title: 'Your account is verified' },
];

function asNotification(row: (typeof NOTIFICATION_TYPES)[number]): AppNotification {
  return {
    id: 'n1',
    type: row.type as NotificationType,
    title: row.title,
    body: null,
    is_read: false,
    actor_id: row.actorName ? 'actor-1' : null,
    entity_type: null,
    entity_id: null,
    actor_count: 1,
    data: row.data ?? {},
    created_at: COMMIT,
    actor: row.actorName ? { full_name: row.actorName, avatar_url: null } : undefined,
  };
}

describe('every notification type', () => {
  it('shows an insert and an English title for each type the server writes', () => {
    expect(NOTIFICATION_TYPES.map((row) => row.type)).toEqual([
      'follow',
      'message',
      'comment',
      'reply',
      'like',
      'mention',
      'application_received',
      'application_status',
      'profile_view',
      'endorsement',
      'score_tier_up',
      'challenge_entry',
      'challenge_verified',
      'challenge_rejected',
      'meetup_request',
      'meetup_accepted',
      'meetup_declined',
      'meetup_cancelled',
      'meetup_nearby',
      'sponsorship_offer',
      'sponsorship_application',
      'sponsorship_response',
      'coaching_booked',
      'coaching_cancelled',
      'club_invite',
      'club_invite_accepted',
      'club_broadcast',
      'club_squad_link',
      'club_event_new',
      'club_event_registration',
      'club_event_registration_minor',
      'club_event_cancelled',
      'club_match_scheduled',
      'club_match_live',
      'club_match_result',
      'club_verification_approved',
      'club_verification_rejected',
      'club_verification_more_info',
      'gi_completed',
      'sport_fit_completed',
      'system',
    ]);

    for (const row of NOTIFICATION_TYPES) {
      const inserted = event({
        row: {
          type: row.type,
          title: row.title,
          actor_id: row.actorName ? 'actor-1' : null,
          data: row.data ?? {},
        },
      });
      expect([row.type, shouldShowBanner(inserted, ctx())]).toEqual([row.type, 'show']);

      const copy = notificationCopy(asNotification(row), english);
      const title = copy.title;
      expect([row.type, title]).toEqual([row.type, row.expectedTitle ?? row.title]);
      expect(title.trim().length).toBeGreaterThan(0);
      expect(title.includes('{{')).toBe(false);
      expect(title.startsWith('messaging.')).toBe(false);
    }
  });
});

describe('open conversation claim', () => {
  it('lets the chat you just opened survive the chat you just left', () => {
    setOpenConversation(null);
    const first = setOpenConversation('conv-a');
    const second = setOpenConversation('conv-b');
    setOpenConversation(null, first);
    expect(getOpenConversation()).toBe('conv-b');
    setOpenConversation(null, second);
    expect(getOpenConversation()).toBe(null);
  });
});

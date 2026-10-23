import { describe, expect, it, vi } from 'vitest';

import {
  bannerEventFromPayload,
  isUnreadNotification,
  newerBannerEvent,
  shouldShowBanner,
  type BannerContext,
  type BannerEvent,
  type BannerRow,
} from '@/lib/notificationBanner';
import { getOpenConversation, setOpenConversation } from '@/lib/openScreen';

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

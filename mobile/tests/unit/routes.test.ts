import { describe, expect, it } from 'vitest';

import { Routes, notificationTarget } from '@/lib/routes';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * Notification routing.
 *
 * Two of the bugs this rebuild set out to fix were "notifications never
 * arrive" and "tapping one opens the wrong screen". Arrival is fixed in the
 * database; the destination is decided here, so every branch is pinned.
 */

function notification(over: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'follow' as NotificationType,
    title: 'Someone started following you',
    body: null,
    is_read: false,
    actor_id: 'actor-1',
    entity_type: 'user',
    entity_id: 'actor-1',
    actor_count: 1,
    data: {},
    created_at: '2026-09-04T10:00:00Z',
    ...over,
  };
}

describe('notificationTarget', () => {
  it('sends a message notification to that conversation, not the inbox', () => {
    const n = notification({
      type: 'message',
      entity_type: 'conversation',
      entity_id: 'conv-9',
    });
    expect(notificationTarget(n)).toBe(Routes.chat('conv-9'));
  });

  it('falls back to the inbox when a conversation id is missing', () => {
    const n = notification({ type: 'message', entity_type: 'conversation', entity_id: null });
    expect(notificationTarget(n)).toBe(Routes.inbox);
  });

  it('sends likes and comments to the post', () => {
    expect(
      notificationTarget(notification({ type: 'like', entity_type: 'post', entity_id: 'p1' })),
    ).toBe(Routes.post('p1'));
    expect(
      notificationTarget(notification({ type: 'comment', entity_type: 'post', entity_id: 'p1' })),
    ).toBe(Routes.post('p1'));
  });

  it('sends a follow to the follower profile', () => {
    expect(notificationTarget(notification())).toBe(Routes.profile('actor-1'));
  });

  it('splits the two application directions', () => {
    // A club receiving an application wants the applicant list…
    expect(
      notificationTarget(
        notification({
          type: 'application_received',
          entity_type: 'opportunity',
          entity_id: 'o1',
        }),
      ),
    ).toBe(Routes.applicants('o1'));

    // …an athlete hearing back wants the posting itself.
    expect(
      notificationTarget(
        notification({
          type: 'application_status',
          entity_type: 'opportunity',
          entity_id: 'o1',
        }),
      ),
    ).toBe(Routes.opportunity('o1'));
  });

  it('sends a score change to the score screen', () => {
    expect(
      notificationTarget(
        notification({ type: 'score_tier_up', entity_type: 'score', entity_id: 'a1' }),
      ),
    ).toBe(Routes.score);
  });

  it('falls back to the actor rather than going nowhere', () => {
    const n = notification({ entity_type: null, entity_id: null, actor_id: 'actor-7' });
    expect(notificationTarget(n)).toBe(Routes.profile('actor-7'));
  });

  it('returns null when there is genuinely nowhere to go', () => {
    const n = notification({ entity_type: null, entity_id: null, actor_id: null });
    expect(notificationTarget(n)).toBeNull();
  });
});

describe('Routes', () => {
  it('builds every parameterised path from an id', () => {
    expect(Routes.profile('u1')).toBe('/u/u1');
    expect(Routes.post('p1')).toBe('/post/p1');
    expect(Routes.chat('c1')).toBe('/chat/c1');
    expect(Routes.opportunity('o1')).toBe('/opportunity/o1');
    expect(Routes.applicants('o1')).toBe('/opportunity/o1/applicants');
    expect(Routes.organization('g1')).toBe('/org/g1');
    expect(Routes.followers('u1')).toBe('/u/u1/followers');
    expect(Routes.following('u1')).toBe('/u/u1/following');
  });
});

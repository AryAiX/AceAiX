import { describe, expect, it } from 'vitest';
import {
  canonicalConversationParticipants,
  conversationPairFilter,
  isCurrentConversationRequest,
  isUniqueViolation,
} from './conversationState';

describe('conversation creation state', () => {
  it('orders both participants consistently with the database pair constraint', () => {
    expect(canonicalConversationParticipants('user-z', 'user-a')).toEqual({
      participant_1_id: 'user-a',
      participant_2_id: 'user-z',
    });
    expect(canonicalConversationParticipants('user-a', 'user-z')).toEqual({
      participant_1_id: 'user-a',
      participant_2_id: 'user-z',
    });
  });

  it('recognizes PostgreSQL unique violations', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ code: '42501' })).toBe(false);
  });

  it('finds historical rows regardless of stored participant order', () => {
    expect(conversationPairFilter('user-a', 'user-z')).toBe(
      'and(participant_1_id.eq.user-a,participant_2_id.eq.user-z),and(participant_1_id.eq.user-z,participant_2_id.eq.user-a)',
    );
  });

  it('rejects stale deep-link results after the requested pair changes', () => {
    expect(isCurrentConversationRequest('viewer:user-b', 'viewer:user-b')).toBe(true);
    expect(isCurrentConversationRequest('viewer:user-b', 'viewer:user-a')).toBe(false);
    expect(isCurrentConversationRequest(null, 'viewer:user-a')).toBe(false);
  });
});

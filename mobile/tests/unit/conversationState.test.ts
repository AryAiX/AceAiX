import { describe, expect, it } from 'vitest';
import {
  canonicalConversationParticipants,
  conversationPairFilter,
  isUniqueViolation,
} from '@/lib/conversationState';

describe('mobile conversation creation state', () => {
  it('uses stable canonical participant ordering', () => {
    expect(canonicalConversationParticipants('user-z', 'user-a')).toEqual({
      participant_1_id: 'user-a',
      participant_2_id: 'user-z',
    });
    expect(canonicalConversationParticipants('user-a', 'user-z')).toEqual({
      participant_1_id: 'user-a',
      participant_2_id: 'user-z',
    });
  });

  it('selects either historical order and recognizes race conflicts', () => {
    expect(conversationPairFilter('user-a', 'user-z')).toBe(
      'and(participant_1_id.eq.user-a,participant_2_id.eq.user-z),and(participant_1_id.eq.user-z,participant_2_id.eq.user-a)',
    );
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ code: '42501' })).toBe(false);
  });
});

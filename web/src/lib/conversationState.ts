export interface CanonicalConversationParticipants {
  participant_1_id: string;
  participant_2_id: string;
}

export function canonicalConversationParticipants(
  userId: string,
  otherUserId: string,
): CanonicalConversationParticipants {
  const [participant_1_id, participant_2_id] = [userId, otherUserId].sort((left, right) =>
    left.toLowerCase().localeCompare(right.toLowerCase()),
  );
  return { participant_1_id, participant_2_id };
}

export function conversationPairFilter(userId: string, otherUserId: string): string {
  return [
    `and(participant_1_id.eq.${userId},participant_2_id.eq.${otherUserId})`,
    `and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${userId})`,
  ].join(',');
}

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505';
}

export function isCurrentConversationRequest(
  activeRequestKey: string | null,
  requestKey: string,
): boolean {
  return activeRequestKey === requestKey;
}

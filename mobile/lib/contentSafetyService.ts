import { supabase } from './supabase';

export type ReportedEntityType = 'post' | 'story' | 'profile' | 'message';

export async function reportContent(
  reporterId: string,
  entityType: ReportedEntityType,
  entityId: string,
  reason = 'Inappropriate content',
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('moderation_reports').insert({
    reporter_id: reporterId,
    reported_entity_type: entityType,
    reported_entity_id: entityId,
    reason,
    severity: 'medium',
    status: 'open',
  });
  return { error: error?.message ?? null };
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('user_blocks').upsert(
    { blocker_id: blockerId, blocked_id: blockedId },
    { onConflict: 'blocker_id,blocked_id' },
  );
  return { error: error?.message ?? null };
}

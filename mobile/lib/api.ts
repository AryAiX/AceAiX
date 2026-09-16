import { supabase } from './supabase';
import { AppError } from './errors';
import type {
  ActivityResult,
  AchievementKey,
  AppNotification,
  GuardianConversation,
  LinkedMinor,
  PersonResult,
  Applicant,
  Conversation,
  DiscoveredAthlete,
  DiscoveryFilters,
  FeedPost,
  FullTalentScore,
  GuardianConsent,
  MatchPreferences,
  Message,
  MessagePermission,
  NotificationPreferences,
  Opportunity,
  Organization,
  PostAudience,
  PostComment,
  PostMedia,
  Progress,
  ProfileBundle,
  Challenge,
  ChallengeEntry,
  SimulatableInput,
  Simulation,
  Team,
  TeamFan,
  ViewDigest,
  UnreadCounts,
  UserPost,
  UserSummary,
} from '@/types/models';

/**
 * Every network call the app makes lives here.
 *
 * Screens never touch `supabase` directly: they call a function that returns
 * typed data or throws an AppError with a message worth showing. That single
 * rule is what stops a screen from silently rendering an empty list because a
 * join name changed.
 */

function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw new AppError(result.error);
  return result.data as T;
}

// ── Profiles ─────────────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<ProfileBundle> {
  const { data, error } = await supabase.rpc('get_profile_bundle', { p_user: userId });
  if (error) throw new AppError(error);
  if (!data) throw new AppError('Profile not found');
  return data as ProfileBundle;
}

export async function getMyProfile(): Promise<ProfileBundle> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  return getProfile(auth.user.id);
}

export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  /** The wallpaper behind the profile header. Null clears it. */
  cover_url?: string | null;
}

export async function updateUserProfile(patch: ProfileUpdate): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase.from('user_profiles').update(patch).eq('id', auth.user.id);
  if (error) throw new AppError(error);
}

export interface AthleteUpdate {
  sport?: string | null;
  position_primary?: string | null;
  position?: string | null;
  position_secondary?: string | null;
  level?: string | null;
  league?: string | null;
  current_club?: string | null;
  current_club_id?: string | null;
  nationality?: string | null;
  dominant_foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  birth_date?: string | null;
  bio?: string | null;
  is_open_to_offers?: boolean;
}

export async function updateAthleteProfile(patch: AthleteUpdate): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('athlete_profiles')
    .update(patch)
    .eq('user_id', auth.user.id);
  if (error) throw new AppError(error);
}

export async function setDateOfBirth(isoDate: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('user_private')
    .upsert({ user_id: auth.user.id, date_of_birth: isoDate }, { onConflict: 'user_id' });
  if (error) throw new AppError(error);
}

export async function completeOnboarding(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('user_profiles')
    .update({ onboarding_completed: true })
    .eq('id', auth.user.id);
  if (error) throw new AppError(error);
}

// ── Talent score ─────────────────────────────────────────────────────────────
export async function getMyTalentScore(): Promise<FullTalentScore | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');

  const { data: athlete, error: aErr } = await supabase
    .from('athlete_profiles')
    .select('id')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (aErr) throw new AppError(aErr);
  if (!athlete) return null;

  const { data, error } = await supabase
    .from('talent_scores')
    .select('*')
    .eq('athlete_id', athlete.id)
    .maybeSingle();
  if (error) throw new AppError(error);
  return data ? toFullScore(data) : null;
}

export async function refreshMyTalentScore(): Promise<FullTalentScore | null> {
  const { data, error } = await supabase.rpc('refresh_my_talent_score');
  if (error) throw new AppError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? toFullScore(row) : null;
}

function toFullScore(row: Record<string, unknown>): FullTalentScore {
  return {
    athlete_id: row.athlete_id as string,
    overall: (row.overall as number) ?? 0,
    tier: (row.tier as FullTalentScore['tier']) ?? 'rising',
    percentile: (row.percentile as number) ?? null,
    previous_overall: (row.previous_overall as number) ?? null,
    computed_at: row.computed_at as string,
    profile_score: (row.profile_score as number) ?? 0,
    performance_score: (row.performance_score as number) ?? 0,
    media_score: (row.media_score as number) ?? 0,
    credibility_score: (row.credibility_score as number) ?? 0,
    engagement_score: (row.engagement_score as number) ?? 0,
    pillars: {
      profile: (row.profile_score as number) ?? 0,
      performance: (row.performance_score as number) ?? 0,
      media: (row.media_score as number) ?? 0,
      credibility: (row.credibility_score as number) ?? 0,
      engagement: (row.engagement_score as number) ?? 0,
    },
    tips: (row.tips as FullTalentScore['tips']) ?? [],
    inputs: (row.inputs as FullTalentScore['inputs']) ?? {},
    ai_summary: (row.ai_summary as string) ?? null,
  };
}

export async function getScoreHistory(athleteId: string) {
  const { data, error } = await supabase
    .from('talent_score_history')
    .select('overall, tier, pillars, recorded_on')
    .eq('athlete_id', athleteId)
    .order('recorded_on', { ascending: true })
    .limit(90);
  if (error) throw new AppError(error);
  return data ?? [];
}

// ── Feed ─────────────────────────────────────────────────────────────────────
export async function getFeed(params: {
  scope?: 'for_you' | 'following' | 'sport';
  sport?: string | null;
  limit?: number;
  before?: string | null;
}): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_scope: params.scope ?? 'for_you',
    p_sport: params.sport ?? null,
    p_limit: params.limit ?? 20,
    p_before: params.before ?? null,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as FeedPost[];
}

export async function getUserPosts(
  userId: string,
  before?: string | null,
): Promise<UserPost[]> {
  const { data, error } = await supabase.rpc('get_user_posts', {
    p_user: userId,
    p_limit: 24,
    p_before: before ?? null,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as UserPost[];
}

export async function createPost(input: {
  caption: string;
  media?: PostMedia[];
  audience?: PostAudience;
  tags?: string[];
  type?: string;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: auth.user.id,
      caption: input.caption,
      text: input.caption,
      media: input.media ?? [],
      tags: input.tags ?? [],
      audience: input.audience ?? 'public',
      type: input.type ?? (input.media?.some((m) => m.type === 'video') ? 'video' : 'standard'),
    })
    .select('id')
    .single();
  if (error) throw new AppError(error);
  return data.id as string;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw new AppError(error);
}

export async function toggleLike(postId: string) {
  const { data, error } = await supabase.rpc('toggle_post_like', { p_post: postId });
  if (error) throw new AppError(error);
  return data as { liked: boolean; like_count: number };
}

export async function toggleSave(postId: string) {
  const { data, error } = await supabase.rpc('toggle_post_save', { p_post: postId });
  if (error) throw new AppError(error);
  return data as { saved: boolean };
}

export async function getComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, author_id, body, parent_id, like_count, created_at, author:user_profiles!post_comments_author_id_fkey(full_name, avatar_url, is_verified)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new AppError(error);
  return (data ?? []).map((row) => ({
    ...row,
    author: Array.isArray(row.author) ? row.author[0] : row.author,
  })) as PostComment[];
}

export async function addComment(postId: string, body: string, parentId?: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: auth.user.id, body, parent_id: parentId ?? null })
    .select('id')
    .single();
  if (error) throw new AppError(error);
  return data.id as string;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) throw new AppError(error);
}

// ── Social graph ─────────────────────────────────────────────────────────────
export async function toggleFollow(userId: string) {
  const { data, error } = await supabase.rpc('toggle_follow', { p_user: userId });
  if (error) throw new AppError(error);
  return data as { following: boolean; followers_count: number };
}

export async function getFollowers(userId: string): Promise<UserSummary[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:user_profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId)
    .limit(200);
  if (error) throw new AppError(error);
  return (data ?? []).map((r) =>
    Array.isArray(r.follower) ? r.follower[0] : r.follower,
  ) as UserSummary[];
}

export async function getFollowing(userId: string): Promise<UserSummary[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following:user_profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId)
    .limit(200);
  if (error) throw new AppError(error);
  return (data ?? []).map((r) =>
    Array.isArray(r.following) ? r.following[0] : r.following,
  ) as UserSummary[];
}

// ── Discovery ────────────────────────────────────────────────────────────────
export async function discoverAthletes(
  filters: DiscoveryFilters,
  page = 0,
  pageSize = 20,
): Promise<DiscoveredAthlete[]> {
  const { data, error } = await supabase.rpc('discover_athletes', {
    p_query: filters.query?.trim() || null,
    p_sport: filters.sport || null,
    p_positions: filters.positions?.length ? filters.positions : null,
    p_levels: filters.levels?.length ? filters.levels : null,
    p_countries: filters.countries?.length ? filters.countries : null,
    p_age_min: filters.ageMin ?? null,
    p_age_max: filters.ageMax ?? null,
    p_min_score: filters.minScore ?? null,
    p_open_only: filters.openOnly ?? false,
    p_sort: filters.sort ?? 'match',
    p_limit: pageSize,
    p_offset: page * pageSize,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as DiscoveredAthlete[];
}

export async function recommendedAthletes(limit = 12): Promise<DiscoveredAthlete[]> {
  const { data, error } = await supabase.rpc('recommended_athletes', { p_limit: limit });
  if (error) throw new AppError(error);
  return (data ?? []) as DiscoveredAthlete[];
}

export async function talentLeaderboard(sport?: string, country?: string, limit = 25) {
  const { data, error } = await supabase.rpc('talent_leaderboard', {
    p_sport: sport ?? null,
    p_country: country ?? null,
    p_limit: limit,
  });
  if (error) throw new AppError(error);
  return data ?? [];
}

/**
 * Search for people by name.
 *
 * This goes through the `search_people` RPC rather than querying
 * `user_profiles` directly. Any signed-in account can read a profile row — it
 * has to, or a conversation would not load — but *searching* is discovery, and
 * a minor is only discoverable once a guardian has approved it. Querying the
 * table straight from the client walked around that rule.
 */
export async function searchPeople(
  query: string,
  role?: 'athlete' | 'coach' | 'club' | 'scout',
  limit = 20,
): Promise<PersonResult[]> {
  const term = query.trim();
  if (!term) return [];
  const { data, error } = await supabase.rpc('search_people', {
    p_query: term,
    p_role: role ?? null,
    p_limit: limit,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as PersonResult[];
}

export async function searchOrganizations(query: string, limit = 20): Promise<Organization[]> {
  let q = supabase.from('organizations').select('*').limit(limit);
  if (query.trim()) q = q.ilike('name', `%${query.trim()}%`);
  const { data, error } = await q;
  if (error) throw new AppError(error);
  return (data ?? []) as Organization[];
}

export async function getMatchPreferences(): Promise<MatchPreferences | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('match_preferences')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw new AppError(error);
  return data as MatchPreferences | null;
}

export async function saveMatchPreferences(patch: Partial<MatchPreferences>): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('match_preferences')
    .upsert({ ...patch, user_id: auth.user.id }, { onConflict: 'user_id' });
  if (error) throw new AppError(error);
}

// ── Opportunities ────────────────────────────────────────────────────────────
export async function recommendedOpportunities(limit = 20): Promise<Opportunity[]> {
  const { data, error } = await supabase.rpc('recommended_opportunities', { p_limit: limit });
  if (error) throw new AppError(error);
  return (data ?? []) as Opportunity[];
}

export async function applyToOpportunity(opportunityId: string, message: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase.from('applications').insert({
    opportunity_id: opportunityId,
    athlete_id: auth.user.id,
    message,
    status: 'applied',
  });
  if (error) throw new AppError(error);
}

export async function withdrawApplication(applicationId: string) {
  const { error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId);
  if (error) throw new AppError(error);
}

export async function myApplications() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('applications')
    .select('id, status, message, created_at, opportunity:opportunities(*)')
    .eq('athlete_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw new AppError(error);
  return data ?? [];
}

export async function toggleSaveOpportunity(opportunityId: string, saved: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  if (saved) {
    const { error } = await supabase
      .from('opportunity_saves')
      .delete()
      .eq('opportunity_id', opportunityId)
      .eq('athlete_id', auth.user.id);
    if (error) throw new AppError(error);
  } else {
    const { error } = await supabase
      .from('opportunity_saves')
      .insert({ opportunity_id: opportunityId, athlete_id: auth.user.id });
    if (error) throw new AppError(error);
  }
}

export async function createOpportunity(input: {
  title: string;
  description: string;
  type: string;
  sport: string;
  position?: string | null;
  location?: string | null;
  deadline?: string | null;
  organizationId?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      created_by_id: auth.user.id,
      organization_id: input.organizationId ?? null,
      title: input.title,
      description: input.description,
      type: input.type,
      sport: input.sport,
      position: input.position ?? null,
      location: input.location ?? null,
      application_deadline: input.deadline ?? null,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw new AppError(error);
  return data.id as string;
}

export async function myPostedOpportunities() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, applications(count)')
    .eq('created_by_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw new AppError(error);
  return data ?? [];
}

export async function opportunityApplicants(opportunityId: string): Promise<Applicant[]> {
  const { data, error } = await supabase.rpc('opportunity_applicants', {
    p_opportunity: opportunityId,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as Applicant[];
}

export async function setApplicationStatus(applicationId: string, status: string) {
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId);
  if (error) throw new AppError(error);
}

// ── Messaging ────────────────────────────────────────────────────────────────
export async function getConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.rpc('get_conversations', { p_limit: 50 });
  if (error) throw new AppError(error);
  return (data ?? []) as Conversation[];
}

export async function startConversation(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_user: userId });
  if (error) throw new AppError(error);
  return data as string;
}

export async function getMessages(conversationId: string, limit = 60): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, is_read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new AppError(error);
  return ((data ?? []) as Message[]).reverse();
}

export async function sendMessage(conversationId: string, content: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: auth.user.id, content })
    .select('*')
    .single();
  if (error) throw new AppError(error);
  return data as Message;
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation: conversationId,
  });
  if (error) throw new AppError(error);
}

export async function canMessage(userId: string): Promise<MessagePermission> {
  const { data, error } = await supabase.rpc('can_message_user', { p_recipient: userId });
  if (error) throw new AppError(error);
  return data as MessagePermission;
}

// ── Notifications ────────────────────────────────────────────────────────────
export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, title, body, is_read, actor_id, entity_type, entity_id, actor_count, data, created_at, actor:user_profiles!notifications_actor_id_fkey(full_name, avatar_url)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new AppError(error);
  return (data ?? []).map((row) => ({
    ...row,
    actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
  })) as AppNotification[];
}

export async function markNotificationsRead(ids?: string[]) {
  const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids ?? null });
  if (error) throw new AppError(error);
}

export async function getUnreadCounts(): Promise<UnreadCounts> {
  const { data, error } = await supabase.rpc('unread_counts');
  if (error) throw new AppError(error);
  return (data as UnreadCounts) ?? { notifications: 0, messages: 0 };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw new AppError(error);
  return data as NotificationPreferences | null;
}

export async function saveNotificationPreferences(patch: Partial<NotificationPreferences>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ ...patch, user_id: auth.user.id }, { onConflict: 'user_id' });
  if (error) throw new AppError(error);
}

export async function registerPushToken(token: string, platform: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: auth.user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
}

// ── Safety ───────────────────────────────────────────────────────────────────
export async function reportContent(
  entityType: 'post' | 'comment' | 'user' | 'message' | 'opportunity' | 'story',
  entityId: string,
  reason: string,
  details?: string,
) {
  const { error } = await supabase.rpc('report_content', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_reason: reason,
    p_details: details ?? null,
  });
  if (error) throw new AppError(error);
}

export async function blockUser(userId: string) {
  const { error } = await supabase.rpc('block_user', { p_user: userId });
  if (error) throw new AppError(error);
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.rpc('unblock_user', { p_user: userId });
  if (error) throw new AppError(error);
}

export async function getBlockedUsers(): Promise<UserSummary[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked:user_profiles!user_blocks_blocked_id_fkey(*)');
  if (error) throw new AppError(error);
  return (data ?? []).map((r) =>
    Array.isArray(r.blocked) ? r.blocked[0] : r.blocked,
  ) as UserSummary[];
}

// ── Guardian consent ─────────────────────────────────────────────────────────
export async function requestGuardianConsent(
  name: string,
  email: string,
  relationship = 'parent',
): Promise<GuardianConsent> {
  const { data, error } = await supabase.rpc('request_guardian_consent', {
    p_guardian_name: name,
    p_guardian_email: email,
    p_relationship: relationship,
  });
  if (error) throw new AppError(error);
  const row = Array.isArray(data) ? data[0] : data;

  // Fire-and-forget: the edge function sends the e-mail. If it is not deployed
  // yet the request still stands and can be re-sent from the guardian screen.
  try {
    await supabase.functions.invoke('guardian-consent', {
      body: { consent_id: row.id },
    });
  } catch {
    /* delivery is retryable from settings */
  }

  return row as GuardianConsent;
}

export async function getGuardianConsents(): Promise<GuardianConsent[]> {
  const { data, error } = await supabase
    .from('guardian_consents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new AppError(error);
  return (data ?? []) as GuardianConsent[];
}

export async function revokeGuardianConsent(consentId: string) {
  const { error } = await supabase.rpc('revoke_guardian_consent', { p_consent_id: consentId });
  if (error) throw new AppError(error);
}

/** The young people a signed-in guardian account is responsible for. */
export async function myLinkedMinors(): Promise<LinkedMinor[]> {
  const { data, error } = await supabase.rpc('my_linked_minors');
  if (error) throw new AppError(error);
  return (data ?? []) as LinkedMinor[];
}

/**
 * Who a minor is talking to — names and counts only, never message contents.
 * This is exactly what the in-app notice promises a guardian can see.
 */
export async function guardianConversationOverview(
  minorUserId: string,
): Promise<GuardianConversation[]> {
  const { data, error } = await supabase.rpc('guardian_conversation_overview', {
    p_minor: minorUserId,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as GuardianConversation[];
}

// ── Account ──────────────────────────────────────────────────────────────────
export async function setMessagePrivacy(value: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('user_profiles')
    .update({ allow_messages_from: value })
    .eq('id', auth.user.id);
  if (error) throw new AppError(error);
}

export async function setDiscoverable(value: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_discoverable: value })
    .eq('id', auth.user.id);
  if (error) throw new AppError(error);
}

export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw new AppError(error);
  await supabase.auth.signOut();
}

/** Everything we hold about this account, as one JSON export (GDPR/Play). */
export async function exportMyData(): Promise<Record<string, unknown>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const uid = auth.user.id;

  const [profile, priv, athlete, posts, comments, follows, applications, media] =
    await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('user_private').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('athlete_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('posts').select('*').eq('author_id', uid),
      supabase.from('post_comments').select('*').eq('author_id', uid),
      supabase.from('follows').select('*').eq('follower_id', uid),
      supabase.from('applications').select('*').eq('athlete_id', uid),
      supabase.from('athlete_media').select('*'),
    ]);

  return {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: auth.user.email },
    profile: profile.data,
    private: priv.data,
    athlete: athlete.data,
    posts: posts.data ?? [],
    comments: comments.data ?? [],
    following: follows.data ?? [],
    applications: applications.data ?? [],
    media: media.data ?? [],
  };
}

export { unwrap };

// ── Streaks and achievements ─────────────────────────────────────────────────
/**
 * Called once when the app comes to the foreground.
 *
 * Records that today happened, extends or resets the streak, and re-checks
 * every achievement. Cheap, idempotent within a day, and safe to call on every
 * resume.
 */
export async function recordActivity(): Promise<ActivityResult> {
  const { data, error } = await supabase.rpc('record_activity');
  if (error) throw new AppError(error);
  return data as ActivityResult;
}

/** Streak, next-tier target and every achievement, in one call. */
export async function getProgress(): Promise<Progress> {
  const { data, error } = await supabase.rpc('my_progress');
  if (error) throw new AppError(error);
  return data as Progress;
}

/** Marks unlocks as celebrated so they are not shown twice. */
export async function markAchievementsSeen(keys?: AchievementKey[]): Promise<void> {
  const { error } = await supabase.rpc('mark_achievements_seen', { p_keys: keys ?? null });
  if (error) throw new AppError(error);
}

// ── Teams somebody supports ──────────────────────────────────────────────────
/**
 * The picker deliberately does not narrow by the athlete's own sport: a swimmer
 * is allowed to support Liverpool, and forcing them to pick a swimming "team"
 * would make the question feel like a form rather than a conversation.
 */
export async function searchTeams(query?: string, sport?: string, limit = 20): Promise<Team[]> {
  const { data, error } = await supabase.rpc('search_teams', {
    p_query: query?.trim() || null,
    p_sport: sport ?? null,
    p_limit: limit,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as Team[];
}

/** Adds a club we do not have. Stays private to this person until curated. */
export async function addCustomTeam(
  name: string,
  sport: string,
  country?: string | null,
  city?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('add_custom_team', {
    p_name: name.trim(),
    p_sport: sport,
    p_country: country ?? null,
    p_city: city ?? null,
  });
  if (error) throw new AppError(error);
  return data as string;
}

/** Replaces the whole set, in the order given — rank 1 is the shirt they own. */
export async function setFavoriteTeams(teamIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_favorite_teams', { p_team_ids: teamIds });
  if (error) throw new AppError(error);
}

export async function setFavoriteVenue(venue: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_favorite_venue', { p_venue: venue ?? null });
  if (error) throw new AppError(error);
}

export async function teamsOf(userId: string): Promise<Team[]> {
  const { data, error } = await supabase.rpc('teams_of', { p_user: userId });
  if (error) throw new AppError(error);
  return (data ?? []) as Team[];
}

export async function teamDetail(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.rpc('team_detail', { p_id: teamId });
  if (error) throw new AppError(error);
  const rows = (data ?? []) as Team[];
  return rows[0] ?? null;
}

/** The teams and ground shown on a profile, in one round trip. */
export interface Fandom {
  venue: string | null;
  teams: Team[];
}

export async function fandomOf(userId: string): Promise<Fandom> {
  const { data, error } = await supabase.rpc('fandom_of', { p_user: userId });
  if (error) throw new AppError(error);
  return (data ?? { venue: null, teams: [] }) as Fandom;
}

export async function fansOfTeam(teamId: string, limit = 20, offset = 0): Promise<TeamFan[]> {
  const { data, error } = await supabase.rpc('fans_of_team', {
    p_team_id: teamId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as TeamFan[];
}

// ── Challenges ───────────────────────────────────────────────────────────────
export async function openChallenges(sport?: string | null, limit = 20, offset = 0): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('open_challenges', {
    p_sport: sport ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as Challenge[];
}

export async function challengeLeaderboard(
  challengeId: string,
  limit = 25,
  offset = 0,
): Promise<ChallengeEntry[]> {
  const { data, error } = await supabase.rpc('challenge_leaderboard', {
    p_challenge_id: challengeId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as ChallengeEntry[];
}

/**
 * Entering re-submits over any previous entry, so the athlete can send a better
 * take without the app having to know whether one already exists.
 */
export async function enterChallenge(
  challengeId: string,
  mediaId: string,
  claimedValue?: number | null,
  note?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('enter_challenge', {
    p_challenge_id: challengeId,
    p_media_id: mediaId,
    p_claimed_value: claimedValue ?? null,
    p_note: note?.trim() || null,
  });
  if (error) throw new AppError(error);
  return data as string;
}

export async function withdrawChallengeEntry(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_challenge_entry', { p_challenge_id: challengeId });
  if (error) throw new AppError(error);
}

export async function judgeChallengeEntry(
  entryId: string,
  accept: boolean,
  value?: number | null,
  note?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('judge_challenge_entry', {
    p_entry_id: entryId,
    p_accept: accept,
    p_value: value ?? null,
    p_note: note?.trim() || null,
  });
  if (error) throw new AppError(error);
}

export async function createChallenge(input: {
  sport: string;
  title: string;
  brief: string;
  closesAt: string;
  rules?: string | null;
  metricLabel?: string | null;
  metricUnit?: string | null;
  metricBetter?: 'higher' | 'lower';
  ageMin?: number | null;
  ageMax?: number | null;
  organizationId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_sport: input.sport,
    p_title: input.title.trim(),
    p_brief: input.brief.trim(),
    p_closes_at: input.closesAt,
    p_rules: input.rules?.trim() || null,
    p_metric_label: input.metricLabel?.trim() || null,
    p_metric_unit: input.metricUnit?.trim() || null,
    p_metric_better: input.metricBetter ?? 'higher',
    p_age_min: input.ageMin ?? null,
    p_age_max: input.ageMax ?? null,
    p_organization: input.organizationId ?? null,
  });
  if (error) throw new AppError(error);
  return data as string;
}

/** The caller's own videos, for the challenge entry picker. */
export interface MyClip {
  id: string;
  title: string;
  media_type: string;
  storage_url: string;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
}

export async function myClips(): Promise<MyClip[]> {
  const { data, error } = await supabase.rpc('my_clips');
  if (error) throw new AppError(error);
  return (data ?? []) as MyClip[];
}

// ── Who has been looking ─────────────────────────────────────────────────────
export async function profileViewDigest(days = 7): Promise<ViewDigest> {
  const { data, error } = await supabase.rpc('profile_view_digest', { p_days: days });
  if (error) throw new AppError(error);
  return data as ViewDigest;
}

/** Resets the "new since you last looked" count. Call it on opening the list. */
export async function markProfileViewsSeen(): Promise<void> {
  const { error } = await supabase.rpc('mark_profile_views_seen');
  if (error) throw new AppError(error);
}

// ── "What would it take?" ────────────────────────────────────────────────────
/**
 * Runs the real scoring model against hypothetical inputs, server-side. The
 * client never does this arithmetic itself — a second copy of the weights would
 * drift, and the first time it disagreed with the score screen the number would
 * stop being believable.
 */
export async function simulateScore(
  changes: Partial<Record<SimulatableInput, number | boolean>> = {},
): Promise<Simulation> {
  const { data, error } = await supabase.rpc('simulate_talent_score', { p_changes: changes });
  if (error) throw new AppError(error);
  return data as Simulation;
}

/**
 * A short written read on the profile, from the `talent-insights` function.
 *
 * The function answers with or without an Anthropic key configured — with one
 * it writes; without one it fills a template from the same pillar numbers. So
 * this never has to be feature-flagged in the UI, and it never blocks a screen:
 * callers render the score first and let the words arrive late.
 */
export async function talentInsight(athleteId?: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('talent-insights', {
    body: { athlete_id: athleteId ?? null },
  });
  if (error) return null;
  const summary = (data as { summary?: string } | null)?.summary;
  return typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : null;
}

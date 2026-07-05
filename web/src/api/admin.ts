import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Organization, Post, SuccessStory, UserProfile, VerificationRequest } from '../types';

type SupabaseError = { message: string; code?: string } | null;

type MaybeResponse<T> = {
  data: T | null;
  error: SupabaseError;
  count?: number | null;
};

type CountQuery = PromiseLike<MaybeResponse<unknown[]>> & {
  eq(column: string, value: unknown): CountQuery;
  gte(column: string, value: unknown): CountQuery;
  in(column: string, values: unknown[]): CountQuery;
  not(column: string, operator: string, value: unknown): CountQuery;
};

function isOptionalRelationMissing(error: SupabaseError): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

function requireData<T>(res: MaybeResponse<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function optionalRows<T>(res: MaybeResponse<T[]>): T[] {
  if (isOptionalRelationMissing(res.error)) return [];
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

function optionalSingle<T>(res: MaybeResponse<T>): T | null {
  if (isOptionalRelationMissing(res.error)) return null;
  if (res.error) throw new Error(res.error.message);
  return res.data ?? null;
}

async function countRows(table: string, build?: (query: CountQuery) => CountQuery): Promise<number> {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }) as unknown as CountQuery;
  if (build) query = build(query);
  const res = await query;
  if (isOptionalRelationMissing(res.error)) return 0;
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export interface AdminUser extends UserProfile {
  email?: string | null;
  phone?: string | null;
}

export interface PlatformStats {
  users: number;
  athletes: number;
  organizations: number;
  opportunities: number;
  pendingVerifications: number;
  posts: number;
  successStories: number;
  aiSessionsToday: number;
  aiMessagesToday: number;
  moderationOpen: number;
  auditEvents7d: number;
  billingVolumeCents: number;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface PlatformSetting {
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: number;
  environment: string;
  updated_at: string;
}

export interface ModerationReport {
  id: string;
  reporter_id: string | null;
  reported_entity_type: string;
  reported_entity_id: string;
  reason: string;
  details: string | null;
  severity: string;
  status: string;
  is_minor_related: boolean;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  event_type: string;
  status: string;
  amount_cents: number;
  currency: string;
  provider_ref: string | null;
  occurred_at: string;
}

export interface AdminDataRequest {
  id: string;
  user_id: string | null;
  request_type: string;
  status: string;
  has_medical: boolean;
  submitted_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface TaxonomyRow {
  name: string;
  count: number;
  source: string;
  status?: string;
  country?: string | null;
}

export interface AiAdminStats {
  sessionsToday: number;
  messagesToday: number;
  assistantMessagesToday: number;
  taggedMedia: number;
  recentSessions: Array<{
    id: string;
    user_id: string | null;
    title: string | null;
    context_type: string | null;
    created_at: string;
  }>;
}

export interface ContentAdminStats {
  posts: number;
  successStories: number;
  publishedStories: number;
  cmsBlocks: number;
}

export interface CmsBlock {
  key: string;
  data: Record<string, unknown>;
  updated_at: string;
}

export interface FinanceSummary {
  billingVolumeCents: number;
  paidVolumeCents: number;
  pendingVolumeCents: number;
  events: BillingEvent[];
  tiers: Array<{ tier: string; users: number }>;
}

export function summarizeSubscriptionTiers(users: Array<Pick<AdminUser, 'subscription_tier'>>): Array<{ tier: string; users: number }> {
  return Array.from(
    users.reduce((map, user) => map.set(user.subscription_tier, (map.get(user.subscription_tier) ?? 0) + 1), new Map<string, number>()),
    ([tier, userCount]) => ({ tier, users: userCount }),
  ).sort((a, b) => a.tier.localeCompare(b.tier));
}

export function buildSportsOverviewRows(
  catalog: Array<{ name: string; status: string }>,
  athletes: Array<{ sport: string | null }>,
  opportunities: Array<{ sport: string | null }>,
): TaxonomyRow[] {
  const rows = new Map<string, TaxonomyRow>();
  catalog.forEach((sport) => rows.set(sport.name, { name: sport.name, count: 0, source: 'sports_catalog', status: sport.status }));
  [...athletes, ...opportunities].forEach((row) => {
    if (!row.sport) return;
    const current = rows.get(row.sport) ?? { name: row.sport, count: 0, source: 'app data', status: 'active' };
    rows.set(row.sport, { ...current, count: current.count + 1 });
  });
  return [...rows.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function canPromoteUserToAdmin(currentUser: Pick<UserProfile, 'id' | 'role'> | null, targetUser: Pick<AdminUser, 'id' | 'role'>): boolean {
  return currentUser?.role === 'super_admin' && currentUser.id !== targetUser.id && targetUser.role !== 'admin' && targetUser.role !== 'super_admin';
}

export async function logAdminAction(input: {
  action: string;
  table_name?: string;
  record_id?: string;
  old_value?: unknown;
  new_value?: unknown;
}): Promise<void> {
  const user_id = await currentUserId();
  const row = {
    user_id,
    action: input.action,
    table_name: input.table_name ?? null,
    record_id: input.record_id ?? null,
    old_value: (input.old_value ?? null) as Record<string, unknown> | null,
    new_value: (input.new_value ?? null) as Record<string, unknown> | null,
  };
  const res = await supabase.from('audit_logs').insert(row);
  if (res.error && !isOptionalRelationMissing(res.error)) throw new Error(res.error.message);
}

export async function listUsers(opts: { role?: string; q?: string; limit?: number } = {}): Promise<AdminUser[]> {
  let query = supabase.from('user_profiles').select(USER_FIELDS).order('created_at', { ascending: false });
  if (opts.role && opts.role !== 'All') query = query.eq('role', opts.role);
  if (opts.limit) query = query.limit(opts.limit);
  let rows = unwrap(await query) as AdminUser[];

  const privateRows = optionalRows(
    await supabase.from('user_private').select('user_id,email,phone').in('user_id', rows.map((u) => u.id)),
  ) as Array<{ user_id: string; email: string | null; phone: string | null }>;
  const privateByUser = new Map(privateRows.map((row) => [row.user_id, row]));
  rows = rows.map((row) => ({ ...row, email: privateByUser.get(row.id)?.email ?? row.email ?? null, phone: privateByUser.get(row.id)?.phone ?? row.phone ?? null }));

  if (opts.q) {
    const needle = opts.q.toLowerCase();
    rows = rows.filter((u) =>
      [u.full_name, u.email, u.city, u.country, u.role, u.subscription_tier]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }
  return rows;
}

export async function updateUserProfile(id: string, patch: Partial<Pick<UserProfile, 'role' | 'full_name' | 'is_verified' | 'subscription_tier'>>): Promise<AdminUser> {
  const before = optionalSingle<AdminUser>(await supabase.from('user_profiles').select(USER_FIELDS).eq('id', id).maybeSingle());
  const row = requireData(await supabase.from('user_profiles').update(patch).eq('id', id).select(USER_FIELDS).single()) as AdminUser;
  await logAdminAction({ action: 'user.update', table_name: 'user_profiles', record_id: id, old_value: before ?? null, new_value: row });
  return row;
}

export async function promoteUserToAdmin(id: string): Promise<AdminUser> {
  const before = optionalSingle<AdminUser>(await supabase.from('user_profiles').select(USER_FIELDS).eq('id', id).maybeSingle());
  const row = requireData(await supabase.rpc('promote_user_to_admin', { target_user_id: id })) as AdminUser;
  await logAdminAction({ action: 'user.promote_admin.client', table_name: 'user_profiles', record_id: id, old_value: before ?? null, new_value: row });
  return row;
}

export async function listVerificationRequests(status?: string): Promise<VerificationRequest[]> {
  let query = supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  return unwrap(await query) as VerificationRequest[];
}

export async function decideVerification(id: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
  const before = optionalSingle<VerificationRequest>(await supabase.from('verification_requests').select('*').eq('id', id).maybeSingle());
  const reviewed_by = await currentUserId();
  const updated = requireData(
    await supabase
      .from('verification_requests')
      .update({ status, decision_reason: reason ?? null, reviewed_by })
      .eq('id', id)
      .select('*')
      .single(),
  ) as VerificationRequest;

  if (status === 'approved') {
    if (updated.subject_user_id) {
      await supabase.from('user_profiles').update({ is_verified: true }).eq('id', updated.subject_user_id);
    }
    if (updated.organization_id) {
      await supabase.from('organizations').update({ is_verified: true, verification_status: 'approved' }).eq('id', updated.organization_id);
    }
  }

  await logAdminAction({ action: `verification.${status}`, table_name: 'verification_requests', record_id: id, old_value: before ?? null, new_value: updated });
}

export async function platformStats(): Promise<PlatformStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const todayIso = today.toISOString();

  const [
    users,
    athletes,
    organizations,
    opportunities,
    pendingVerifications,
    posts,
    successStories,
    aiSessionsToday,
    aiMessagesToday,
    moderationOpen,
    auditEvents7d,
    billingEvents,
  ] = await Promise.all([
    countRows('user_profiles'),
    countRows('athlete_profiles'),
    countRows('organizations'),
    countRows('opportunities', (q) => q.eq('is_active', true)),
    countRows('verification_requests', (q) => q.eq('status', 'pending')),
    countRows('posts'),
    countRows('success_stories'),
    countRows('ai_chat_sessions', (q) => q.gte('created_at', todayIso)),
    countRows('ai_chat_messages', (q) => q.gte('created_at', todayIso)),
    countRows('moderation_reports', (q) => q.in('status', ['open', 'reviewing', 'escalated'])),
    countRows('audit_logs', (q) => q.gte('created_at', sevenDaysAgo)),
    listBillingEvents({ limit: 200 }),
  ]);

  return {
    users,
    athletes,
    organizations,
    opportunities,
    pendingVerifications,
    posts,
    successStories,
    aiSessionsToday,
    aiMessagesToday,
    moderationOpen,
    auditEvents7d,
    billingVolumeCents: billingEvents.reduce((sum, event) => sum + event.amount_cents, 0),
  };
}

export async function listAuditLogs(limit = 50): Promise<AuditLogRow[]> {
  return optionalRows(
    await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit),
  ) as AuditLogRow[];
}

export async function listPlatformSettings(): Promise<PlatformSetting[]> {
  return optionalRows(await supabase.from('platform_settings').select('*').order('key')) as PlatformSetting[];
}

export async function updatePlatformSetting(key: string, value: Record<string, unknown>): Promise<PlatformSetting> {
  const updated_by = await currentUserId();
  const row = requireData(
    await supabase
      .from('platform_settings')
      .upsert({ key, value, updated_by, updated_at: new Date().toISOString() })
      .select('*')
      .single(),
  ) as PlatformSetting;
  await logAdminAction({ action: 'platform_setting.upsert', table_name: 'platform_settings', record_id: undefined, new_value: row });
  return row;
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return optionalRows(await supabase.from('feature_flags').select('*').order('name')) as FeatureFlag[];
}

export async function listModerationReports(status?: string): Promise<ModerationReport[]> {
  let query = supabase.from('moderation_reports').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  return optionalRows(await query) as ModerationReport[];
}

export async function updateModerationReport(id: string, patch: Partial<Pick<ModerationReport, 'status' | 'resolution'>>): Promise<ModerationReport> {
  const resolved_by = patch.status === 'resolved' ? await currentUserId() : undefined;
  const row = requireData(
    await supabase.from('moderation_reports').update({ ...patch, resolved_by }).eq('id', id).select('*').single(),
  ) as ModerationReport;
  await logAdminAction({ action: 'moderation.update', table_name: 'moderation_reports', record_id: id, new_value: row });
  return row;
}

export async function listBillingEvents(opts: { limit?: number; status?: string } = {}): Promise<BillingEvent[]> {
  let query = supabase.from('admin_billing_events').select('*').order('occurred_at', { ascending: false });
  if (opts.status) query = query.eq('status', opts.status);
  if (opts.limit) query = query.limit(opts.limit);
  return optionalRows(await query) as BillingEvent[];
}

export async function financeSummary(): Promise<FinanceSummary> {
  const [events, users] = await Promise.all([listBillingEvents({ limit: 250 }), listUsers({})]);
  const tiers = summarizeSubscriptionTiers(users);
  return {
    billingVolumeCents: events.reduce((sum, event) => sum + event.amount_cents, 0),
    paidVolumeCents: events.filter((event) => event.status === 'paid').reduce((sum, event) => sum + event.amount_cents, 0),
    pendingVolumeCents: events.filter((event) => event.status === 'pending').reduce((sum, event) => sum + event.amount_cents, 0),
    events,
    tiers,
  };
}

export async function listDataRequests(): Promise<AdminDataRequest[]> {
  return optionalRows(await supabase.from('admin_data_requests').select('*').order('submitted_at', { ascending: false })) as AdminDataRequest[];
}

export async function aiAdminStats(): Promise<AiAdminStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [sessionsToday, messagesToday, assistantMessagesToday, taggedMedia, recentSessions] = await Promise.all([
    countRows('ai_chat_sessions', (q) => q.gte('created_at', todayIso)),
    countRows('ai_chat_messages', (q) => q.gte('created_at', todayIso)),
    countRows('ai_chat_messages', (q) => q.gte('created_at', todayIso).eq('sender_role', 'assistant')),
    countRows('athlete_media', (q) => q.not('ai_tags', 'eq', '[]')),
    optionalRows(
      await supabase
        .from('ai_chat_sessions')
        .select('id,user_id,title,context_type,created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ) as AiAdminStats['recentSessions'],
  ]);

  return { sessionsToday, messagesToday, assistantMessagesToday, taggedMedia, recentSessions };
}

export async function contentAdminStats(): Promise<ContentAdminStats> {
  const [posts, successStories, publishedStories, cmsBlocks] = await Promise.all([
    countRows('posts'),
    countRows('success_stories'),
    countRows('success_stories', (q) => q.eq('is_published', true)),
    countRows('cms_content'),
  ]);
  return { posts, successStories, publishedStories, cmsBlocks };
}

export async function listSuccessStoriesAdmin(): Promise<SuccessStory[]> {
  return optionalRows(await supabase.from('success_stories').select('*').order('created_at', { ascending: false })) as SuccessStory[];
}

export async function listPostsAdmin(limit = 25): Promise<Post[]> {
  return optionalRows(await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(limit)) as Post[];
}

export async function listCmsBlocks(): Promise<CmsBlock[]> {
  return optionalRows(await supabase.from('cms_content').select('key,data,updated_at').order('key')) as CmsBlock[];
}

export async function listOrganizationsAdmin(): Promise<Organization[]> {
  return optionalRows(await supabase.from('organizations').select('*').order('created_at', { ascending: false })) as Organization[];
}

export async function sportsOverview(): Promise<TaxonomyRow[]> {
  const [catalog, athletes, opportunities] = await Promise.all([
    optionalRows(await supabase.from('sports_catalog').select('name,status')),
    optionalRows(await supabase.from('athlete_profiles').select('sport')),
    optionalRows(await supabase.from('opportunities').select('sport')),
  ]);
  return buildSportsOverviewRows(
    catalog as Array<{ name: string; status: string }>,
    athletes as Array<{ sport: string | null }>,
    opportunities as Array<{ sport: string | null }>,
  );
}

export async function competitionsOverview(): Promise<TaxonomyRow[]> {
  const [catalog, matches, organizations] = await Promise.all([
    optionalRows(await supabase.from('competitions_catalog').select('name,country,status')),
    optionalRows(await supabase.from('match_records').select('competition')),
    optionalRows(await supabase.from('organizations').select('league,country')),
  ]);

  const rows = new Map<string, TaxonomyRow>();
  (catalog as Array<{ name: string; country: string | null; status: string }>).forEach((competition) => {
    const key = `${competition.name}:${competition.country ?? ''}`;
    rows.set(key, { name: competition.name, country: competition.country, count: 0, source: 'competitions_catalog', status: competition.status });
  });
  (matches as Array<{ competition: string | null }>).forEach((match) => {
    if (!match.competition) return;
    const current = rows.get(match.competition) ?? { name: match.competition, count: 0, source: 'match_records', status: 'active' };
    rows.set(match.competition, { ...current, count: current.count + 1 });
  });
  (organizations as Array<{ league: string | null; country: string | null }>).forEach((org) => {
    if (!org.league) return;
    const key = `${org.league}:${org.country ?? ''}`;
    const current = rows.get(key) ?? { name: org.league, country: org.country, count: 0, source: 'organizations', status: 'active' };
    rows.set(key, { ...current, count: current.count + 1 });
  });
  return [...rows.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

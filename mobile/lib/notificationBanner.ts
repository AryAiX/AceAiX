/**
 * Whether an in-app banner should appear for one realtime notification.
 *
 * Pure: the caller passes the open conversation and the path it just read.
 * Nothing here looks at the phone's clock. An UPDATE is "just happened" only
 * when the row's own timestamps sit within three seconds of the database
 * commit time on the event.
 */

export const BANNER_COALESCE_MS = 150;

const FRESH_MS = 3000;

export interface BannerRow {
  id?: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  is_read?: boolean | null;
  /** Legacy twin of is_read. Both have to be false for an UPDATE to count. */
  read?: boolean | null;
  actor_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  actor_count?: number | null;
  data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BannerEvent {
  eventType: string;
  /** Server commit time from the realtime payload. Never the device clock. */
  commitTimestamp: string | null;
  row: BannerRow;
}

export interface BannerContext {
  openConversation: string | null;
  path: string;
}

export type BannerDecision =
  | 'show'
  | 'skip:event'
  | 'skip:notifications'
  | 'skip:open-conversation'
  | 'skip:inbox'
  | 'skip:read'
  | 'skip:stale';

/** Realtime payload, narrowed to the fields the decision needs. */
export interface NotificationRealtimePayload {
  eventType: string;
  commit_timestamp?: string | null;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
}

export function isUnreadNotification(
  row: { is_read?: boolean | null; read?: boolean | null } | null | undefined,
): boolean {
  if (!row) return false;
  return row.is_read === false && row.read === false;
}

function pathSegments(path: string): string[] {
  return path.split('?')[0].split('#')[0].split('/').filter((part) => part.length > 0);
}

/** The notifications list. Settings → Notifications ends in the same word and is not this screen. */
function onNotificationsList(path: string): boolean {
  const parts = pathSegments(path);
  if (parts[parts.length - 1] !== 'notifications') return false;
  return parts[parts.length - 2] !== 'settings';
}

function onInbox(path: string): boolean {
  return pathSegments(path).at(-1) === 'inbox';
}

function isMessage(row: BannerRow): boolean {
  return row.type === 'message' || row.entity_type === 'conversation';
}

function sameConversation(entityId: string | null | undefined, open: string | null): boolean {
  if (!open || !entityId) return false;
  return entityId === open;
}

/**
 * Parse a server timestamp. Extra fractional digits (realtime commit times
 * carry microseconds) are trimmed so every JS engine reads the same millisecond.
 */
function parseServerTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:?\d{2})$/.exec(value);
  const normalized = match
    ? `${match[1]}.${match[2].slice(0, 3).padEnd(3, '0')}${match[3]}`
    : value;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

/** Later of created_at and updated_at. Grouped likes rewrite both. */
function activityTimeMs(row: BannerRow): number | null {
  const created = parseServerTime(row.created_at);
  const updated = parseServerTime(row.updated_at);
  if (created == null) return updated;
  if (updated == null) return created;
  return Math.max(created, updated);
}

function isFreshUpdate(event: BannerEvent): boolean {
  const activity = activityTimeMs(event.row);
  const commit = parseServerTime(event.commitTimestamp);
  if (activity == null || commit == null) return false;
  return Math.abs(activity - commit) <= FRESH_MS;
}

export function shouldShowBanner(event: BannerEvent, ctx: BannerContext): BannerDecision {
  if (event.eventType !== 'INSERT' && event.eventType !== 'UPDATE') return 'skip:event';
  if (onNotificationsList(ctx.path)) return 'skip:notifications';
  if (isMessage(event.row)) {
    if (sameConversation(event.row.entity_id, ctx.openConversation)) return 'skip:open-conversation';
    if (onInbox(ctx.path)) return 'skip:inbox';
  }
  if (event.eventType === 'INSERT') return 'show';
  if (!isUnreadNotification(event.row)) return 'skip:read';
  if (!isFreshUpdate(event)) return 'skip:stale';
  return 'show';
}

/**
 * The event to keep when several showable rows arrive in one short burst.
 * Server activity time wins; the one that just arrived wins a tie.
 */
export function newerBannerEvent(current: BannerEvent, incoming: BannerEvent): BannerEvent {
  const currentActivity = activityTimeMs(current.row);
  const incomingActivity = activityTimeMs(incoming.row);
  if (currentActivity != null && incomingActivity != null && currentActivity !== incomingActivity) {
    return incomingActivity > currentActivity ? incoming : current;
  }
  if (currentActivity == null && incomingActivity != null) return incoming;
  if (incomingActivity == null && currentActivity != null) return current;

  const currentCommit = parseServerTime(current.commitTimestamp);
  const incomingCommit = parseServerTime(incoming.commitTimestamp);
  if (currentCommit != null && incomingCommit != null && currentCommit !== incomingCommit) {
    return incomingCommit > currentCommit ? incoming : current;
  }
  return incoming;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rowFromRecord(record: Record<string, unknown> | null | undefined): BannerRow {
  if (!record) return {};
  const data = asRecord(record.data);
  return {
    id: asString(record.id) ?? undefined,
    type: asString(record.type),
    title: asString(record.title),
    body: asString(record.body),
    is_read: asBoolean(record.is_read),
    read: asBoolean(record.read),
    actor_id: asString(record.actor_id),
    entity_type: asString(record.entity_type),
    entity_id: asString(record.entity_id),
    actor_count: asCount(record.actor_count),
    data,
    created_at: asString(record.created_at),
    updated_at: asString(record.updated_at),
  };
}

export function bannerEventFromPayload(payload: NotificationRealtimePayload): BannerEvent {
  const source = payload.eventType === 'DELETE' ? payload.old : payload.new;
  return {
    eventType: payload.eventType,
    commitTimestamp: payload.commit_timestamp ?? null,
    row: rowFromRecord(source),
  };
}

/**
 * A coalesced write can arrive without the columns it did not assign.
 * The notifications screen reads the stored row, so the banner has to as well
 * before it chooses the sentence or the tap target.
 *
 * An insert already carries the whole row. Title is not nullable, so a missing
 * title means the payload was partial.
 */
export function rowNeedsHydration(event: BannerEvent): boolean {
  const row = event.row;
  if (!row.id) return false;
  if (!row.title?.trim() || !row.type) return true;
  if (event.eventType !== 'UPDATE') {
    // Nearby games and mentions compose their sentence from `data`.
    return row.data == null && (row.type === 'meetup_nearby' || row.type === 'mention');
  }
  if (!row.entity_type || row.actor_count == null || row.data == null) return true;
  return false;
}

/** Fill only the fields the payload left out. Read flags and times stay put. */
export function applyHydratedRow(event: BannerEvent, record: Record<string, unknown>): BannerEvent {
  const fetched = rowFromRecord(record);
  const row: BannerRow = { ...event.row };
  if (!row.type && fetched.type) row.type = fetched.type;
  if (!row.title?.trim() && fetched.title) row.title = fetched.title;
  if (row.body == null && fetched.body) row.body = fetched.body;
  if (!row.actor_id && fetched.actor_id) row.actor_id = fetched.actor_id;
  if (!row.entity_type && fetched.entity_type) row.entity_type = fetched.entity_type;
  if (!row.entity_id && fetched.entity_id) row.entity_id = fetched.entity_id;
  if (row.actor_count == null && fetched.actor_count != null) row.actor_count = fetched.actor_count;
  if (row.data == null && fetched.data) row.data = fetched.data;
  if (!row.created_at && fetched.created_at) row.created_at = fetched.created_at;
  return { ...event, row };
}

/** Title and body, the same two lines the notifications row draws. */
export function bannerText(title: string, body: string | null): string {
  const parts = [title, body].filter((part) => part && part.trim());
  return parts.join('\n');
}

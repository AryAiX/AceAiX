import { supabase, unwrap } from './_helpers';
import type {
  AthleteAttribute,
  AthleteMedia,
  AthleteProfile,
  CareerMilestone,
  MatchRecord,
  UserProfile,
} from '../types';

export type PublicHighlight = AthleteMedia & {
  athlete?: AthleteProfile & { user?: UserProfile };
};

async function signMediaRows<T extends AthleteMedia>(rows: T[]): Promise<T[]> {
  const paths = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.storage_url, row.thumbnail_url])
        .filter(
          (value): value is string =>
            typeof value === 'string' && !value.startsWith('http'),
        ),
    ),
  );
  if (paths.length === 0) return rows;

  const keepExternallyHosted = () =>
    rows.filter((row) => row.storage_url.startsWith('http'));

  let signedResult: Awaited<
    ReturnType<
      ReturnType<typeof supabase.storage.from>['createSignedUrls']
    >
  >;
  try {
    signedResult = await supabase.storage.from('posts').createSignedUrls(paths, 3600);
  } catch {
    return keepExternallyHosted();
  }

  const { data, error } = signedResult;
  if (error || !data) {
    return keepExternallyHosted();
  }

  const signed = new Map(data.map((item) => [item.path, item.signedUrl]));
  return rows.flatMap((row) => {
    const storageUrl = row.storage_url.startsWith('http')
      ? row.storage_url
      : signed.get(row.storage_url);
    if (!storageUrl) return [];
    return [{
      ...row,
      storage_url: storageUrl,
      thumbnail_url: !row.thumbnail_url || row.thumbnail_url.startsWith('http')
        ? row.thumbnail_url
        : signed.get(row.thumbnail_url) ?? null,
    }];
  });
}

// ---- Media ----
export async function listMedia(
  athleteId: string,
  opts: { publicOnly?: boolean } = {},
): Promise<AthleteMedia[]> {
  let q = supabase
    .from('athlete_media')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });
  if (opts.publicOnly) q = q.eq('is_public', true);
  return signMediaRows(unwrap(await q) as AthleteMedia[]);
}

// ---- Public highlights (across all athletes) ----
export async function listPublicHighlights(limit = 12): Promise<PublicHighlight[]> {
  const rows = unwrap(
    await supabase.rpc('web_public_highlights', { p_limit: limit }),
  ) as PublicHighlight[];
  return signMediaRows(rows);
}

export async function createMedia(
  input: Partial<AthleteMedia> & { athlete_id: string; title: string; storage_url: string },
): Promise<AthleteMedia> {
  return unwrap(
    await supabase.from('athlete_media').insert(input).select('*').single(),
  ) as AthleteMedia;
}

export async function deleteMedia(id: string): Promise<void> {
  unwrap(await supabase.from('athlete_media').delete().eq('id', id).select('id'));
}

// ---- Matches ----
export async function listMatches(athleteId: string, limit?: number): Promise<MatchRecord[]> {
  let q = supabase
    .from('match_records')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('match_date', { ascending: false });
  if (limit) q = q.limit(limit);
  return unwrap(await q) as MatchRecord[];
}

export async function createMatch(
  input: Partial<MatchRecord> & { athlete_id: string; match_date: string },
): Promise<MatchRecord> {
  return unwrap(
    await supabase.from('match_records').insert(input).select('*').single(),
  ) as MatchRecord;
}

// ---- Attributes (normalized) ----
export async function listAttributes(athleteId: string): Promise<AthleteAttribute[]> {
  return unwrap(
    await supabase
      .from('athlete_attributes')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('recorded_at', { ascending: false }),
  ) as AthleteAttribute[];
}

// ---- Career milestones ----
export async function listCareerMilestones(athleteId: string): Promise<CareerMilestone[]> {
  return unwrap(
    await supabase
      .from('career_milestones')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('achieved_at', { ascending: false }),
  ) as CareerMilestone[];
}

import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import {
  buildAthleteRecommendationResponse,
  type AthleteRecommendation,
  type AthleteRecommendationContext,
  type AthleteRecommendationResponse,
} from '../src/lib/athleteRecommendations.js';
import type { AthleteProfile, MatchRecord, Opportunity } from '../src/types/index.js';

// This repository does not generate Supabase database types; preserve the
// untyped client returned by createClient while keeping function boundaries typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerSupabaseClient = ReturnType<typeof createClient<any>>;

const aiSelectionSchema = z.object({
  selections: z
    .array(
      z.object({
        candidateId: z.string().max(120),
        title: z.string().min(1).max(100),
        rationale: z.string().min(1).max(320),
        priority: z.enum(['high', 'medium', 'low']),
        evidenceIds: z.array(z.string().max(160)).max(6),
      }),
    )
    .max(8),
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/json',
    },
  });
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}

function hydrateAiSelections(
  response: AthleteRecommendationResponse,
  selections: z.infer<typeof aiSelectionSchema>['selections'],
): AthleteRecommendationResponse {
  const byId = new Map(response.recommendations.map((recommendation) => [recommendation.id, recommendation]));
  const seen = new Set<string>();
  const personalized: AthleteRecommendation[] = [];

  for (const selection of selections) {
    const candidate = byId.get(selection.candidateId);
    if (!candidate || seen.has(candidate.id)) continue;

    const allowedEvidenceIds = new Set(candidate.evidence.map((evidence) => evidence.id));
    const evidence = candidate.evidence.filter((item) => selection.evidenceIds.includes(item.id));
    if (selection.evidenceIds.some((id) => !allowedEvidenceIds.has(id))) continue;

    seen.add(candidate.id);
    personalized.push({
      ...candidate,
      title: selection.title,
      rationale: selection.rationale,
      priority: selection.priority,
      evidence: evidence.length ? evidence : candidate.evidence,
    });
  }

  for (const candidate of response.recommendations) {
    if (!seen.has(candidate.id)) personalized.push(candidate);
  }

  return {
    ...response,
    generationMode: 'ai',
    recommendations: personalized,
  };
}

async function loadContext(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<AthleteRecommendationContext | null> {
  const athleteResult = await supabase.from('athlete_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (athleteResult.error) throw new Error(athleteResult.error.message);
  if (!athleteResult.data) return null;

  const athlete = athleteResult.data as AthleteProfile;
  const [opportunitiesResult, matchesResult, mediaResult, endorsementsResult, viewsResult] = await Promise.all([
    supabase
      .from('opportunities')
      .select('*, organization:organizations(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('match_records')
      .select('*')
      .eq('athlete_id', athlete.id)
      .order('match_date', { ascending: false })
      .limit(8),
    supabase
      .from('athlete_media')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athlete.id)
      .eq('is_public', true),
    supabase
      .from('endorsements')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athlete.id),
    supabase
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athlete.id),
  ]);

  const errors = [
    opportunitiesResult.error,
    matchesResult.error,
    mediaResult.error,
    endorsementsResult.error,
    viewsResult.error,
  ];
  for (const error of errors) {
    if (error) throw new Error(error.message);
  }

  return {
    athlete,
    opportunities: (opportunitiesResult.data ?? []) as Opportunity[],
    matches: (matchesResult.data ?? []) as MatchRecord[],
    publicMediaCount: mediaResult.count ?? 0,
    endorsementCount: endorsementsResult.count ?? 0,
    profileViewCount: viewsResult.count ?? 0,
  };
}

async function consumeQuota(supabase: ServerSupabaseClient): Promise<boolean> {
  const result = await supabase.rpc('consume_athlete_ai_quota');
  if (result.error) {
    console.error('Athlete recommendation quota check failed:', result.error.message);
    return false;
  }
  return result.data === true;
}

function promptFor(candidates: AthleteRecommendation[]): string {
  const safeCandidates = candidates.map((candidate) => ({
    id: candidate.id,
    category: candidate.category,
    title: candidate.title,
    action: candidate.action,
    rationale: candidate.rationale,
    priority: candidate.priority,
    confidence: candidate.confidence,
    evidence: candidate.evidence,
  }));

  return [
    'You rank and explain career-development recommendations for an athlete.',
    'Use only the supplied candidates and evidence. Do not invent facts, statistics, opportunities, or medical advice.',
    'Return every candidate ID exactly once. Keep each action practical and concise.',
    'Use only evidence IDs that already belong to that candidate.',
    `Candidates: ${JSON.stringify(safeCandidates)}`,
  ].join('\n');
}

export async function POST(request: Request): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return json({ error: 'Authentication required' }, 401);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Recommendation service is not configured' }, 503);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);

    const context = await loadContext(supabase, userData.user.id);
    if (!context) return json({ error: 'An athlete profile is required' }, 403);

    const fallback = buildAthleteRecommendationResponse(context);
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey || !(await consumeQuota(supabase))) return json(fallback);

    try {
      const openai = createOpenAI({ apiKey: openAiKey });
      const result = await generateText({
        model: openai(process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'),
        output: Output.object({ schema: aiSelectionSchema }),
        prompt: promptFor(fallback.recommendations),
      });

      return json(hydrateAiSelections(fallback, result.output.selections));
    } catch (error) {
      console.error('Athlete recommendation personalization failed:', error instanceof Error ? error.message : 'Unknown error');
      return json(fallback);
    }
  } catch (error) {
    console.error('Athlete recommendations failed:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Unable to generate recommendations' }, 500);
  }
}

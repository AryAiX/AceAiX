import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { GiTestKey } from '@/lib/gi/catalogue';
import type { GiMetrics } from '@/lib/gi/metrics';

/**
 * Game Intelligence — six timed games and the result they build.
 *
 * Every rule lives in `20260924000001_game_intelligence.sql`: who may take the
 * games (by age and country), how each result is scored, how often a game may
 * be retaken, and who may see the outcome. The client asks and renders.
 */

export type GiConsent =
  | 'ok'
  | 'guardian_required'
  | 'age_unknown'
  | 'not_athlete'
  | 'suspended';

export type GiConfidence = 'low' | 'medium' | 'high';

export interface GiProfile {
  athlete_id: string;
  user_id: string;
  overall: number | null;
  subscores: Partial<Record<GiTestKey, number>>;
  tests_completed: number;
  confidence: GiConfidence;
  age_band: string | null;
  percentile: number | null;
  share_with_clubs: boolean;
  show_badge: boolean;
  last_session_at: string | null;
  next_retest_at: string | null;
  algorithm_version: number;
  updated_at: string;
}

export interface GiResultSummary {
  score: number | null;
  valid: boolean;
  reason: string | null;
}

export interface GiState {
  consent: GiConsent;
  self_consent_age: number;
  guardian_pending: boolean;
  profile: GiProfile | null;
  open_session: {
    id: string;
    started_at: string;
    done: Partial<Record<GiTestKey, GiResultSummary>>;
  } | null;
  attempts_left: Record<GiTestKey, number>;
  history: { date: string; overall: number | null }[];
}

/** What someone else may see. `null` means nothing is shared with you. */
export interface GiPublic {
  view: 'owner' | 'recruiter' | 'badge';
  overall: number;
  percentile: number | null;
  age_band: string | null;
  confidence?: GiConfidence;
  subscores?: Partial<Record<GiTestKey, number>>;
  tests_completed?: number;
  last_session_at?: string | null;
}

export interface GiScenarioEntity {
  id?: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
}

export interface GiScenario {
  id: string;
  layout: {
    title: string;
    you: GiScenarioEntity;
    mates: GiScenarioEntity[];
    opps: GiScenarioEntity[];
    keeper: GiScenarioEntity;
  };
}

export async function getGiState(): Promise<GiState> {
  const { data, error } = await supabase.rpc('gi_my_state');
  if (error) throw new AppError(error);
  return data as GiState;
}

/** 'ios:phone', 'android:tablet', 'web' — coarse on purpose. */
export function deviceClass(width: number): string {
  if (Platform.OS === 'web') return 'web';
  return `${Platform.OS}:${width >= 700 ? 'tablet' : 'phone'}`;
}

export async function startGiSession(input: {
  deviceClass: string;
  baselineMs: number | null;
  fatigue: number | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('gi_start_session', {
    p_device_class: input.deviceClass,
    p_baseline_ms: input.baselineMs,
    p_fatigue: input.fatigue,
  });
  if (error) throw new AppError(error);
  return data as string;
}

export async function getGiScenarios(sessionId: string): Promise<GiScenario[]> {
  const { data, error } = await supabase.rpc('gi_scenarios_for_session', {
    p_session: sessionId,
    p_count: 8,
  });
  if (error) throw new AppError(error);
  return (data ?? []) as GiScenario[];
}

export async function submitGiResult(
  sessionId: string,
  test: GiTestKey,
  metrics: GiMetrics,
): Promise<GiResultSummary> {
  const { data, error } = await supabase.rpc('gi_submit_result', {
    p_session: sessionId,
    p_test: test,
    p_metrics: metrics,
  });
  if (error) throw new AppError(error);
  const out = (data ?? {}) as { score?: number; valid?: boolean; reason?: string };
  return { score: out.score ?? null, valid: !!out.valid, reason: out.reason ?? null };
}

export async function finishGiSession(sessionId: string): Promise<GiProfile | null> {
  const { data, error } = await supabase.rpc('gi_finish_session', { p_session: sessionId });
  if (error) throw new AppError(error);
  return (data ?? null) as GiProfile | null;
}

export async function setGiSharing(shareWithClubs: boolean, showBadge: boolean): Promise<void> {
  const { error } = await supabase.rpc('gi_set_sharing', {
    p_share_with_clubs: shareWithClubs,
    p_show_badge: showBadge,
  });
  if (error) throw new AppError(error);
}

export async function getGameIntelligence(userId: string): Promise<GiPublic | null> {
  const { data, error } = await supabase.rpc('get_game_intelligence', { p_user: userId });
  if (error) throw new AppError(error);
  return (data ?? null) as GiPublic | null;
}

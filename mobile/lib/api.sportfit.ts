import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { SfAnswers, SfDimension, SfSport } from '@/lib/sportfit/catalogue';

/**
 * Sport Fit — a mindset questionnaire and the sports it points to.
 *
 * Every rule lives in `20261019000001_sport_fit.sql`: who may answer (age,
 * country, the guardian's "mindset" scope), how answers become dimensions,
 * how sports are ranked, how often it may be retaken, and that only the
 * player can read the result. The client asks and renders.
 */

export type SfConsent = 'ok' | 'guardian_required' | 'age_unknown' | 'not_athlete' | 'suspended';
export type SfQuality = 'ok' | 'too_fast' | 'check_failed' | 'straight_line';

export interface SfFit {
  sport: SfSport;
  /** 0–100. */
  fit: number;
  team: 'team' | 'pairs' | 'solo';
  team_match: boolean;
  strengths: SfDimension[];
  develop: SfDimension | null;
}

export interface SfResult {
  id: string;
  created_at: string;
  /** 0–100 per mindset dimension. */
  dimensions: Partial<Record<SfDimension, number>>;
  /** 0–100, present only when Game Intelligence results were used. */
  gi_signals: Partial<Record<'reading' | 'speed', number>>;
  fits: SfFit[];
  algorithm_version: number;
}

export interface SfState {
  consent: SfConsent;
  self_consent_age: number;
  guardian_pending: boolean;
  items: string[];
  has_game_intelligence: boolean;
  result: SfResult | null;
  next_retake_at: string | null;
}

export interface SfSubmitOutcome {
  id: string;
  quality: SfQuality;
  dimensions: SfResult['dimensions'];
  gi_signals: SfResult['gi_signals'];
  fits: SfFit[];
}

export async function getSportFitState(): Promise<SfState> {
  const { data, error } = await supabase.rpc('sport_fit_my_state');
  if (error) throw new AppError(error);
  return data as SfState;
}

export async function submitSportFit(answers: SfAnswers, durationSeconds: number): Promise<SfSubmitOutcome> {
  const { data, error } = await supabase.rpc('sport_fit_submit', {
    p_answers: answers,
    p_duration_s: Math.max(0, Math.round(durationSeconds)),
  });
  if (error) throw new AppError(error);
  return data as SfSubmitOutcome;
}

export async function deleteMySportFit(): Promise<number> {
  const { data, error } = await supabase.rpc('sport_fit_delete_mine');
  if (error) throw new AppError(error);
  return (data ?? 0) as number;
}

export { canRetake } from '@/lib/sportfit/catalogue';

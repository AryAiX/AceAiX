import { supabase } from './_helpers';
import {
  buildAthleteRecommendationResponse,
  type AthleteRecommendationContext,
  type AthleteRecommendationResponse,
} from '../lib/athleteRecommendations';

function isRecommendationResponse(value: unknown): value is AthleteRecommendationResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AthleteRecommendationResponse>;
  return (
    candidate.schemaVersion === '1' &&
    candidate.algorithmVersion === 'athlete-recommendations-v1' &&
    (candidate.generationMode === 'ai' || candidate.generationMode === 'deterministic-fallback') &&
    Array.isArray(candidate.recommendations)
  );
}

export async function getAthleteRecommendations(
  fallbackContext: AthleteRecommendationContext,
): Promise<AthleteRecommendationResponse> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw new Error(error?.message ?? 'Authentication required');

    const response = await fetch('/api/athlete-recommendations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!response.ok) throw new Error(`Recommendation service returned ${response.status}`);
    const payload: unknown = await response.json();
    if (!isRecommendationResponse(payload)) throw new Error('Recommendation service returned an invalid response');
    return payload;
  } catch {
    return buildAthleteRecommendationResponse(fallbackContext);
  }
}

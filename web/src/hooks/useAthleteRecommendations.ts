import { useQuery } from '@tanstack/react-query';
import { getAthleteRecommendations } from '../api/ai';
import { profileViewCount } from '../api/analytics';
import { listEndorsements } from '../api/network';
import { listOpportunities } from '../api/opportunities';
import { listMatches, listMedia } from '../api/portfolio';
import type { AthleteRecommendationContext } from '../lib/athleteRecommendations';
import { useMyAthlete } from './useAthlete';

export function useAthleteRecommendations() {
  const athleteQuery = useMyAthlete();
  const athlete = athleteQuery.data ?? null;
  const athleteId = athlete?.id;

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'athlete-recommendations'],
    queryFn: () => listOpportunities({ limit: 40 }),
  });
  const matchesQuery = useQuery({
    queryKey: ['matches', athleteId, 'athlete-recommendations'],
    queryFn: () => listMatches(athleteId!, 8),
    enabled: !!athleteId,
  });
  const mediaQuery = useQuery({
    queryKey: ['media', athleteId, 'athlete-recommendations'],
    queryFn: () => listMedia(athleteId!, { publicOnly: true }),
    enabled: !!athleteId,
  });
  const endorsementsQuery = useQuery({
    queryKey: ['endorsements', athleteId, 'athlete-recommendations'],
    queryFn: () => listEndorsements(athleteId!),
    enabled: !!athleteId,
  });
  const viewsQuery = useQuery({
    queryKey: ['profile-views', athleteId, 'athlete-recommendations'],
    queryFn: () => profileViewCount(athleteId!),
    enabled: !!athleteId,
  });

  const context: AthleteRecommendationContext = {
    athlete,
    opportunities: opportunitiesQuery.data ?? [],
    matches: matchesQuery.data ?? [],
    publicMediaCount: mediaQuery.data?.length ?? 0,
    endorsementCount: endorsementsQuery.data?.length ?? 0,
    profileViewCount: viewsQuery.data ?? 0,
  };

  const contextLoading =
    athleteQuery.isLoading ||
    opportunitiesQuery.isLoading ||
    matchesQuery.isLoading ||
    mediaQuery.isLoading ||
    endorsementsQuery.isLoading ||
    viewsQuery.isLoading;

  const recommendationQuery = useQuery({
    queryKey: ['athlete-recommendations', athleteId],
    queryFn: () => getAthleteRecommendations(context),
    enabled: !!athleteId && !contextLoading,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...recommendationQuery,
    athlete,
    isLoading: contextLoading || recommendationQuery.isLoading,
  };
}

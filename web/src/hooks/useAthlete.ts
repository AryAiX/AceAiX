import { useQuery } from '@tanstack/react-query';
import { getAthleteByUserId } from '../api/athletes';
import { useAuth } from '../context/AuthContext';

/** The athlete profile for the currently authenticated user. */
export function useMyAthlete() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-athlete', user?.id],
    queryFn: () => getAthleteByUserId(user!.id),
    enabled: !!user?.id,
  });
}

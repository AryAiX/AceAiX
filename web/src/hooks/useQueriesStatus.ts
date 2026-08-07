import { UseQueryResult } from '@tanstack/react-query';

interface QueriesStatus {
  isLoading: boolean;
  isError: boolean;
  errors: unknown[];
}

export function useQueriesStatus(queries: UseQueryResult<unknown, unknown>[]): QueriesStatus {
  const isLoading = queries.some((q) => q.isLoading);
  const errored = queries.filter((q) => q.isError);
  return {
    isLoading,
    isError: errored.length > 0,
    errors: errored.map((q) => q.error),
  };
}

export function withoutSearchParam(
  searchParams: URLSearchParams,
  key: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(key);
  return next;
}

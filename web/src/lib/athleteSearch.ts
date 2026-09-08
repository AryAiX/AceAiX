const SEARCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'athlete', 'athletes', 'find', 'for', 'from', 'in',
  'footed', 'is', 'looking', 'me', 'of', 'over', 'player', 'players', 'season',
  'show', 'the', 'this', 'under', 'want', 'who', 'with',
]);

export function athleteSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((term) => term && !SEARCH_STOP_WORDS.has(term) && !/^\d+$/.test(term));
}

export function athleteMatchesSearch(haystack: string, query: string): boolean {
  const normalizedHaystack = haystack.toLowerCase();
  const terms = athleteSearchTerms(query);
  return terms.length === 0 || terms.every((term) => normalizedHaystack.includes(term));
}

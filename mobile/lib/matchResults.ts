export function normalizeMatchResult(raw: string | null | undefined): 'W' | 'D' | 'L' | null {
  if (!raw) return null;
  const tokens = raw.trim().split(/\s+/);
  const lastToken = tokens[tokens.length - 1]?.toUpperCase();
  if (lastToken === 'W' || lastToken === 'D' || lastToken === 'L') return lastToken;
  const wholeWord = raw.trim().toUpperCase();
  if (wholeWord === 'WIN' || wholeWord === 'WON') return 'W';
  if (wholeWord === 'DRAW' || wholeWord === 'TIE' || wholeWord === 'TIED') return 'D';
  if (wholeWord === 'LOSS' || wholeWord === 'LOSE' || wholeWord === 'LOST') return 'L';
  return null;
}

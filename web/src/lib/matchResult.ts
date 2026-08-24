export function resultKind(r: string | null): 'win' | 'draw' | 'loss' {
  if (!r) return 'draw';
  const normalized = r.trim().toUpperCase();
  const trailing = normalized.match(/\s([WDL])$/);
  const code = trailing
    ? trailing[1]
    : normalized === 'W' || normalized === 'WIN' ? 'W'
    : normalized === 'D' || normalized === 'DRAW' ? 'D'
    : normalized === 'L' || normalized === 'LOSS' || normalized === 'LOST' ? 'L'
    : null;
  if (code === 'W') return 'win';
  if (code === 'L') return 'loss';
  return 'draw';
}

export function parseResultForEdit(r: string | null): { teamScore: string; opponentScore: string; result: 'win' | 'draw' | 'loss' } {
  const kind = resultKind(r);
  if (!r) return { teamScore: '', opponentScore: '', result: kind };
  const scoreMatch = r.trim().match(/^(\d+)-(\d+)/);
  if (scoreMatch) {
    return { teamScore: scoreMatch[1], opponentScore: scoreMatch[2], result: kind };
  }
  return { teamScore: '', opponentScore: '', result: kind };
}

interface SalaryRange {
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  SAR: '﷼',
};

export function formatSalary(range: SalaryRange): string | null {
  const { salary_min, salary_max, currency } = range;
  if (!salary_min && !salary_max) return null;
  const formatAmount = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
    return String(amount);
  };
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  if (salary_min && salary_max) {
    return `${symbol}${formatAmount(salary_min)} – ${symbol}${formatAmount(salary_max)}/yr`;
  }
  if (salary_max) return `Up to ${symbol}${formatAmount(salary_max)}/yr`;
  return `${symbol}${formatAmount(salary_min!)}/yr`;
}

export function deadlineLabel(deadline: string | null): string {
  if (!deadline) return 'Open';
  const date = new Date(deadline);
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days}d left`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function postTimeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    self_reported: 'Self-reported',
    chesscom: 'via Chess.com',
    lichess: 'via Lichess',
    'chesscom,lichess': 'via Chess.com + Lichess',
    'lichess,chesscom': 'via Chess.com + Lichess',
    api_sports: 'via API-Sports',
    imported_result: 'Imported result',
  };
  return labels[source] ?? source;
}

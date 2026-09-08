export type OpportunityType = 'Trial' | 'Contract' | 'Academy' | 'Loan' | 'Tryout';

export interface OpportunityFilterValues {
  sport?: string;
  type?: OpportunityType;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  search?: string;
}

export interface FilterableOpportunity {
  title: string;
  club: string;
  sport: string;
  position: string;
  type: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
}

export function normalizeOpportunityType(value: string | null | undefined): OpportunityType {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'offer':
    case 'contract':
      return 'Contract';
    case 'academy':
      return 'Academy';
    case 'loan':
      return 'Loan';
    case 'tryout':
      return 'Tryout';
    case 'trial':
    default:
      return 'Trial';
  }
}

export function opportunityTypeDatabaseValue(type: OpportunityType): string {
  return normalizeOpportunityType(type) === 'Contract' ? 'offer' : type.toLowerCase();
}

export function salaryRangeError(
  minimum: number | undefined,
  maximum: number | undefined,
): string | null {
  if (minimum != null && maximum != null && minimum > maximum) {
    return 'Minimum salary cannot exceed maximum salary.';
  }
  return null;
}

export function matchesOpportunityFilters(
  opportunity: FilterableOpportunity,
  filters?: OpportunityFilterValues,
): boolean {
  if (!filters) return true;
  if (filters.sport && opportunity.sport.toLowerCase() !== filters.sport.toLowerCase()) return false;
  if (filters.type && normalizeOpportunityType(opportunity.type) !== normalizeOpportunityType(filters.type)) return false;
  if (filters.location && !opportunity.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
  if (filters.salary_min != null && (opportunity.salary_max ?? 0) < filters.salary_min) return false;
  if (filters.salary_max != null && (opportunity.salary_min ?? Infinity) > filters.salary_max) return false;
  if (filters.search) {
    const query = filters.search.trim().toLowerCase();
    const haystack = [
      opportunity.title,
      opportunity.position,
      opportunity.location,
      opportunity.club,
    ].join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
  }
  return true;
}

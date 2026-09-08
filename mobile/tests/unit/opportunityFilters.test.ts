import { describe, expect, it } from 'vitest';
import {
  matchesOpportunityFilters,
  normalizeOpportunityType,
  opportunityTypeDatabaseValue,
  salaryRangeError,
  type FilterableOpportunity,
} from '@/lib/opportunityFilters';

const opportunity: FilterableOpportunity = {
  title: 'Open Trial: Right Winger',
  club: 'Al Wasl SC',
  sport: 'Football',
  position: 'Winger',
  type: 'trial',
  location: 'Dubai, UAE',
  salary_min: null,
  salary_max: null,
};

describe('opportunity filters', () => {
  it('normalizes database offer vocabulary to the Contract UI type', () => {
    expect(normalizeOpportunityType('offer')).toBe('Contract');
    expect(normalizeOpportunityType('CONTRACT')).toBe('Contract');
    expect(opportunityTypeDatabaseValue('Contract')).toBe('offer');
    expect(matchesOpportunityFilters(
      { ...opportunity, type: 'offer' },
      { type: 'Contract' },
    )).toBe(true);
  });

  it('matches opportunity types case-insensitively', () => {
    expect(opportunityTypeDatabaseValue('Trial')).toBe('trial');
    expect(opportunityTypeDatabaseValue('Academy')).toBe('academy');
    expect(matchesOpportunityFilters(opportunity, { type: 'Trial' })).toBe(true);
  });

  it('includes the opportunity title in local search', () => {
    expect(matchesOpportunityFilters(opportunity, { search: 'open trial' })).toBe(true);
  });

  it('rejects inverted salary ranges with clear guidance', () => {
    expect(salaryRangeError(200_000, 100_000))
      .toBe('Minimum salary cannot exceed maximum salary.');
    expect(salaryRangeError(100_000, 100_000)).toBeNull();
    expect(salaryRangeError(undefined, 100_000)).toBeNull();
  });
});

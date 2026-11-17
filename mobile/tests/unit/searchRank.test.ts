import { describe, expect, it } from 'vitest';

import { matchScore, orderSections, rankBy, relevantPeople } from '@/lib/searchRank';

describe('search ranking', () => {
  it('scores exact, starts-with, word-start and inside', () => {
    expect(matchScore('Sara Haddad', 'sara haddad')).toBe(4);
    expect(matchScore('sar', 'Sara Haddad')).toBe(3);
    expect(matchScore('had', 'Sara Haddad')).toBe(2);
    expect(matchScore('add', 'Sara Haddad')).toBe(1);
    expect(matchScore('zz', 'Sara Haddad')).toBe(0);
    expect(matchScore('#Tennis', 'tennis camp')).toBe(3);
  });

  it('keeps only rows that match, best first', () => {
    const rows = ['Joanna', 'Ana Lopez', 'Banana'];
    expect(rankBy(rows, 'ana', (r) => [r])).toEqual(['Ana Lopez', 'Banana']);
  });

  it('shows at most five people, and only the relevant ones', () => {
    const people = ['Ana', 'Anabel', 'Joanna', 'Diana', 'Hanan', 'Anil', 'Anwar', 'Anya'];
    const shown = relevantPeople(people, 'an', (p) => p);
    expect(shown.length).toBe(5);
    expect(shown).not.toContain('Joanna');
    expect(relevantPeople(['Joanna'], 'an', (p) => p)).toEqual([]);
    expect(relevantPeople(['Joanna', 'Diana'], 'ann', (p) => p)).toEqual(['Joanna']);
  });

  it('puts posts first unless a name was typed', () => {
    expect(orderSections({}, { posts: 3, people: 2, clubs: 1 })).toEqual(['posts', 'people', 'clubs']);
    expect(orderSections({ clubs: 4 }, { posts: 3, people: 2, clubs: 1 })).toEqual(['clubs', 'posts', 'people']);
    expect(orderSections({}, { people: 2, trials: 0 })).toEqual(['people']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  resolveFeedType,
  resolveMediaTab,
  resolveOpportunityTab,
  resolveSportifyAcademyTab,
} from '@/lib/deepLinkMappings';

describe('feed deep-link mappings', () => {
  it('routes reels to the actual reels media tab', () => {
    expect(resolveFeedType('reels')).toEqual({ screen: 'media', tab: 'Reels' });
    expect(resolveMediaTab('reels')).toBe('Reels');
  });

  it('preserves documented post feed modes', () => {
    expect(resolveFeedType('posts')).toEqual({ screen: 'feed', filter: 'latest' });
    expect(resolveFeedType('latest')).toEqual({ screen: 'feed', filter: 'latest' });
    expect(resolveFeedType('following')).toEqual({ screen: 'feed', filter: 'following' });
    expect(resolveFeedType('for-you')).toEqual({ screen: 'feed', filter: 'for_you' });
  });
});

describe('opportunity deep-link mappings', () => {
  it.each([
    ['for-you', 'For You'],
    ['for_you', 'For You'],
    ['For You', 'For You'],
    ['all', 'All'],
    ['saved', 'Saved'],
    ['applied', 'Applied'],
    ['applications', 'Applied'],
  ] as const)('maps %s to %s', (alias, tab) => {
    expect(resolveOpportunityTab(alias)).toBe(tab);
  });

  it('ignores unknown aliases', () => {
    expect(resolveOpportunityTab('archived')).toBeNull();
  });
});

describe('Sportify Academy deep-link mappings', () => {
  it.each([
    ['appointments', 'appointments'],
    ['results', 'results'],
  ] as const)('maps %s to %s', (alias, tab) => {
    expect(resolveSportifyAcademyTab(alias)).toBe(tab);
  });

  it('ignores unknown tabs', () => {
    expect(resolveSportifyAcademyTab('overview')).toBeNull();
  });
});

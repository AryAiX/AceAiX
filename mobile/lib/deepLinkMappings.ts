export type FeedFilterKey = 'for_you' | 'following' | 'latest';
export type MediaTab = 'Posts' | 'Reels';
export type OpportunityTab = 'For You' | 'All' | 'Saved' | 'Applied';
export type SportifyAcademyTab = 'results' | 'appointments';

export type FeedDeepLinkDestination =
  | { screen: 'feed'; filter: FeedFilterKey }
  | { screen: 'media'; tab: 'Reels' };

function normalizedAlias(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function resolveFeedType(
  value: string | null | undefined,
): FeedDeepLinkDestination | null {
  switch (normalizedAlias(value)) {
    case 'posts':
    case 'latest':
      return { screen: 'feed', filter: 'latest' };
    case 'following':
      return { screen: 'feed', filter: 'following' };
    case 'foryou':
      return { screen: 'feed', filter: 'for_you' };
    case 'reels':
      return { screen: 'media', tab: 'Reels' };
    default:
      return null;
  }
}

export function resolveMediaTab(value: string | null | undefined): MediaTab | null {
  switch (normalizedAlias(value)) {
    case 'posts':
      return 'Posts';
    case 'reels':
      return 'Reels';
    default:
      return null;
  }
}

export function resolveOpportunityTab(
  value: string | null | undefined,
): OpportunityTab | null {
  switch (normalizedAlias(value)) {
    case 'foryou':
      return 'For You';
    case 'all':
      return 'All';
    case 'saved':
      return 'Saved';
    case 'applied':
    case 'applications':
      return 'Applied';
    default:
      return null;
  }
}

export function resolveSportifyAcademyTab(
  value: string | null | undefined,
): SportifyAcademyTab | null {
  switch (normalizedAlias(value)) {
    case 'results':
      return 'results';
    case 'appointments':
      return 'appointments';
    default:
      return null;
  }
}

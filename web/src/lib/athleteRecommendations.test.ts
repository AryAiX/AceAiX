import { describe, expect, it } from 'vitest';
import type { AthleteProfile, MatchRecord, Opportunity } from '../types';
import {
  buildAthleteRecommendationResponse,
  buildAthleteRecommendations,
  computeOpportunityMatch,
  type AthleteRecommendationContext,
} from './athleteRecommendations';

function athlete(overrides: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    id: 'athlete-1',
    user_id: 'user-1',
    sport: 'Football',
    positions: ['Striker'],
    position: 'Striker',
    position_primary: 'Striker',
    position_secondary: null,
    height_cm: 180,
    weight_kg: 75,
    birth_date: '2001-01-01',
    nationality: 'GB',
    dominant_foot: 'right',
    current_club_id: null,
    current_club: 'City FC',
    level: 'professional',
    bio: null,
    cover_url: null,
    is_open_to_offers: true,
    visibility_score: 72,
    performance_score: 68,
    fitness_score: 99,
    profile_completeness: 80,
    followers_count: 0,
    connections_count: 0,
    highlighted_stats: {},
    attributes: [{ label: 'Passing', value: 61, endorsements: 0, topEndorser: '', topEndorserVerified: false }],
    academy: [],
    certifications: [],
    honors: [],
    languages: [],
    following: [],
    trajectory: [],
    analytics: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opportunity-1',
    organization_id: 'organization-1',
    created_by_id: 'recruiter-1',
    title: 'First Team Trial',
    description: 'Open trial',
    type: 'trial',
    location: 'London',
    sport: 'Football',
    position: 'Striker',
    salary_min: null,
    salary_max: null,
    currency: 'GBP',
    application_deadline: '2026-08-01',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    organization: {
      id: 'organization-1',
      name: 'City FC',
      short_name: 'City',
      initials: 'CFC',
      type: 'club',
      logo_url: null,
      cover_url: null,
      country: 'GB',
      city: 'London',
      website: null,
      description: null,
      league: null,
      stadium: null,
      stadium_capacity: null,
      primary_color: null,
      secondary_color: null,
      verification_status: 'approved',
      is_verified: true,
      followers_count: 0,
      founded_year: null,
      values: [],
      profile: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

function match(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: 'match-1',
    athlete_id: 'athlete-1',
    match_date: '2026-06-01',
    opponent: 'United FC',
    competition: 'League',
    result: 'W 2-1',
    minutes_played: 90,
    goals: 1,
    assists: 1,
    stats: {},
    source: 'verified',
    notes: null,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function context(overrides: Partial<AthleteRecommendationContext> = {}): AthleteRecommendationContext {
  return {
    athlete: athlete(),
    opportunities: [opportunity()],
    matches: [match()],
    publicMediaCount: 1,
    endorsementCount: 1,
    profileViewCount: 12,
    ...overrides,
  };
}

describe('athlete recommendations', () => {
  it('calculates an explainable opportunity match from stated fields', () => {
    const result = computeOpportunityMatch(athlete({ profile_completeness: 100 }), opportunity());

    expect(result.score).toBe(100);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'opportunity.opportunity-1.sport_match', value: true }),
        expect.objectContaining({ id: 'opportunity.opportunity-1.position_match', value: true }),
        expect.objectContaining({ id: 'opportunity.opportunity-1.organization_verified', value: true }),
      ]),
    );
  });

  it('does not represent a profile mismatch as a high match', () => {
    const result = computeOpportunityMatch(
      athlete({ sport: 'Basketball', position: 'Center', position_primary: 'Center', profile_completeness: 50 }),
      opportunity({ sport: 'Football', position: 'Goalkeeper', organization: undefined }),
    );

    expect(result.score).toBe(25);
  });

  it('returns useful recommendations when the athlete has sparse evidence', () => {
    const recommendations = buildAthleteRecommendations(
      context({
        opportunities: [],
        matches: [],
        publicMediaCount: 0,
        endorsementCount: 0,
        profileViewCount: 0,
        athlete: athlete({ attributes: [], profile_completeness: 35 }),
      }),
    );

    expect(new Set(recommendations.map((item) => item.category))).toEqual(
      new Set(['opportunity_match', 'weekly_action', 'profile_visibility', 'development_priority']),
    );
    expect(recommendations.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'opportunity:no-active-opportunities',
        'weekly:add-match-record',
        'weekly:add-public-highlight',
        'development:create-baseline',
      ]),
    );
  });

  it('does not expose excluded athlete fields in generated recommendation evidence', () => {
    const recommendations = buildAthleteRecommendations(context());
    const serialized = JSON.stringify(recommendations);

    expect(serialized).not.toContain('"fitness_score"');
    expect(serialized).not.toContain('2001-01-01');
    expect(serialized).not.toContain('99');
  });

  it('builds a stable response contract and six-hour expiry', () => {
    const now = new Date('2026-07-12T12:00:00.000Z');
    const result = buildAthleteRecommendationResponse(context(), 'deterministic-fallback', now);

    expect(result.schemaVersion).toBe('1');
    expect(result.algorithmVersion).toBe('athlete-recommendations-v1');
    expect(result.generatedAt).toBe('2026-07-12T12:00:00.000Z');
    expect(result.expiresAt).toBe('2026-07-12T18:00:00.000Z');
    expect(result.disclaimer).toBe('Career and development guidance only; not medical advice.');
  });
});

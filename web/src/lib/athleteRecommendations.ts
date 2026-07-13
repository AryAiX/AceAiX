import type { AthleteProfile, MatchRecord, Opportunity } from '../types/index.js';

export const RECOMMENDATION_CATEGORIES = [
  'opportunity_match',
  'weekly_action',
  'profile_visibility',
  'development_priority',
] as const;

export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationConfidence = 'high' | 'medium' | 'limited';
export type RecommendationGenerationMode = 'ai' | 'deterministic-fallback';

export interface RecommendationEvidence {
  id: string;
  label: string;
  value: string | number | boolean;
}

export interface AthleteRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  action: string;
  rationale: string;
  priority: RecommendationPriority;
  confidence: RecommendationConfidence;
  evidence: RecommendationEvidence[];
  href: string;
  opportunityId: string | null;
  matchScore: number | null;
}

export interface AthleteRecommendationContext {
  athlete: AthleteProfile | null;
  opportunities: Opportunity[];
  matches: MatchRecord[];
  publicMediaCount: number;
  endorsementCount: number;
  profileViewCount: number;
}

export interface AthleteRecommendationResponse {
  schemaVersion: '1';
  algorithmVersion: 'athlete-recommendations-v1';
  generatedAt: string;
  expiresAt: string;
  generationMode: RecommendationGenerationMode;
  cache: { hit: boolean };
  recommendations: AthleteRecommendation[];
  disclaimer: 'Career and development guidance only; not medical advice.';
}

export interface OpportunityMatch {
  score: number;
  evidence: RecommendationEvidence[];
}

const CATEGORY_LIMIT = 2;

function clampScore(value: number): number {
  return Math.max(20, Math.min(100, Math.round(value)));
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function positionMatches(athletePosition: string, opportunityPosition: string): boolean {
  if (!athletePosition || !opportunityPosition) return false;
  return opportunityPosition.includes(athletePosition) || athletePosition.includes(opportunityPosition);
}

export function computeOpportunityMatch(
  athlete: AthleteProfile | null | undefined,
  opportunity: Opportunity,
): OpportunityMatch {
  const athleteSport = normalize(athlete?.sport);
  const opportunitySport = normalize(opportunity.sport);
  const athletePosition = normalize(athlete?.position ?? athlete?.position_primary);
  const opportunityPosition = normalize(opportunity.position);
  const sportMatch = !!athleteSport && !!opportunitySport && athleteSport === opportunitySport;
  const openPosition = !opportunityPosition || opportunityPosition.includes('all position');
  const roleMatch = positionMatches(athletePosition, opportunityPosition);
  const organizationVerified = opportunity.organization?.is_verified ?? false;
  const profileCompleteness = Math.round(athlete?.profile_completeness ?? 0);

  let score = 20;
  if (sportMatch) score += 40;
  if (roleMatch) score += 25;
  else if (openPosition) score += 15;
  if (organizationVerified) score += 5;
  score += Math.min(10, Math.round(profileCompleteness / 10));

  return {
    score: clampScore(score),
    evidence: [
      {
        id: `opportunity.${opportunity.id}.sport_match`,
        label: 'Sport matches',
        value: sportMatch,
      },
      {
        id: `opportunity.${opportunity.id}.position_match`,
        label: 'Position matches',
        value: roleMatch || openPosition,
      },
      {
        id: `opportunity.${opportunity.id}.organization_verified`,
        label: 'Verified organization',
        value: organizationVerified,
      },
      {
        id: 'profile.completeness',
        label: 'Profile completeness',
        value: profileCompleteness,
      },
    ],
  };
}

function recommendation(
  input: Omit<AthleteRecommendation, 'opportunityId' | 'matchScore'> &
    Partial<Pick<AthleteRecommendation, 'opportunityId' | 'matchScore'>>,
): AthleteRecommendation {
  return {
    ...input,
    opportunityId: input.opportunityId ?? null,
    matchScore: input.matchScore ?? null,
  };
}

function opportunityRecommendations(context: AthleteRecommendationContext): AthleteRecommendation[] {
  if (!context.athlete) return [];

  const ranked = context.opportunities
    .map((opportunity) => ({ opportunity, match: computeOpportunityMatch(context.athlete, opportunity) }))
    .sort((a, b) => b.match.score - a.match.score || a.opportunity.id.localeCompare(b.opportunity.id))
    .slice(0, CATEGORY_LIMIT);

  if (!ranked.length) {
    return [
      recommendation({
        id: 'opportunity:no-active-opportunities',
        category: 'opportunity_match',
        title: 'Stay ready for the next opening',
        action: 'Keep your sport, position, location, and availability current.',
        rationale: 'There are no active opportunities that can be compared with your profile right now.',
        priority: 'medium',
        confidence: 'limited',
        evidence: [{ id: 'opportunities.active_count', label: 'Active opportunities', value: 0 }],
        href: '/athlete/profile',
      }),
    ];
  }

  return ranked.map(({ opportunity, match }, index) =>
    recommendation({
      id: `opportunity:${opportunity.id}`,
      category: 'opportunity_match',
      title: opportunity.title,
      action: `Review the ${opportunity.type ?? 'opportunity'} from ${opportunity.organization?.name ?? 'the listed organization'}.`,
      rationale: `Your profile has a ${match.score}% match based on stated sport, position, organization verification, and profile readiness.`,
      priority: index === 0 && match.score >= 75 ? 'high' : 'medium',
      confidence: opportunity.sport && (opportunity.position || context.athlete?.position) ? 'high' : 'medium',
      evidence: match.evidence,
      href: '/athlete/opportunities',
      opportunityId: opportunity.id,
      matchScore: match.score,
    }),
  );
}

function weeklyRecommendations(context: AthleteRecommendationContext): AthleteRecommendation[] {
  const completeness = Math.round(context.athlete?.profile_completeness ?? 0);
  const candidates: AthleteRecommendation[] = [];

  if (!context.matches.length) {
    candidates.push(
      recommendation({
        id: 'weekly:add-match-record',
        category: 'weekly_action',
        title: 'Add your latest match',
        action: 'Record one recent match with minutes and key statistics.',
        rationale: 'Recommendations become more specific when your recent performance history is available.',
        priority: 'high',
        confidence: 'high',
        evidence: [{ id: 'matches.recent_count', label: 'Recent matches', value: 0 }],
        href: '/athlete/performance',
      }),
    );
  }

  if (!context.publicMediaCount) {
    candidates.push(
      recommendation({
        id: 'weekly:add-public-highlight',
        category: 'weekly_action',
        title: 'Publish a highlight',
        action: 'Upload one public clip that demonstrates your position-specific strengths.',
        rationale: 'Recruiters can evaluate your profile more easily when it includes current public media.',
        priority: 'high',
        confidence: 'high',
        evidence: [{ id: 'media.public_count', label: 'Public media', value: 0 }],
        href: '/athlete/media',
      }),
    );
  }

  if (completeness < 80) {
    candidates.push(
      recommendation({
        id: 'weekly:complete-profile',
        category: 'weekly_action',
        title: 'Complete one profile section',
        action: 'Add the next missing athletic or career detail to your profile.',
        rationale: `Your profile is ${completeness}% complete; filling the most important gaps improves recommendation quality and recruiter context.`,
        priority: completeness < 50 ? 'high' : 'medium',
        confidence: 'high',
        evidence: [{ id: 'profile.completeness', label: 'Profile completeness', value: completeness }],
        href: '/athlete/profile',
      }),
    );
  }

  if (context.endorsementCount < 2) {
    candidates.push(
      recommendation({
        id: 'weekly:request-endorsement',
        category: 'weekly_action',
        title: 'Request a trusted endorsement',
        action: 'Ask a coach or verified teammate to endorse one relevant skill.',
        rationale: 'Independent evidence adds credibility to the strengths shown on your profile.',
        priority: 'medium',
        confidence: 'high',
        evidence: [{ id: 'endorsements.count', label: 'Endorsements', value: context.endorsementCount }],
        href: '/athlete/network',
      }),
    );
  }

  if (!candidates.length) {
    candidates.push(
      recommendation({
        id: 'weekly:review-opportunities',
        category: 'weekly_action',
        title: 'Review your strongest matches',
        action: 'Compare this week’s top opportunities and save the best fit.',
        rationale: 'Your core profile evidence is in place, so your highest-value action is reviewing current openings.',
        priority: 'medium',
        confidence: 'high',
        evidence: [
          { id: 'opportunities.active_count', label: 'Active opportunities', value: context.opportunities.length },
        ],
        href: '/athlete/opportunities',
      }),
    );
  }

  return candidates.slice(0, CATEGORY_LIMIT);
}

function visibilityRecommendations(context: AthleteRecommendationContext): AthleteRecommendation[] {
  const completeness = Math.round(context.athlete?.profile_completeness ?? 0);
  const visibility = Math.round(context.athlete?.visibility_score ?? 0);
  const candidates: AthleteRecommendation[] = [];

  if (completeness < 90) {
    candidates.push(
      recommendation({
        id: 'visibility:profile-readiness',
        category: 'profile_visibility',
        title: 'Strengthen profile readiness',
        action: 'Complete identity, sport, position, club, and career fields that are still missing.',
        rationale: 'A complete profile gives recruiters enough context to assess fit without guessing.',
        priority: completeness < 60 ? 'high' : 'medium',
        confidence: 'high',
        evidence: [
          { id: 'profile.completeness', label: 'Profile completeness', value: completeness },
          { id: 'profile.visibility_score', label: 'Visibility score', value: visibility },
        ],
        href: '/athlete/profile',
      }),
    );
  }

  if (context.publicMediaCount < 2) {
    candidates.push(
      recommendation({
        id: 'visibility:media-portfolio',
        category: 'profile_visibility',
        title: 'Build a clearer media portfolio',
        action: 'Add a second public clip with a descriptive title and match context.',
        rationale: 'Multiple current clips make it easier to understand consistency and role-specific ability.',
        priority: context.publicMediaCount === 0 ? 'high' : 'medium',
        confidence: 'high',
        evidence: [{ id: 'media.public_count', label: 'Public media', value: context.publicMediaCount }],
        href: '/athlete/media',
      }),
    );
  }

  if (context.endorsementCount < 3) {
    candidates.push(
      recommendation({
        id: 'visibility:social-proof',
        category: 'profile_visibility',
        title: 'Add relevant social proof',
        action: 'Collect endorsements that support the skills emphasized in your profile.',
        rationale: 'Relevant endorsements help profile visitors verify that your stated strengths are recognized by others.',
        priority: 'medium',
        confidence: 'high',
        evidence: [
          { id: 'endorsements.count', label: 'Endorsements', value: context.endorsementCount },
          { id: 'profile.views_count', label: 'Profile views', value: context.profileViewCount },
        ],
        href: '/athlete/network',
      }),
    );
  }

  if (!candidates.length) {
    candidates.push(
      recommendation({
        id: 'visibility:maintain-momentum',
        category: 'profile_visibility',
        title: 'Maintain your profile momentum',
        action: 'Refresh one highlight or career milestone this week.',
        rationale: 'Your profile foundation is strong; keeping evidence current is the next visibility lever.',
        priority: 'low',
        confidence: 'medium',
        evidence: [
          { id: 'profile.visibility_score', label: 'Visibility score', value: visibility },
          { id: 'profile.views_count', label: 'Profile views', value: context.profileViewCount },
        ],
        href: '/athlete/profile',
      }),
    );
  }

  return candidates.slice(0, CATEGORY_LIMIT);
}

function developmentRecommendations(context: AthleteRecommendationContext): AthleteRecommendation[] {
  const performance = Math.round(context.athlete?.performance_score ?? 0);
  const candidates: AthleteRecommendation[] = [];

  if (!context.matches.length) {
    candidates.push(
      recommendation({
        id: 'development:create-baseline',
        category: 'development_priority',
        title: 'Create a performance baseline',
        action: 'Add recent match records before setting a data-backed development priority.',
        rationale: 'No recent match evidence is available, so a specific performance claim would be unreliable.',
        priority: 'high',
        confidence: 'limited',
        evidence: [{ id: 'matches.recent_count', label: 'Recent matches', value: 0 }],
        href: '/athlete/performance',
      }),
    );
  } else {
    const contributions = context.matches.reduce((sum, match) => sum + match.goals + match.assists, 0);
    candidates.push(
      recommendation({
        id: 'development:review-recent-form',
        category: 'development_priority',
        title: 'Review your recent match pattern',
        action: 'Compare minutes, role, and key statistics across your latest recorded matches.',
        rationale: 'A consistent trend across several matches is a stronger development signal than one isolated result.',
        priority: 'high',
        confidence: context.matches.length >= 3 ? 'high' : 'medium',
        evidence: [
          { id: 'matches.recent_count', label: 'Recent matches', value: context.matches.length },
          { id: 'matches.goal_contributions', label: 'Goals + assists', value: contributions },
        ],
        href: '/athlete/performance',
      }),
    );
  }

  const recordedAttributes = (context.athlete?.attributes ?? [])
    .filter((attribute) => Number.isFinite(attribute.value))
    .sort((a, b) => a.value - b.value);
  const lowestAttribute = recordedAttributes[0];

  if (lowestAttribute) {
    candidates.push(
      recommendation({
        id: `development:attribute:${lowestAttribute.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        category: 'development_priority',
        title: `Prioritize ${lowestAttribute.label}`,
        action: `Set one measurable weekly goal for ${lowestAttribute.label.toLowerCase()} and update the recorded result.`,
        rationale: `${lowestAttribute.label} is the lowest currently recorded non-medical attribute on your profile.`,
        priority: 'medium',
        confidence: 'medium',
        evidence: [
          {
            id: `attribute.${lowestAttribute.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
            label: lowestAttribute.label,
            value: lowestAttribute.value,
          },
        ],
        href: '/athlete/performance',
      }),
    );
  } else {
    candidates.push(
      recommendation({
        id: 'development:add-attributes',
        category: 'development_priority',
        title: 'Record position-relevant attributes',
        action: 'Add verified or sourced athletic attributes to support a specific development plan.',
        rationale: 'There are no recorded attributes available for a responsible strength or gap comparison.',
        priority: 'medium',
        confidence: 'limited',
        evidence: [
          { id: 'attributes.recorded_count', label: 'Recorded attributes', value: 0 },
          { id: 'profile.performance_score', label: 'Performance score', value: performance },
        ],
        href: '/athlete/performance',
      }),
    );
  }

  return candidates.slice(0, CATEGORY_LIMIT);
}

export function buildAthleteRecommendations(context: AthleteRecommendationContext): AthleteRecommendation[] {
  return [
    ...opportunityRecommendations(context),
    ...weeklyRecommendations(context),
    ...visibilityRecommendations(context),
    ...developmentRecommendations(context),
  ];
}

export function buildAthleteRecommendationResponse(
  context: AthleteRecommendationContext,
  generationMode: RecommendationGenerationMode = 'deterministic-fallback',
  now = new Date(),
): AthleteRecommendationResponse {
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return {
    schemaVersion: '1',
    algorithmVersion: 'athlete-recommendations-v1',
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    generationMode,
    cache: { hit: false },
    recommendations: buildAthleteRecommendations(context),
    disclaimer: 'Career and development guidance only; not medical advice.',
  };
}

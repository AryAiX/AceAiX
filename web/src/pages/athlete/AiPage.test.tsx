import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AiPage from './AiPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { full_name: 'Alex Morgan' } }),
}));

vi.mock('../../hooks/useAthleteRecommendations', () => ({
  useAthleteRecommendations: () => ({
    athlete: { id: 'athlete-1' },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    data: {
      schemaVersion: '1',
      algorithmVersion: 'athlete-recommendations-v1',
      generatedAt: '2026-07-12T12:00:00.000Z',
      expiresAt: '2026-07-12T18:00:00.000Z',
      generationMode: 'ai',
      cache: { hit: false },
      disclaimer: 'Career and development guidance only; not medical advice.',
      recommendations: [
        {
          id: 'opportunity:1',
          category: 'opportunity_match',
          title: 'First Team Trial',
          action: 'Review the open trial.',
          rationale: 'Your sport and position match this opening.',
          priority: 'high',
          confidence: 'high',
          evidence: [{ id: 'sport.match', label: 'Sport matches', value: true }],
          href: '/athlete/opportunities',
          opportunityId: '1',
          matchScore: 92,
        },
      ],
    },
  }),
}));

describe('AiPage', () => {
  it('renders explainable athlete recommendations and evidence', () => {
    render(
      <MemoryRouter>
        <AiPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Alex, here are your next best moves')).toBeInTheDocument();
    expect(screen.getByText('AI-personalized')).toBeInTheDocument();
    expect(screen.getByText('First Team Trial')).toBeInTheDocument();
    expect(screen.getByText(/Sport matches:/)).toHaveTextContent('Yes');
    expect(screen.getByRole('link', { name: /Take action/i })).toHaveAttribute('href', '/athlete/opportunities');
  });
});

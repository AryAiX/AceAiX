import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthleteRecommendations } from '../../hooks/useAthleteRecommendations';
import type {
  AthleteRecommendation,
  RecommendationCategory,
  RecommendationEvidence,
} from '../../lib/athleteRecommendations';

const CATEGORY_META: Record<
  RecommendationCategory,
  { label: string; description: string; icon: typeof Briefcase; color: string; background: string }
> = {
  opportunity_match: {
    label: 'Opportunity matches',
    description: 'Openings compared with your stated sport, position, and profile readiness.',
    icon: Briefcase,
    color: '#B8F135',
    background: 'rgba(184,241,53,0.10)',
  },
  weekly_action: {
    label: 'This week',
    description: 'The highest-value actions to move your profile and career forward.',
    icon: CheckCircle2,
    color: '#2F80ED',
    background: 'rgba(47,128,237,0.12)',
  },
  profile_visibility: {
    label: 'Profile & visibility',
    description: 'Ways to make your evidence clearer and easier for recruiters to evaluate.',
    icon: Eye,
    color: '#A78BFA',
    background: 'rgba(167,139,250,0.12)',
  },
  development_priority: {
    label: 'Development priorities',
    description: 'Data-backed areas to review without making medical or unsupported claims.',
    icon: Target,
    color: '#F2C94C',
    background: 'rgba(242,201,76,0.12)',
  },
};

const PRIORITY_STYLE = {
  high: 'text-coral bg-coral/10 border-coral/20',
  medium: 'text-amber bg-amber/10 border-amber/20',
  low: 'text-muted bg-white/[0.04] border-white/10',
};

function evidenceValue(evidence: RecommendationEvidence): string {
  if (typeof evidence.value === 'boolean') return evidence.value ? 'Yes' : 'No';
  if (evidence.id.includes('completeness') || evidence.id.includes('score')) return `${evidence.value}%`;
  return String(evidence.value);
}

function RecommendationCard({ recommendation }: { recommendation: AthleteRecommendation }) {
  return (
    <article className="card-dark rounded-2xl p-5 flex flex-col h-full border border-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.12em] border rounded-full px-2 py-1 ${PRIORITY_STYLE[recommendation.priority]}`}
            >
              {recommendation.priority} priority
            </span>
            <span className="text-[10px] text-muted uppercase tracking-[0.12em]">
              {recommendation.confidence} confidence
            </span>
          </div>
          <h3 className="text-base font-bold text-white leading-snug">{recommendation.title}</h3>
        </div>
        {recommendation.matchScore !== null && (
          <div className="w-12 h-12 rounded-full border-2 border-volt/50 bg-volt/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-volt">{recommendation.matchScore}%</span>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-300 mt-3 leading-relaxed">{recommendation.rationale}</p>

      <div className="mt-4 p-3 rounded-xl bg-white/[0.035] border border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Recommended action</p>
        <p className="text-sm text-white/90 leading-relaxed">{recommendation.action}</p>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {recommendation.evidence.map((evidence) => (
          <span
            key={evidence.id}
            className="text-[10px] text-muted rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1"
            title={evidence.id}
          >
            {evidence.label}: <span className="text-white/80 font-semibold">{evidenceValue(evidence)}</span>
          </span>
        ))}
      </div>

      <Link
        to={recommendation.href}
        className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-azure hover:text-white transition-colors"
      >
        Take action <ArrowRight size={14} />
      </Link>
    </article>
  );
}

export default function AiPage() {
  const { profile } = useAuth();
  const { data, athlete, isLoading, isFetching, refetch } = useAthleteRecommendations();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Athlete';

  if (isLoading) {
    return (
      <div className="max-w-6xl space-y-5 animate-pulse">
        <div className="h-24 rounded-2xl bg-white/[0.04]" />
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-64 rounded-2xl bg-white/[0.04]" />)}
        </div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="max-w-3xl card-dark rounded-2xl p-8 text-center">
        <Target size={30} className="text-azure mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white">Complete your athlete profile first</h1>
        <p className="text-sm text-muted mt-2">
          Recommendations need your sport and athlete profile before they can compare opportunities or suggest next steps.
        </p>
        <Link to="/athlete/profile" className="btn-primary inline-flex items-center gap-2 mt-5">
          Complete profile <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const categories = (Object.keys(CATEGORY_META) as RecommendationCategory[]).map((category) => ({
    category,
    recommendations: data?.recommendations.filter((recommendation) => recommendation.category === category) ?? [],
  }));

  return (
    <div className="max-w-6xl space-y-6 animate-in">
      <section
        className="relative overflow-hidden rounded-2xl border border-azure/20 p-6"
        style={{ background: 'linear-gradient(135deg, rgba(47,128,237,0.14), rgba(184,241,53,0.05))' }}
      >
        <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-azure/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-azure font-bold mb-3">
              <Sparkles size={12} /> Athlete intelligence
            </div>
            <h1 className="text-2xl font-display font-bold text-white">
              {firstName}, here are your next best moves
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Recommendations use your live AceAiX profile and explain the evidence behind every suggestion.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs rounded-full px-3 py-1.5 bg-white/[0.05] border border-white/10 text-white/80">
                {data?.generationMode === 'ai' ? 'AI-personalized' : 'Explainable profile mode'}
              </span>
              <span className="text-xs rounded-full px-3 py-1.5 bg-white/[0.05] border border-white/10 text-muted">
                Updated {data ? new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
              </span>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white hover:bg-white/[0.06] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      {categories.map(({ category, recommendations }) => {
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;
        return (
          <section key={category} className="space-y-3">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ color: meta.color, background: meta.background }}
              >
                <Icon size={17} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{meta.label}</h2>
                <p className="text-xs text-muted mt-0.5">{meta.description}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-muted border-t border-white/[0.06] pt-4">
        {data?.disclaimer ?? 'Career and development guidance only; not medical advice.'}
      </p>
    </div>
  );
}

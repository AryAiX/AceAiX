import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, MapPin, Clock, ShieldCheck,
  Bookmark, BookmarkCheck, Zap, ArrowRight, Filter, TrendingUp,
  CheckCircle, ChevronDown, Loader2,
} from 'lucide-react';
import { useMyAthlete } from '../../hooks/useAthlete';
import { listOpportunities } from '../../api/opportunities';
import type { AthleteProfile, Opportunity } from '../../types';

interface OppView {
  id: string;
  type: string;
  title: string;
  club: string;
  logo: string;
  location: string;
  sport: string;
  position: string;
  deadline: string;
  salary: string;
  verified: boolean;
  aiMatch: number;
  featured: boolean;
  description: string;
  tags: string[];
}

const FALLBACK_LOGO = 'https://images.pexels.com/photos/47343/the-ball-stadion-football-the-pitch-47343.jpeg?auto=compress&cs=tinysrgb&w=60';

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  trial:       { label: 'Trial',       color: '#F2C94C', bg: 'rgba(242,201,76,0.12)'  },
  contract:    { label: 'Contract',    color: '#1FB17A', bg: 'rgba(31,177,122,0.12)'  },
  scholarship: { label: 'Scholarship', color: '#2F80ED', bg: 'rgba(47,128,237,0.12)'  },
};

function metaFor(type: string) {
  return TYPE_META[type] ?? { label: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Opportunity', color: '#7C8DA6', bg: 'rgba(124,141,166,0.12)' };
}

function fmtSalary(o: Opportunity): string {
  if (o.salary_min && o.salary_max) return `${o.currency} ${o.salary_min / 1000}k–${o.salary_max / 1000}k`;
  if (o.salary_min) return `${o.currency} ${o.salary_min / 1000}k+`;
  return 'TBD';
}

function computeMatch(athlete: AthleteProfile | null | undefined, o: Opportunity): number {
  let score = 50;
  const aSport = athlete?.sport?.toLowerCase();
  const aPos = (athlete?.position ?? athlete?.position_primary ?? '').toLowerCase();
  if (aSport && o.sport && aSport === o.sport.toLowerCase()) score += 25;
  if (aPos && o.position && o.position.toLowerCase().includes(aPos)) score += 15;
  score += Math.round((athlete?.visibility_score ?? 0) / 10);
  return Math.max(40, Math.min(99, score));
}

function toOppView(o: Opportunity, athlete: AthleteProfile | null | undefined): OppView {
  return {
    id: o.id,
    type: (o.type ?? 'trial').toLowerCase(),
    title: o.title,
    club: o.organization?.name ?? 'Independent',
    logo: o.organization?.logo_url ?? FALLBACK_LOGO,
    location: o.location ?? '—',
    sport: o.sport ?? '—',
    position: o.position ?? 'All Positions',
    deadline: o.application_deadline ?? 'Open',
    salary: fmtSalary(o),
    verified: o.organization?.is_verified ?? false,
    aiMatch: computeMatch(athlete, o),
    featured: false,
    description: o.description ?? '',
    tags: [o.type, o.sport].filter((t): t is string => !!t),
  };
}

function MatchRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = pct >= 85 ? '#B8F135' : pct >= 70 ? '#2F80ED' : '#7C8DA6';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.19,1,0.22,1)' }} />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function OpportunitiesPage() {
  const { data: athlete } = useMyAthlete();
  const [filter, setFilter]   = useState('all');
  const [sort, setSort]       = useState<'match' | 'deadline'>('match');
  const [saved, setSaved]     = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);

  const { data: rawOpps = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => listOpportunities({}),
  });

  const opportunities: OppView[] = rawOpps.map(o => toOppView(o, athlete));
  // mark the single best AI match as featured
  const topId = opportunities.reduce<OppView | null>((best, o) => (!best || o.aiMatch > best.aiMatch ? o : best), null)?.id;
  opportunities.forEach(o => { o.featured = o.id === topId; });

  const filtered = opportunities
    .filter(o => filter === 'all' || o.type === filter)
    .sort((a, b) => sort === 'match' ? b.aiMatch - a.aiMatch : a.deadline.localeCompare(b.deadline));

  const featured = filtered.find(o => o.featured);
  const rest = filtered.filter(o => !o.featured);

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'trial', label: 'Trials' },
    { id: 'contract', label: 'Contracts' },
    { id: 'scholarship', label: 'Scholarships' },
  ];

  return (
    <div className="max-w-4xl space-y-5 animate-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="section-title">Opportunities</h1>
          <p className="section-subtitle">Trials, contracts & scholarships matched by AI to your profile</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted px-3 py-1.5 rounded-xl bg-volt/10 border border-volt/20 text-volt font-semibold">
            <Zap size={11} /> {filtered.length} AI-matched
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Applied', value: applied.size, icon: <CheckCircle size={14} />, color: 'text-emerald', bg: 'bg-emerald/10' },
          { label: 'Saved',   value: saved.size,   icon: <Bookmark size={14} />,    color: 'text-azure',   bg: 'bg-azure/10'   },
          { label: 'Views',   value: 12,            icon: <TrendingUp size={14} />,  color: 'text-amber',   bg: 'bg-amber/10'   },
        ].map(s => (
          <div key={s.label} className="card-dark p-3.5 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-lg font-display font-bold text-white tabular">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + sort bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                filter === f.id
                  ? 'bg-azure text-white'
                  : 'bg-white/[0.04] border border-white/10 text-muted hover:text-white hover:border-white/20'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-shrink-0">
          <button onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted border border-white/10 hover:text-white hover:border-white/20 transition-all bg-white/[0.02]">
            <Filter size={13} /> Sort <ChevronDown size={12} style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-10 w-44 card-dark border border-white/10 rounded-xl overflow-hidden z-20" style={{ animation: 'fadeIn 0.15s ease' }}>
              {[{ id: 'match', label: 'Best AI Match' }, { id: 'deadline', label: 'Earliest Deadline' }].map(o => (
                <button key={o.id} onClick={() => { setSort(o.id as any); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sort === o.id ? 'text-azure bg-azure/5' : 'text-muted hover:text-white hover:bg-white/5'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Featured card */}
      {featured && filter === 'all' && (
        <div className="relative overflow-hidden rounded-2xl border border-volt/20"
          style={{ background: 'linear-gradient(135deg, rgba(184,241,53,0.06) 0%, rgba(47,128,237,0.08) 100%)' }}>
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 text-[10px] font-bold text-volt bg-volt/15 border border-volt/25 px-2 py-0.5 rounded-full">
              <Zap size={9} fill="currentColor" /> Top Match
            </span>
          </div>
          <div className="p-5 pt-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                <img src={featured.logo} alt={featured.club} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base font-bold text-white">{featured.title}</h3>
                      {featured.verified && <ShieldCheck size={14} className="text-emerald flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted">{featured.club}</p>
                  </div>
                  <MatchRing pct={featured.aiMatch} />
                </div>
                <p className="text-sm text-slate-300/80 mt-2 leading-relaxed">{featured.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {featured.location}</span>
                  <span className="flex items-center gap-1"><Briefcase size={11} /> {featured.position}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {featured.deadline}</span>
                  {featured.salary !== 'TBD' && <span className="text-emerald font-medium">{featured.salary}</span>}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => setApplied(s => new Set([...s, featured.id]))}
                    disabled={applied.has(featured.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      applied.has(featured.id)
                        ? 'bg-emerald/15 border border-emerald/30 text-emerald cursor-default'
                        : 'bg-volt text-ink hover:bg-volt/90'
                    }`}>
                    {applied.has(featured.id) ? <><CheckCircle size={14} /> Applied</> : <>Apply Now <ArrowRight size={14} /></>}
                  </button>
                  <button onClick={() => setSaved(s => { const n = new Set(s); saved.has(featured.id) ? n.delete(featured.id) : n.add(featured.id); return n; })}
                    className={`p-2.5 rounded-xl border transition-all ${saved.has(featured.id) ? 'border-azure/30 text-azure bg-azure/10' : 'border-white/10 text-muted hover:border-white/25 hover:text-white'}`}>
                    {saved.has(featured.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards list */}
      <div className="space-y-3">
        {(filter === 'all' ? rest : filtered).map(opp => {
          const meta = metaFor(opp.type);
          return (
            <div key={opp.id}
              className="card-dark hover:border-white/10 transition-all p-5 rounded-2xl"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-start gap-4">
                {/* Club logo */}
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 border border-white/[0.08] flex-shrink-0">
                  <img src={opp.logo} alt={opp.club} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-white truncate">{opp.title}</h3>
                        {opp.verified && <ShieldCheck size={12} className="text-emerald flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted">{opp.club}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                      <MatchRing pct={opp.aiMatch} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{opp.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-3">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {opp.location}</span>
                    <span className="flex items-center gap-1"><Briefcase size={10} /> {opp.position}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {opp.deadline}</span>
                    {opp.salary && opp.salary !== 'TBD' && <span className="text-emerald font-medium">{opp.salary}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {opp.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.05]">
                <button onClick={() => setApplied(s => new Set([...s, opp.id]))}
                  disabled={applied.has(opp.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    applied.has(opp.id)
                      ? 'bg-emerald/10 border border-emerald/20 text-emerald cursor-default'
                      : 'btn-primary'
                  }`}>
                  {applied.has(opp.id) ? <><CheckCircle size={13} /> Applied</> : <>Apply Now <ArrowRight size={13} /></>}
                </button>
                <button onClick={() => setSaved(s => { const n = new Set(s); saved.has(opp.id) ? n.delete(opp.id) : n.add(opp.id); return n; })}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    saved.has(opp.id) ? 'border-azure/30 text-azure bg-azure/5' : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                  }`}>
                  {saved.has(opp.id) ? <><BookmarkCheck size={13} /> Saved</> : <><Bookmark size={13} /> Save</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="text-azure animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-muted" />
          </div>
          <p className="text-base font-semibold text-white mb-1">No opportunities found</p>
          <p className="text-sm text-muted">Try a different filter or check back soon</p>
        </div>
      )}
    </div>
  );
}

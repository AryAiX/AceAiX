import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listOpportunities } from '../../api/opportunities';
import { listScouts } from '../../api/network';
import { useMyAthlete } from '../../hooks/useAthlete';

interface TrendingTag { tag: string; count: number }

// Deferred: trending tags remain static until tag analytics (athlete_media.ai_tags) are aggregated.
const TRENDING_TAGS: TrendingTag[] = [
  { tag: 'UAEFootball', count: 234 },
  { tag: 'GulfTalent',  count: 189 },
  { tag: 'UAEFA',       count: 156 },
  { tag: 'Scouting',    count: 98  },
];

const SCOUT_COLORS = ['#2F80ED', '#1FB57A', '#F5A623'];

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '?').trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/* Simple fade-in-up wrapper using IntersectionObserver */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref   = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 0.45s ease ${delay}s, transform 0.45s cubic-bezier(0.19,1,0.22,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Sub-cards ──────────────────────────────────────────── */

function OpportunitiesCard() {
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities', { limit: 3 }],
    queryFn: () => listOpportunities({ limit: 3 }),
  });
  return (
    <Reveal delay={0.05}>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Opportunities for you</h3>
          <Link to="/athlete/opportunities" className="text-xs text-azure font-medium hover:underline">See all</Link>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-xl border border-rim animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <p className="text-xs text-white/50 py-4 text-center">No opportunities yet</p>
        ) : (
          <div className="space-y-3">
            {opportunities.map(opp => (
              <div key={opp.id} className="p-3 border border-rim rounded-xl hover:border-azure/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{opp.title}</p>
                    <p className="text-xs text-white/50">{opp.organization?.name ?? opp.location ?? 'AceAiX'}</p>
                  </div>
                  {opp.type && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-azure/10 rounded text-[10px] font-semibold text-azure whitespace-nowrap capitalize">
                      {opp.type}
                    </span>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setApplied(p => ({ ...p, [opp.id]: !p[opp.id] }))}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{
                      background: applied[opp.id] ? '#1FB57A' : '#2F80ED',
                      color: '#fff',
                    }}
                  >
                    {applied[opp.id] ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

function AICareerCoachCard() {
  return (
    <Reveal delay={0.1}>
      <div className="card p-4" style={{ borderLeft: '4px solid #2F80ED' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-azure/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-azure" />
          </div>
          <h3 className="text-sm font-semibold text-ink">AI Career Coach</h3>
        </div>
        <p className="text-sm text-white/50 mb-4 leading-relaxed">
          Based on your last 5 matches, we recommend focusing on your weak-foot finishing. Sprint speed +12% this month.
        </p>
        <Link
          to="/athlete/ai"
          className="block w-full text-center px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all hover:brightness-110"
          style={{ background: '#2F80ED' }}
        >
          Get Coaching Plan
        </Link>
      </div>
    </Reveal>
  );
}

function ScoutsCard() {
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const { data: scouts = [], isLoading } = useQuery({
    queryKey: ['scouts', { limit: 3 }],
    queryFn: () => listScouts(3),
  });
  return (
    <Reveal delay={0.15}>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Scouts &amp; Clubs</h3>
          <Link to="/athlete/network" className="text-xs text-azure font-medium hover:underline">See all</Link>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : scouts.length === 0 ? (
          <p className="text-xs text-white/50 py-4 text-center">No scouts to suggest yet</p>
        ) : (
          <div className="space-y-3">
            {scouts.map((scout, i) => (
              <div key={scout.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                  style={{ background: SCOUT_COLORS[i % SCOUT_COLORS.length] }}
                >
                  {scout.avatar_url
                    ? <img src={scout.avatar_url} alt={scout.full_name ?? ''} className="w-full h-full object-cover" />
                    : initialsOf(scout.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{scout.full_name ?? 'Scout'}</p>
                  <p className="text-xs text-white/50 truncate capitalize">{scout.role?.replace('_', ' ')}{scout.city ? ` · ${scout.city}` : ''}</p>
                </div>
                <button
                  onClick={() => setFollowed(p => ({ ...p, [scout.id]: !p[scout.id] }))}
                  className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium border transition-all"
                  style={
                    followed[scout.id]
                      ? { background: 'rgba(47,128,237,0.10)', color: '#2F80ED', border: '1px solid rgba(47,128,237,0.25)' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.15)' }
                  }
                >
                  {followed[scout.id] ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

function TrendingCard() {
  return (
    <Reveal delay={0.2}>
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-azure" />
          <h3 className="text-sm font-semibold text-ink">Trending</h3>
        </div>
        <div className="space-y-1">
          {TRENDING_TAGS.map(item => (
            <Link
              key={item.tag}
              to={`/discover?tag=${item.tag}`}
              className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group"
            >
              <span className="text-sm font-medium text-ink group-hover:text-azure transition-colors">#{item.tag}</span>
              <span className="text-xs text-white/40">{item.count.toLocaleString()} posts</span>
            </Link>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function ProfileCompletionCard() {
  const { data: athlete } = useMyAthlete();
  const profileStrength = athlete?.profile_completeness ?? 0;
  const [barWidth, setBarWidth] = useState(0);

  const checklist = [
    { label: 'Add your sport & position', done: !!(athlete?.position_primary ?? athlete?.position) },
    { label: 'Add a cover photo',          done: !!athlete?.cover_url },
    { label: 'Write your bio',             done: !!athlete?.bio },
    { label: 'Set yourself open to offers', done: !!athlete?.is_open_to_offers },
  ];

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(profileStrength), 300);
    return () => clearTimeout(t);
  }, [profileStrength]);

  if (!athlete || profileStrength >= 100) return null;
  return (
    <Reveal delay={0.25}>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Complete your profile</h3>
          <span className="text-xs font-bold text-white/50">{profileStrength}%</span>
        </div>
        <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${barWidth}%`,
              background: '#B8F135',
              transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
            }}
          />
        </div>
        <div className="space-y-2.5">
          {checklist.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <CheckCircle2 size={14} className={`flex-shrink-0 ${item.done ? 'text-emerald' : 'text-white/20'}`} />
              <span className={`text-sm ${item.done ? 'line-through text-white/30' : 'text-white/50'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export default function FeedRightRail() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity   = '0';
    el.style.transform = 'translateX(16px)';
    el.style.transition = 'opacity 0.5s ease 0.1s, transform 0.5s cubic-bezier(0.19,1,0.22,1) 0.1s';
    const id = requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateX(0)';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={ref} className="sticky top-[72px] space-y-3">
      <OpportunitiesCard />
      <AICareerCoachCard />
      <ScoutsCard />
      <TrendingCard />
      <ProfileCompletionCard />
    </div>
  );
}

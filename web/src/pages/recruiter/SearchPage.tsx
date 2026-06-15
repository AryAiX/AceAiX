import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, ShieldCheck, Plus, Star,
  MessageSquare, Eye, Zap, X, ChevronDown, LayoutGrid,
  List, Flame, MapPin, Loader2,
} from 'lucide-react';
import { listAthletes } from '../../api/athletes';
import type { AthleteProfile, UserProfile } from '../../types';

/* ── card view model (mapped from athlete_profiles + user) ──── */
interface CardAthlete {
  id: string;
  name: string;
  sport: string;
  position: string;
  club: string;
  nationality: string;
  age: number | null;
  level: string;
  score: number;
  goals: number;
  assists: number;
  matches: number;
  verified: boolean;
  hot: boolean;
  match: number;
  image: string;
}

function ageFromBirth(birth: string | null): number | null {
  if (!birth) return null;
  const diff = Date.now() - new Date(birth).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function toCard(a: AthleteProfile & { user?: UserProfile }): CardAthlete {
  const stats = (a.highlighted_stats ?? {}) as Record<string, number>;
  const score = Math.round((a.visibility_score ?? 0) / 10 * 10) / 10;
  return {
    id: a.id,
    name: a.user?.full_name ?? 'Unnamed athlete',
    sport: a.sport ?? 'Football',
    position: a.position ?? a.position_primary ?? '—',
    club: a.current_club ?? 'Free agent',
    nationality: a.nationality ?? a.user?.country ?? '',
    age: ageFromBirth(a.birth_date),
    level: a.level ?? 'amateur',
    score,
    goals: Number(stats.goals ?? 0),
    assists: Number(stats.assists ?? 0),
    matches: Number(stats.matches ?? stats.appearances ?? 0),
    verified: a.user?.is_verified ?? false,
    hot: (a.visibility_score ?? 0) >= 90 || a.is_open_to_offers,
    match: Math.min(99, Math.round(a.visibility_score ?? 0)),
    image: a.user?.avatar_url ?? '',
  };
}

const SPORTS     = ['All', 'Football', 'Basketball', 'Athletics', 'Swimming', 'Tennis'];
const POSITIONS  = ['All', 'Striker', 'Midfielder', 'Defender', 'Goalkeeper', 'Winger', 'Center-Back', 'Sprinter'];
const LEVELS     = ['All', 'amateur', 'semi-pro', 'professional', 'elite'];
const AGE_RANGES = ['All', 'Under 21', '21–25', '26–30', 'Over 30'];

const LEVEL_COLOR: Record<string, string> = {
  amateur: '#9DB0C6', 'semi-pro': '#2F80ED', professional: '#1FB57A', elite: '#B8F135',
};

const AI_SUGGESTIONS = [
  'Left-footed striker under 23 from UAE',
  'Verified midfielder with 10+ assists this season',
  'Professional goalkeeper under 26',
];

function scoreColor(s: number) {
  if (s >= 9)   return '#B8F135';
  if (s >= 8.5) return '#1FB57A';
  return '#2F80ED';
}

/* ── animated score ring ──────────────────────────────────── */
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  const color = scoreColor(score);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 10) * circ), 300);
    return () => clearTimeout(t);
  }, [score, circ]);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={3} stroke="rgba(255,255,255,0.08)" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={3}
        stroke={color} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle"
        style={{ fill: color, fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

/* ── animated bar ─────────────────────────────────────────── */
function MatchBar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 400); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: color, boxShadow: `0 0 6px ${color}60`, transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </div>
  );
}

/* ── grid card ────────────────────────────────────────────── */
function GridCard({ a, idx, watchlisted, onWatchlist }:
  { a: CardAthlete; idx: number; watchlisted: boolean; onWatchlist: () => void }) {
  const [vis, setVis] = useState(false);
  const [hov, setHov] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 60 + idx * 70); return () => clearTimeout(t); }, [idx]);
  const mc = a.match >= 95 ? '#B8F135' : a.match >= 90 ? '#1FB57A' : '#2F80ED';
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(22,39,59,0.92)',
        border: `1px solid ${hov ? 'rgba(47,128,237,0.35)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hov ? '0 16px 48px rgba(0,0,0,0.50)' : '0 2px 12px rgba(0,0,0,0.30)',
        opacity: vis ? 1 : 0,
        transform: vis ? `translateY(${hov ? '-4px' : '0px'})` : 'translateY(14px)',
        transition: 'opacity 0.4s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.2s',
      }}>
      {/* photo */}
      <div className="relative h-40 overflow-hidden">
        <img src={a.image} alt={a.name} className="w-full h-full object-cover object-top"
          style={{ transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.5s ease' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,transparent 28%,rgba(14,28,48,0.97))' }} />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {a.verified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: 'rgba(31,181,122,0.90)', color: '#fff', backdropFilter: 'blur(4px)' }}>
              <ShieldCheck size={8} /> Verified
            </span>
          )}
          {a.hot && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: 'rgba(245,166,35,0.90)', color: '#0C1A2B', backdropFilter: 'blur(4px)' }}>
              <Flame size={8} /> Hot
            </span>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-xl text-[10px] font-bold"
          style={{ background: 'rgba(14,28,48,0.82)', color: mc, border: `1px solid ${mc}30`, backdropFilter: 'blur(6px)' }}>
          {a.match}% match
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-sm font-bold text-white leading-tight">{a.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={9} className="text-white/35" />
            <p className="text-[10px] text-white/40">{a.position} · {a.club}</p>
          </div>
        </div>
      </div>
      {/* body */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <ScoreRing score={a.score} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                style={{ background: `${LEVEL_COLOR[a.level]}14`, color: LEVEL_COLOR[a.level], border: `1px solid ${LEVEL_COLOR[a.level]}28` }}>
                {a.level}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.09)' }}>
                {a.sport}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Age {a.age ?? '—'}
              </span>
            </div>
            <div className="mt-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-white/25 font-medium">AI MATCH</span>
                <span className="text-[10px] font-bold" style={{ color: mc }}>{a.match}%</span>
              </div>
              <MatchBar pct={a.match} color={mc} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 py-3 mb-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[{ v: a.goals, l: 'Goals', c: '#1FB57A' }, { v: a.assists, l: 'Assists', c: '#2F80ED' }, { v: a.matches, l: 'Matches', c: '#F5A623' }].map(x => (
            <div key={x.l} className="text-center">
              <p className="text-base font-bold tabular" style={{ color: x.c }}>{x.v}</p>
              <p className="text-[9px] text-white/28 mt-0.5">{x.l}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.09)'; el.style.color = '#fff'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.05)'; el.style.color = 'rgba(255,255,255,0.60)'; }}>
            <Eye size={11} /> View
          </button>
          <button onClick={onWatchlist}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.94]"
            style={{
              background: watchlisted ? 'rgba(245,166,35,0.15)' : 'rgba(47,128,237,0.12)',
              border: `1px solid ${watchlisted ? 'rgba(245,166,35,0.38)' : 'rgba(47,128,237,0.32)'}`,
              color: watchlisted ? '#F5A623' : '#2F80ED',
            }}>
            {watchlisted ? <Star size={11} fill="currentColor" /> : <Plus size={11} />}
            {watchlisted ? 'Saved' : 'Watchlist'}
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-all active:scale-[0.94]"
            style={{ background: 'rgba(31,181,122,0.10)', border: '1px solid rgba(31,181,122,0.25)', color: '#1FB57A' }}>
            <MessageSquare size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── list row ─────────────────────────────────────────────── */
function ListRow({ a, idx, watchlisted, onWatchlist }:
  { a: CardAthlete; idx: number; watchlisted: boolean; onWatchlist: () => void }) {
  const [vis, setVis] = useState(false);
  const [hov, setHov] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 40 + idx * 55); return () => clearTimeout(t); }, [idx]);
  const mc = a.match >= 95 ? '#B8F135' : a.match >= 90 ? '#1FB57A' : '#2F80ED';
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer"
      style={{
        background: hov ? 'rgba(22,39,59,0.98)' : 'rgba(22,39,59,0.90)',
        border: `1px solid ${hov ? 'rgba(47,128,237,0.30)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov ? '0 6px 28px rgba(0,0,0,0.40)' : 'none',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateX(0)' : 'translateX(-16px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease, border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}>
      <div className="relative flex-shrink-0">
        <img src={a.image} alt={a.name} className="w-12 h-12 rounded-xl object-cover object-top"
          style={{ border: '1.5px solid rgba(255,255,255,0.10)' }} />
        {a.verified && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: '#1FB57A', boxShadow: '0 0 6px rgba(31,181,122,0.55)' }}>
            <ShieldCheck size={9} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-white truncate">{a.name}</p>
          {a.hot && <Flame size={11} style={{ color: '#F5A623', flexShrink: 0 }} />}
        </div>
        <p className="text-[11px] text-white/38">{a.position} · {a.club} · {a.nationality}</p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="hidden sm:flex gap-4">
          {[{ v: a.goals, l: 'G', c: '#1FB57A' }, { v: a.assists, l: 'A', c: '#2F80ED' }].map(x => (
            <div key={x.l} className="text-center w-7">
              <p className="text-sm font-bold tabular" style={{ color: x.c }}>{x.v}</p>
              <p className="text-[9px] text-white/28">{x.l}</p>
            </div>
          ))}
        </div>
        <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
          style={{ background: `${LEVEL_COLOR[a.level]}14`, color: LEVEL_COLOR[a.level] }}>
          {a.level}
        </span>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-white/28 mb-0.5">Match</p>
          <p className="text-sm font-bold tabular" style={{ color: mc }}>{a.match}%</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-display font-bold tabular" style={{ color: scoreColor(a.score) }}>{a.score}</p>
          <p className="text-[9px] text-white/25">score</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onWatchlist}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-[0.90]"
            style={{ background: watchlisted ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${watchlisted ? 'rgba(245,166,35,0.38)' : 'rgba(255,255,255,0.10)'}`, color: watchlisted ? '#F5A623' : 'rgba(255,255,255,0.40)' }}>
            <Star size={12} fill={watchlisted ? 'currentColor' : 'none'} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-[0.90]"
            style={{ background: 'rgba(31,181,122,0.10)', border: '1px solid rgba(31,181,122,0.22)', color: '#1FB57A' }}>
            <MessageSquare size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── filter select ────────────────────────────────────────── */
function FilterSelect({ label, value, options, onChange, color = '#2F80ED' }:
  { label: string; value: string; options: string[]; onChange: (v: string) => void; color?: string }) {
  const active = value !== 'All';
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
        style={{ color: active ? color : 'rgba(255,255,255,0.28)' }}>
        {label}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none pr-7 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none transition-all capitalize"
          style={{
            background: active ? `${color}10` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active ? color + '35' : 'rgba(255,255,255,0.09)'}`,
            color: active ? color : 'rgba(255,255,255,0.50)',
            boxShadow: active ? `0 0 14px ${color}12` : 'none',
          }}>
          {options.map(o => <option key={o} value={o} className="bg-[#16273B] text-white capitalize">{o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: active ? color : 'rgba(255,255,255,0.28)' }} />
      </div>
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────── */
export default function SearchPage() {
  const [query,        setQuery]        = useState('');
  const [sport,        setSport]        = useState('All');
  const [position,     setPosition]     = useState('All');
  const [level,        setLevel]        = useState('All');
  const [ageRange,     setAgeRange]     = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [aiQuery,      setAiQuery]      = useState('');
  const [aiDone,       setAiDone]       = useState(false);
  const [aiTyping,     setAiTyping]     = useState(false);
  const [view,         setView]         = useState<'grid' | 'list'>('grid');
  const [watchlisted,  setWatchlisted]  = useState<Set<string>>(new Set());
  const [filtersOpen,  setFiltersOpen]  = useState(true);
  const [mounted,      setMounted]      = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['recruiter-athletes', sport, level, query],
    queryFn: () => listAthletes({
      sport: sport !== 'All' ? sport : undefined,
      level: level !== 'All' ? level : undefined,
      q: query.trim() || undefined,
    }),
  });

  const athletes = useMemo(() => rows.map(toCard), [rows]);

  const filtered = athletes.filter(a => {
    if (position !== 'All' && a.position !== position) return false;
    if (verifiedOnly && !a.verified) return false;
    if (ageRange !== 'All') {
      if (a.age == null) return false;
      if (ageRange === 'Under 21' && a.age >= 21)               return false;
      if (ageRange === '21–25'    && (a.age < 21 || a.age > 25)) return false;
      if (ageRange === '26–30'    && (a.age < 26 || a.age > 30)) return false;
      if (ageRange === 'Over 30'  && a.age <= 30)               return false;
    }
    return true;
  });

  const verifiedCount = athletes.filter(a => a.verified).length;

  const activeFilters = [sport !== 'All', position !== 'All', level !== 'All', ageRange !== 'All', verifiedOnly].filter(Boolean).length;

  function clearFilters() {
    setSport('All'); setPosition('All'); setLevel('All');
    setAgeRange('All'); setVerifiedOnly(false); setQuery('');
  }

  function handleAiSearch() {
    if (!aiQuery.trim()) return;
    setAiDone(false);
    setAiTyping(true);
    setTimeout(() => { setAiTyping(false); setAiDone(true); }, 1300);
  }

  function toggleWatchlist(id: string) {
    setWatchlisted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-7xl space-y-5 pb-10">

      {/* HEADER */}
      <div className="relative rounded-3xl overflow-hidden px-6 sm:px-8 py-6"
        style={{
          background: 'linear-gradient(135deg,#0B1728 0%,#0F1E2E 60%,#0B1A22 100%)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-14px)',
          transition: 'opacity 0.5s ease, transform 0.55s cubic-bezier(0.19,1,0.22,1)',
        }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(47,128,237,0.18) 0%,transparent 65%)' }} />
        <div className="absolute -bottom-10 left-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(31,181,122,0.09) 0%,transparent 65%)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Search Athletes</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(184,241,53,0.12)', border: '1px solid rgba(184,241,53,0.28)', color: '#B8F135' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#B8F135' }} />
                {filtered.length} Live
              </span>
            </div>
            <p className="text-white/40 text-sm">Advanced talent discovery powered by AI</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-display font-bold text-white tabular">{athletes.length}</p>
              <p className="text-[11px] text-white/35">Athletes indexed</p>
            </div>
            <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(255,255,255,0.10)' }} />
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-display font-bold" style={{ color: '#B8F135' }}>
                {verifiedCount}
              </p>
              <p className="text-[11px] text-white/35">Verified</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(47,128,237,0.55) 35%,rgba(184,241,53,0.38) 65%,transparent)' }} />
      </div>

      {/* AI SEARCH */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,rgba(47,128,237,0.07),rgba(22,39,59,0.95))', border: '1px solid rgba(47,128,237,0.22)', animation: 'slideUp 0.45s ease 0.1s both' }}>
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(47,128,237,0.15)', border: '1px solid rgba(47,128,237,0.30)' }}>
              <Zap size={14} style={{ color: '#2F80ED' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AI Talent Discovery</p>
              <p className="text-[11px] text-white/35">Describe your ideal player in natural language</p>
            </div>
            <span className="ml-auto px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.28)', color: '#2F80ED' }}>
              Natural Language
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {AI_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => { setAiQuery(s); setAiDone(false); }}
                className="text-[11px] px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(47,128,237,0.10)'; el.style.borderColor = 'rgba(47,128,237,0.28)'; el.style.color = '#2F80ED'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.04)'; el.style.borderColor = 'rgba(255,255,255,0.09)'; el.style.color = 'rgba(255,255,255,0.40)'; }}>
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={aiQuery}
                onChange={e => { setAiQuery(e.target.value); setAiDone(false); }}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                placeholder='e.g. "Left-footed striker under 23 from UAE with 15+ goals…"'
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }}
              />
            </div>
            <button onClick={handleAiSearch}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold flex-shrink-0 transition-all active:scale-[0.97]"
              style={{ background: '#2F80ED', color: '#fff', boxShadow: '0 4px 18px rgba(47,128,237,0.42)' }}>
              <Search size={14} /> Search
            </button>
          </div>

          {aiTyping && (
            <div className="mt-3 flex items-center gap-2 text-xs text-white/35">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#2F80ED', animation: `pulse ${0.8 + i * 0.15}s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
              Analyzing query…
            </div>
          )}
          {aiDone && !aiTyping && aiQuery && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: '#1FB57A', animation: 'slideUp 0.3s ease both' }}>
              <ShieldCheck size={12} />
              AI found {filtered.length} matching athletes for your criteria
            </div>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(22,39,59,0.92)', border: '1px solid rgba(255,255,255,0.08)', animation: 'slideUp 0.45s ease 0.18s both' }}>
        <button onClick={() => setFiltersOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.26)' }}>
              <SlidersHorizontal size={12} style={{ color: '#F5A623' }} />
            </div>
            <span className="text-sm font-bold text-white">Filters</span>
            {activeFilters > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: '#F5A623', color: '#0C1A2B' }}>
                {activeFilters}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeFilters > 0 && (
              <button onClick={e => { e.stopPropagation(); clearFilters(); }}
                className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg"
                style={{ color: '#EF5350', background: 'rgba(239,83,80,0.09)', border: '1px solid rgba(239,83,80,0.22)' }}>
                <X size={10} /> Clear all
              </button>
            )}
            <ChevronDown size={14}
              style={{ color: 'rgba(255,255,255,0.30)', transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }} />
          </div>
        </button>

        <div style={{
          maxHeight: filtersOpen ? '320px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-white/28">Search</label>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/28" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or position…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#fff' }} />
                </div>
              </div>
              <FilterSelect label="Sport"    value={sport}    options={SPORTS}     onChange={setSport}    color="#2F80ED" />
              <FilterSelect label="Position" value={position} options={POSITIONS}  onChange={setPosition} color="#1FB57A" />
              <FilterSelect label="Level"    value={level}    options={LEVELS}     onChange={setLevel}    color="#F5A623" />
              <FilterSelect label="Age"      value={ageRange} options={AGE_RANGES} onChange={setAgeRange} color="#B8F135" />
            </div>
            <div className="mt-4">
              <button onClick={() => setVerifiedOnly(v => !v)}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: verifiedOnly ? 'rgba(31,181,122,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${verifiedOnly ? 'rgba(31,181,122,0.35)' : 'rgba(255,255,255,0.09)'}`,
                  color: verifiedOnly ? '#1FB57A' : 'rgba(255,255,255,0.45)',
                }}>
                <div className="w-8 h-4 rounded-full flex items-center transition-all px-0.5"
                  style={{ background: verifiedOnly ? 'rgba(31,181,122,0.40)' : 'rgba(255,255,255,0.10)', justifyContent: verifiedOnly ? 'flex-end' : 'flex-start' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: verifiedOnly ? '#1FB57A' : 'rgba(255,255,255,0.40)', transition: 'background 0.2s' }} />
                </div>
                <ShieldCheck size={11} /> Verified only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS HEADER */}
      <div className="flex items-center justify-between" style={{ animation: 'slideUp 0.4s ease 0.25s both' }}>
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-white tabular">
            <span style={{ color: '#2F80ED' }}>{filtered.length}</span>
            <span className="text-white/40"> of {athletes.length} athletes</span>
          </p>
          {activeFilters > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,166,35,0.10)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.22)' }}>
              {activeFilters} filter{activeFilters > 1 ? 's' : ''} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {([['grid', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className="w-8 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ background: view === v ? 'rgba(47,128,237,0.22)' : 'transparent', color: view === v ? '#2F80ED' : 'rgba(255,255,255,0.28)' }}>
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* RESULTS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={26} className="animate-spin" style={{ color: '#2F80ED' }} />
          <p className="text-white/40 text-sm">Loading athletes…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ animation: 'slideUp 0.4s ease both' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={24} style={{ color: 'rgba(255,255,255,0.22)' }} />
          </div>
          <p className="text-white/40 text-sm">No athletes match your filters</p>
          <button onClick={clearFilters}
            className="text-xs px-4 py-2 rounded-xl transition-all"
            style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.28)', color: '#2F80ED' }}>
            Clear filters
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a, i) => (
            <GridCard key={a.id} a={a} idx={i}
              watchlisted={watchlisted.has(a.id)}
              onWatchlist={() => toggleWatchlist(a.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a, i) => (
            <ListRow key={a.id} a={a} idx={i}
              watchlisted={watchlisted.has(a.id)}
              onWatchlist={() => toggleWatchlist(a.id)} />
          ))}
        </div>
      )}

    </div>
  );
}

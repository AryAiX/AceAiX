import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, Bot, Eye, ArrowRight, Flame, Trophy,
  MapPin, Calendar, Send, Activity, Zap, ChevronRight,
  Clock, Target,
} from 'lucide-react';
import ScoreRing from '../../components/ui/ScoreRing';
import StatTile from '../../components/ui/StatTile';
import StatusChip from '../../components/ui/StatusChip';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import { useAuth } from '../../context/AuthContext';
import { useMyAthlete } from '../../hooks/useAthlete';
import { listMatches, listMedia } from '../../api/portfolio';
import { listProfileViews, profileViewCount } from '../../api/analytics';
import { listOpportunities } from '../../api/opportunities';
import { latestClearance, listMedicalRecords } from '../../api/medical';
import { listEndorsements } from '../../api/network';
import type { AttributeData, TrajectoryPoint, MatchRecord } from '../../types';

const FALLBACK_ATTRS: AttributeData[] = [
  { label: 'Pace', value: 0, endorsements: 0, topEndorser: '', topEndorserVerified: false },
];

function resultLetter(result: string | null): 'W' | 'D' | 'L' {
  if (!result) return 'D';
  if (result.includes('W')) return 'W';
  if (result.includes('L')) return 'L';
  return 'D';
}
function matchRating(m: MatchRecord): number {
  const r = (m.stats as { rating?: number })?.rating;
  return typeof r === 'number' ? r : 7;
}

function RadarChart({ attrs }: { attrs: AttributeData[] }) {
  const data = attrs.length ? attrs.slice(0, 6) : FALLBACK_ATTRS;
  const cx = 90, cy = 90, r = 65;
  const n = data.length;
  const pts = data.map((d, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    const v = (d.value / 100) * r;
    return {
      x: cx + v * Math.cos(a), y: cy + v * Math.sin(a),
      lx: cx + (r + 22) * Math.cos(a), ly: cy + (r + 22) * Math.sin(a),
      label: d.label, value: d.value,
    };
  });
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {[0.25, 0.5, 0.75, 1].map(lvl => {
        const gpts = data.map((_, i) => {
          const a = (i / n) * 2 * Math.PI - Math.PI / 2;
          return `${cx + lvl * r * Math.cos(a)},${cy + lvl * r * Math.sin(a)}`;
        }).join(' ');
        return <polygon key={lvl} points={gpts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      {data.map((_, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      <defs>
        <linearGradient id="radarFillL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2F80ED" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#B8F135" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <polygon points={polyPts} fill="url(#radarFillL)" stroke="#2F80ED" strokeWidth="1.5" />
      {pts.map(p => <circle key={p.label} cx={p.x} cy={p.y} r="3" fill="#2F80ED" opacity="0.9" />)}
      {pts.map(p => (
        <text key={p.label} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
          fontSize="7.5" fill="#7C8DA6" fontFamily="Inter, sans-serif">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function LineChart({ trajectory }: { trajectory: TrajectoryPoint[] }) {
  const data = trajectory.length
    ? trajectory.map(t => ({ year: t.season.slice(-2), score: t.score ?? t.forecast ?? 0, forecast: t.forecast != null }))
    : [{ year: '—', score: 0, forecast: false }];
  const W = 260, H = 100, padX = 20, padY = 14;
  const vals = data.map(d => d.score);
  const minS = Math.min(...vals) - 0.5, maxS = Math.max(...vals) + 0.5;
  const span = maxS - minS || 1;
  const pts = data.map((d, i) => ({
    x: padX + (i / Math.max(1, data.length - 1)) * (W - padX * 2),
    y: H - padY - ((d.score - minS) / span) * (H - padY * 2),
    year: d.year, forecast: d.forecast,
  }));
  const firstForecast = pts.findIndex(p => p.forecast);
  const splitIdx = firstForecast === -1 ? pts.length : firstForecast;
  const solidPts = pts.slice(0, Math.max(1, splitIdx));
  const dashPts = pts.slice(Math.max(0, splitIdx - 1));
  const solidPath = solidPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const dPath = dashPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${solidPath} L${solidPts[solidPts.length - 1].x},${H - padY} L${solidPts[0].x},${H - padY} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="areaFillL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F80ED" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaFillL)" />
      <path d={solidPath} fill="none" stroke="#2F80ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={dPath} fill="none" stroke="#B8F135" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3.5" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={p.forecast ? '#B8F135' : '#2F80ED'} />)}
      {pts.map(p => (
        <text key={p.year} x={p.x} y={H - 2} textAnchor="middle" fontSize="6.5" fill="#7C8DA6" fontFamily="Inter, sans-serif">'{p.year}</text>
      ))}
    </svg>
  );
}

function FormDot({ result }: { result: string }) {
  const cls = result === 'W'
    ? 'bg-emerald/15 text-emerald border-emerald/30'
    : result === 'L'
    ? 'bg-coral/15 text-coral border-coral/30'
    : 'bg-amber/15 text-amber border-amber/30';
  return <span className={`w-7 h-7 rounded-full border text-[10px] font-bold flex items-center justify-center ${cls}`}>{result}</span>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export default function AthleteDashboard() {
  const { profile } = useAuth();
  const { data: athlete } = useMyAthlete();
  const athleteId = athlete?.id;
  const [aiInput, setAiInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Athlete';

  const matchesQuery = useQuery({ queryKey: ['matches', athleteId], queryFn: () => listMatches(athleteId!, 5), enabled: !!athleteId });
  const viewsQuery = useQuery({ queryKey: ['views', athleteId], queryFn: () => listProfileViews(athleteId!, 4), enabled: !!athleteId });
  const viewTotalQuery = useQuery({ queryKey: ['view-count', athleteId], queryFn: () => profileViewCount(athleteId!), enabled: !!athleteId });
  const opportunitiesQuery = useQuery({ queryKey: ['opps-dash'], queryFn: () => listOpportunities({ limit: 3 }) });
  const clearanceQuery = useQuery({ queryKey: ['clearance', athleteId], queryFn: () => latestClearance(athleteId!), enabled: !!athleteId });
  const medRecordsQuery = useQuery({ queryKey: ['med-records', athleteId], queryFn: () => listMedicalRecords(athleteId!), enabled: !!athleteId });
  const endorsementsQuery = useQuery({ queryKey: ['endorsements', athleteId], queryFn: () => listEndorsements(athleteId!), enabled: !!athleteId });
  const mediaQuery = useQuery({ queryKey: ['media', athleteId], queryFn: () => listMedia(athleteId!), enabled: !!athleteId });

  const matches = matchesQuery.data ?? [];
  const views = viewsQuery.data ?? [];
  const viewTotal = viewTotalQuery.data ?? 0;
  const opportunities = opportunitiesQuery.data ?? [];
  const clearance = clearanceQuery.data;
  const medRecords = medRecordsQuery.data ?? [];
  const endorsements = endorsementsQuery.data ?? [];
  const media = mediaQuery.data ?? [];
  const athleteDataReady = [
    matchesQuery,
    viewsQuery,
    viewTotalQuery,
    clearanceQuery,
    medRecordsQuery,
    endorsementsQuery,
    mediaQuery,
  ].every((q) => !q.isLoading && !q.isFetching);

  useEffect(() => {
    if (!profile || !athlete || !athleteDataReady || messages.length) return;
    const nextSteps = [
      !matches.length && 'add verified match records',
      !media.length && 'upload highlight clips',
      !clearance && 'request a medical clearance',
      endorsements.length < 2 && 'collect endorsements',
    ].filter(Boolean);
    const text = nextSteps.length
      ? `Welcome, ${firstName}. Your dashboard is using your live profile data. Next, ${nextSteps.join(', ')} to improve your profile strength.`
      : `Welcome back, ${firstName}. I can help you interpret your verified performance, media, medical, and network data.`;
    setMessages([{ role: 'assistant', text }]);
  }, [athlete, athleteDataReady, clearance, endorsements.length, firstName, matches.length, media.length, messages.length, profile]);

  function handleSendMessage() {
    const text = aiInput.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', text }, { role: 'assistant', text: "Analyzing your performance data now… I'll have a detailed answer shortly." }]);
    setAiInput('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  const sport = athlete?.sport ?? 'Football';
  const position = athlete?.position ?? athlete?.position_primary ?? 'Position not set';
  const club = athlete?.current_club ?? 'Club not set';
  const level = athlete?.level ?? 'Level not set';
  const attrs = (athlete?.attributes ?? []) as AttributeData[];
  const trajectory = (athlete?.trajectory ?? []) as TrajectoryPoint[];
  const completePct = athlete?.profile_completeness ?? 0;
  const visibility = (athlete?.visibility_score ?? 0) / 10;
  const performance = (athlete?.performance_score ?? 0) / 10;

  const form = matches.map(m => ({ match: `vs. ${m.opponent ?? 'TBD'}`, result: resultLetter(m.result), score: matchRating(m).toFixed(1), goals: m.goals, assists: m.assists }));
  const avgRating = matches.length ? (matches.reduce((s, m) => s + matchRating(m), 0) / matches.length).toFixed(1) : '—';

  const checklist = [
    { label: 'Complete profile info', done: completePct >= 60 },
    { label: 'Upload highlight clips', done: media.length > 0 },
    { label: 'Medical verification', done: clearance?.status === 'cleared' },
    { label: 'Add 3 match records', done: matches.length >= 3 },
    { label: 'Get 2 endorsements', done: endorsements.length >= 2 },
  ];

  return (
    <div className="max-w-7xl space-y-6 animate-in pb-8">
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0C1A2B 0%, #16273B 40%, #0A2040 70%, #0C1A2B 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #2F80ED 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl border-2 border-azure/30 overflow-hidden bg-azure/10 flex items-center justify-center">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-azure font-display">{firstName.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald rounded-full border-2 border-[#0C1A2B] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-sm mb-0.5">{getGreeting()}</p>
            <h1 className="text-3xl font-display font-bold text-white truncate">{profile?.full_name ?? firstName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-white/50"><Target size={12} className="text-azure" />{position} · {sport}</span>
              <span className="flex items-center gap-1.5 text-xs text-white/50"><MapPin size={12} className="text-azure" />{club}</span>
              <span className="flex items-center gap-1.5 text-xs text-white/50"><Trophy size={12} className="text-volt" />{level}</span>
              {profile?.is_verified && <VerifiedBadge size="sm" />}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-emerald/10 border border-emerald/20 rounded-xl px-3 py-2">
              <span className="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald">Profile Live</span>
            </div>
            <Link to={`/athletes/${athleteId ?? ''}`} className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
              View Public Profile <ArrowRight size={12} />
            </Link>
          </div>
        </div>
        <div className="relative border-t border-white/[0.06] px-6 sm:px-8 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-xs text-white/40 font-medium uppercase tracking-widest">Recent Form</span>
          <div className="flex items-center gap-1.5">{form.length ? form.map((f, i) => <FormDot key={i} result={f.result} />) : <span className="text-xs text-white/30">No matches yet</span>}</div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs text-white/40">Last {form.length} matches</span>
            <span className="flex items-center gap-1 text-xs text-volt font-semibold"><Flame size={11} />Avg {avgRating} rating</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="flex flex-col items-center gap-3">
              <div className="relative p-1 rounded-full" style={{ background: 'rgba(184,241,53,0.06)', boxShadow: '0 0 28px rgba(184,241,53,0.12)' }}>
                <ScoreRing score={+visibility.toFixed(1)} size={112} strokeWidth={8} sublabel="Visibility" isTopTier animated />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#B8F135' }}>Scout Reach</p>
                <p className="text-[10px] text-white/35 mt-0.5">{viewTotal} profile views</p>
              </div>
            </div>
            <div className="hidden sm:block h-28 w-px bg-white/[0.08]" />
            <div className="flex flex-col items-center gap-3">
              <div className="relative p-1 rounded-full" style={{ background: 'rgba(47,128,237,0.06)', boxShadow: '0 0 28px rgba(47,128,237,0.10)' }}>
                <ScoreRing score={+performance.toFixed(1)} size={112} strokeWidth={8} sublabel="AI Score" animated />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-azure">vs. Peers</p>
                <p className="text-[10px] text-white/35 mt-0.5">{athlete?.level ?? sport}</p>
              </div>
            </div>
            <div className="hidden sm:block h-28 w-px bg-white/[0.08]" />
            <div className="flex flex-col items-center gap-3">
              <div className="relative p-1 rounded-full" style={{ background: 'rgba(31,181,122,0.06)', boxShadow: '0 0 28px rgba(31,181,122,0.08)' }}>
                <ScoreRing value={completePct} max={100} size={112} strokeWidth={8} sublabel="Profile" color="#1FB57A" animated />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald">Completeness</p>
                <p className="text-[10px] text-white/35 mt-0.5">{completePct}% done</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block w-px self-stretch bg-rim" />
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink">Profile Strength</p>
              <span className="text-sm font-bold tabular" style={{ color: completePct >= 80 ? '#1FB57A' : '#2F80ED' }}>{completePct}%</span>
            </div>
            <div className="h-1.5 bg-rim rounded-full overflow-hidden mb-5">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${completePct}%`, background: 'linear-gradient(90deg, #2F80ED 0%, #B8F135 100%)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
              {checklist.map(item => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald/15 text-emerald' : 'bg-rim text-slate'}`}>
                    {item.done ? <ShieldCheck size={9} /> : <span className="w-1.5 h-1.5 bg-slate/40 rounded-full" />}
                  </div>
                  <span className={item.done ? 'text-ink' : 'text-slate line-through'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile value={viewTotal} label="Scout Views" trend="up" trendValue="all time" accent="azure" />
        <StatTile value={endorsements.length} label="Endorsements" trend="up" trendValue="verified" accent="azure" />
        <StatTile value={opportunities.length} label="Open Opportunities" trend="neutral" trendValue="matched" accent="volt" />
        <StatTile value={medRecords.length} label="Medical Records" trend="up" trendValue="on file" accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-ink">Attribute Breakdown</p>
            <span className="badge-azure">Season 25/26</span>
          </div>
          <p className="text-xs text-slate mb-3">AI-calculated · {sport}</p>
          <div style={{ height: 200 }}><RadarChart attrs={attrs} /></div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {attrs.slice(0, 3).map(a => (
              <div key={a.label} className="text-center">
                <p className="text-[11px] text-slate">{a.label}</p>
                <p className="text-sm font-bold tabular" style={{ color: a.value >= 80 ? '#2F80ED' : '#5B6B82' }}>{a.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-ink">Career Trajectory</p>
            <span className="badge-volt">{trajectory.length ? 'AI forecast' : 'Add history'}</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="flex items-center gap-1.5 text-xs text-slate"><span className="inline-block w-3 h-0.5 bg-azure rounded-full" />Actual</span>
            <span className="flex items-center gap-1.5 text-xs text-slate"><span className="inline-block w-3 rounded-full" style={{ height: 2, borderTop: '2px dashed #B8F135' }} />Forecast</span>
          </div>
          <div style={{ height: 130 }}><LineChart trajectory={trajectory} /></div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-azure/6 border border-azure/15 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-slate mb-0.5">Current</p>
              <p className="text-sm font-bold text-azure tabular">{visibility.toFixed(1)}</p>
            </div>
            <div className="bg-volt/8 border border-volt/20 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-slate mb-0.5">Forecast</p>
              <p className="text-sm font-bold text-ink tabular">{(trajectory.find(t => t.forecast)?.forecast ?? visibility).toFixed(1)}</p>
            </div>
            <div className="bg-emerald/6 border border-emerald/15 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-slate mb-0.5">Fitness</p>
              <p className="text-sm font-bold text-emerald tabular">{((athlete?.fitness_score ?? 0) / 10).toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Medical Intelligence</p>
            <VerifiedBadge size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={(clearance?.status as 'cleared') ?? 'pending'} />
            <span className="text-xs text-slate">{clearance?.status === 'cleared' ? 'Full clearance active' : 'Clearance pending'}</span>
          </div>
          <div className="p-3 bg-emerald/6 border border-emerald/15 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity size={12} className="text-emerald" />
              <p className="text-xs text-emerald font-semibold">AI Risk Summary</p>
            </div>
            <p className="text-xs text-slate leading-relaxed">
              {clearance?.notes ?? (medRecords.length ? 'Medical records are on file, but no active clearance is available yet.' : 'No verified medical records are on file yet.')}
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Last verified', value: clearance ? timeAgo(clearance.created_at) : '—' },
              { label: 'Records on file', value: `${medRecords.length} documents` },
              { label: 'Clearance valid to', value: clearance?.effective_to ?? '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-xs">
                <span className="text-slate">{row.label}</span>
                <span className="text-ink font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <Link to="/athlete/medical" className="text-xs text-azure flex items-center gap-1 hover:text-azure/80 transition-colors">
              Open medical hub <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink">Recent Scout Interest</p>
            <span className="badge-azure flex items-center gap-1"><Eye size={10} />{viewTotal} views</span>
          </div>
          <div className="space-y-1">
            {views.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-page transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border bg-azure/10 border-azure/25 text-azure">
                  {(s.viewer_org ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-ink font-medium truncate">{s.viewer_org ?? 'Scout'}</p>
                    {s.viewer_verified && <ShieldCheck size={11} className="text-emerald flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate">{s.viewer_role}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock size={10} className="text-slate" />
                  <p className="text-[11px] text-slate">{timeAgo(s.created_at)}</p>
                </div>
              </div>
            ))}
            {!views.length && <p className="text-xs text-slate py-4 text-center">No scout views yet.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink">Matched Opportunities</p>
            <span className="badge-volt flex items-center gap-1"><Zap size={10} />AI Match</span>
          </div>
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <Link to="/athlete/opportunities" key={opp.id} className="block p-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] hover:border-azure/30 rounded-xl transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-ink group-hover:text-azure transition-colors leading-tight">{opp.title}</p>
                </div>
                <p className="text-xs text-azure font-medium">{opp.organization?.name ?? opp.location}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-slate"><MapPin size={9} />{opp.location}</span>
                  {opp.salary_min && <span className="text-[11px] text-emerald font-semibold">{opp.currency} {(opp.salary_min / 1000)}k+</span>}
                  {opp.application_deadline && <span className="flex items-center gap-1 text-[11px] text-slate ml-auto"><Calendar size={9} />{opp.application_deadline}</span>}
                </div>
              </Link>
            ))}
            {!opportunities.length && <p className="text-xs text-slate py-4 text-center">No opportunities yet.</p>}
          </div>
        </div>

        <div className="card p-5 relative overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
          <div className="relative flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-azure/10 border border-azure/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot size={17} className="text-azure" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">AI Career Coach</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse" />
                  <p className="text-[11px] text-emerald">Online</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hidden mb-3 max-h-48">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-azure text-white rounded-br-sm' : 'bg-page border border-rim text-ink rounded-bl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {['Improve my score', 'Matching clubs', 'Training plan'].map(q => (
                <button key={q} onClick={() => setAiInput(q)} className="text-[11px] px-2.5 py-1 bg-azure/8 hover:bg-azure/15 border border-azure/15 hover:border-azure/30 text-azure rounded-full transition-all">{q}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-auto">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Ask your AI coach..." className="input-field flex-1 text-xs py-2.5" />
              <button onClick={handleSendMessage} className="w-9 h-9 bg-azure hover:bg-azure/90 rounded-xl flex items-center justify-center transition-all flex-shrink-0"><Send size={14} className="text-white" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink">Last {form.length} Match Performances</p>
          <Link to="/athlete/performance" className="text-xs text-azure flex items-center gap-1 hover:text-azure/80 transition-colors">Full history <ChevronRight size={12} /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate border-b border-rim">
                <th className="text-left pb-2.5 font-medium">Match</th>
                <th className="text-center pb-2.5 font-medium">Result</th>
                <th className="text-center pb-2.5 font-medium">Rating</th>
                <th className="text-center pb-2.5 font-medium">Goals</th>
                <th className="text-center pb-2.5 font-medium">Assists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rim">
              {form.map((f, i) => (
                <tr key={i} className="hover:bg-page transition-colors">
                  <td className="py-2.5 text-ink">{f.match}</td>
                  <td className="py-2.5 text-center"><FormDot result={f.result} /></td>
                  <td className="py-2.5 text-center"><span className="font-bold tabular" style={{ color: Number(f.score) >= 8.5 ? '#1FB57A' : Number(f.score) >= 7 ? '#2F80ED' : '#5B6B82' }}>{f.score}</span></td>
                  <td className="py-2.5 text-center text-ink font-semibold tabular">{f.goals}</td>
                  <td className="py-2.5 text-center text-ink font-semibold tabular">{f.assists}</td>
                </tr>
              ))}
              {!form.length && <tr><td colSpan={5} className="py-6 text-center text-slate">No match records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

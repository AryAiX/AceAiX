import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, TrendingUp, BarChart3, Target, Zap, X,
  Flame, Award, Calendar, ChevronRight, Check,
  Loader2, Swords, Clock, Star,
} from 'lucide-react';
import { useMyAthlete } from '../../hooks/useAthlete';
import { listMatches, createMatch } from '../../api/portfolio';
import type { MatchRecord, AttributeData } from '../../types';

/* ── display shapes & derivations ──────────────────────────── */
interface MatchView {
  date: string;
  opponent: string;
  competition: string;
  result: 'win' | 'draw' | 'loss';
  minutes: number;
  goals: number;
  assists: number;
  rating: number;
}

interface SeasonStat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  max: number;
  raw: number;
}

interface Percentile {
  metric: string;
  percentile: number;
  benchmark: string;
  color: string;
}

const PCT_COLORS = ['#B8F135', '#2F80ED', '#1FB57A', '#F5A623', '#A78BFA'];

function resultKind(r: string | null): 'win' | 'draw' | 'loss' {
  if (!r) return 'draw';
  const s = r.trim().toLowerCase();
  if (s === 'win' || s.startsWith('w')) return 'win';
  if (s === 'loss' || s === 'lose' || s.startsWith('l')) return 'loss';
  return 'draw';
}

function matchRating(m: MatchRecord): number {
  const r = (m.stats as { rating?: number })?.rating;
  return typeof r === 'number' ? r : 7;
}

function toMatchView(m: MatchRecord): MatchView {
  return {
    date: new Date(m.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    opponent: m.opponent ?? 'TBD',
    competition: m.competition ?? '—',
    result: resultKind(m.result),
    minutes: m.minutes_played ?? 0,
    goals: m.goals,
    assists: m.assists,
    rating: matchRating(m),
  };
}

/* ── result helpers ─────────────────────────────────────────── */
const RESULT_STYLE: Record<string, [string, string, string]> = {
  win:  ['#1FB57A', 'rgba(31,181,122,0.12)',  'rgba(31,181,122,0.30)'],
  draw: ['#F5A623', 'rgba(245,166,35,0.12)',  'rgba(245,166,35,0.30)'],
  loss: ['#EF5350', 'rgba(239,83,80,0.12)',   'rgba(239,83,80,0.30)'],
};

function ratingColor(r: number) {
  return r >= 8.5 ? '#B8F135' : r >= 7.5 ? '#1FB57A' : r >= 6.5 ? '#2F80ED' : '#EF5350';
}

/* ── animated progress bar ──────────────────────────────────── */
function ProgressBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay + 200); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${w}%`,
          background: `linear-gradient(90deg, ${color}bb, ${color})`,
          boxShadow: `0 0 8px ${color}60`,
          transition: `width 1s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
        }} />
    </div>
  );
}

/* ── add-match modal ────────────────────────────────────────── */
function AddMatchModal({ athleteId, onClose, onSaved }: { athleteId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ opponent: '', competition: '', result: 'win', goals: '', assists: '', minutes: '90', rating: '' });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await createMatch({
        athlete_id: athleteId,
        match_date: new Date().toISOString().slice(0, 10),
        opponent: form.opponent.trim() || null,
        competition: form.competition.trim() || null,
        result: form.result,
        minutes_played: form.minutes ? parseInt(form.minutes, 10) : null,
        goals: form.goals ? parseInt(form.goals, 10) : 0,
        assists: form.assists ? parseInt(form.assists, 10) : 0,
        stats: form.rating ? { rating: parseFloat(form.rating) } : {},
      });
      setSaving(false);
      setSaved(true);
      onSaved();
      setTimeout(onClose, 900);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Failed to log match.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,26,43,0.85)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease both' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: '#16273B',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(184,241,53,0.12)', border: '1px solid rgba(184,241,53,0.25)' }}>
              <Plus size={14} className="text-volt" />
            </div>
            <h3 className="text-sm font-bold text-white">Log Match</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Opponent</label>
              <input value={form.opponent} onChange={e => set('opponent', e.target.value)}
                className="input-field" placeholder="e.g. Al Hilal" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Competition</label>
              <input value={form.competition} onChange={e => set('competition', e.target.value)}
                className="input-field" placeholder="e.g. AGL" />
            </div>
          </div>

          {/* result pills */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Result</label>
            <div className="flex gap-2">
              {(['win', 'draw', 'loss'] as const).map(r => {
                const [color] = RESULT_STYLE[r];
                const active = form.result === r;
                return (
                  <button key={r} onClick={() => set('result', r)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                    style={{
                      background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.10)'}`,
                      color: active ? color : 'rgba(255,255,255,0.35)',
                      boxShadow: active ? `0 0 14px ${color}20` : 'none',
                    }}>{r}</button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'goals',   label: 'Goals',   placeholder: '0' },
              { key: 'assists', label: 'Assists',  placeholder: '0' },
              { key: 'minutes', label: 'Minutes',  placeholder: '90' },
              { key: 'rating',  label: 'Rating',   placeholder: '7.5' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">{f.label}</label>
                <input type="number" value={(form as Record<string, string>)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="input-field text-center" placeholder={f.placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="px-6 pb-6">
          {error && <p className="text-xs text-coral mb-3">{error}</p>}
          <button onClick={handleSave} disabled={saving || saved}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: saved ? '#1FB57A' : '#B8F135',
              color: '#0C1A2B',
              boxShadow: saved ? '0 4px 20px rgba(31,181,122,0.4)' : '0 4px 20px rgba(184,241,53,0.35)',
            }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Plus size={15} />}
            {saving ? 'Saving…' : saved ? 'Logged!' : 'Log Match'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── mini bar chart ─────────────────────────────────────────── */
function FormBars({ matches: source }: { matches: MatchView[] }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 300); return () => clearTimeout(t); }, []);
  const matches = [...source].reverse();
  if (!matches.length) {
    return <div className="flex items-center justify-center h-28 text-xs text-white/30">No matches logged yet</div>;
  }
  return (
    <div className="flex items-end gap-2 h-28">
      {matches.map((m, i) => {
        const [color] = RESULT_STYLE[m.result];
        const frac = m.rating / 10;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[9px] font-bold tabular opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color }}>{m.rating}</span>
            <div className="w-full rounded-t-lg relative overflow-hidden"
              style={{
                height: vis ? `${frac * 100}%` : '0%',
                minHeight: vis ? 6 : 0,
                background: `linear-gradient(to top, ${color}cc, ${color}66)`,
                boxShadow: `0 0 10px ${color}40`,
                transition: `height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms`,
              }} />
            <span className="text-[9px] text-white/25 truncate w-full text-center">{m.opponent.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── stat tile ──────────────────────────────────────────────── */
function StatTileCard({ stat, delay }: { stat: SeasonStat; delay: number }) {
  const [vis, setVis] = useState(false);
  const [barW, setBarW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { setVis(true); setTimeout(() => setBarW((stat.raw / stat.max) * 100), 100); }, delay);
    return () => clearTimeout(t);
  }, [delay, stat.raw, stat.max]);

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5"
      style={{
        background: `${stat.color}08`,
        border: `1px solid ${stat.color}20`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 20px ${stat.color}0C`,
      }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}28` }}>
          <stat.icon size={14} style={{ color: stat.color }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${stat.color}80` }}>
          of {stat.max}
        </span>
      </div>
      <div>
        <p className="text-2xl font-display font-bold tabular leading-none" style={{ color: stat.color }}>{stat.value}</p>
        <p className="text-[11px] text-white/35 mt-0.5 uppercase tracking-wider">{stat.label}</p>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full"
          style={{
            width: `${barW}%`,
            background: stat.color,
            boxShadow: `0 0 6px ${stat.color}60`,
            transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1) 0.2s',
          }} />
      </div>
    </div>
  );
}

/* ── main ───────────────────────────────────────────────────── */
export default function PerformancePage() {
  const { data: athlete } = useMyAthlete();
  const athleteId = athlete?.id;
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const { data: rawMatches = [] } = useQuery({
    queryKey: ['matches', athleteId],
    queryFn: () => listMatches(athleteId!),
    enabled: !!athleteId,
  });

  const matches: MatchView[] = rawMatches.map(toMatchView);

  const avgRating = matches.length ? (matches.reduce((s, m) => s + m.rating, 0) / matches.length).toFixed(1) : '—';
  const totalGoals = matches.reduce((s, m) => s + m.goals, 0);
  const totalAssists = matches.reduce((s, m) => s + m.assists, 0);
  const totalMinutes = matches.reduce((s, m) => s + m.minutes, 0);
  const wins = matches.filter(m => m.result === 'win').length;

  const seasonStats: SeasonStat[] = [
    { label: 'Goals',   value: String(totalGoals),   icon: Target,   color: '#B8F135', max: Math.max(30, totalGoals),     raw: totalGoals },
    { label: 'Assists', value: String(totalAssists), icon: Zap,      color: '#2F80ED', max: Math.max(20, totalAssists),   raw: totalAssists },
    { label: 'Rating',  value: avgRating,            icon: Star,     color: '#F5A623', max: 10,                            raw: avgRating === '—' ? 0 : Number(avgRating) },
    { label: 'Matches', value: String(matches.length), icon: Calendar, color: '#1FB57A', max: Math.max(34, matches.length), raw: matches.length },
    { label: 'Minutes', value: totalMinutes.toLocaleString(), icon: Clock, color: '#A78BFA', max: Math.max(2700, totalMinutes), raw: totalMinutes },
    { label: 'Wins',    value: String(wins),         icon: Award,    color: '#EF5350', max: Math.max(24, matches.length),  raw: wins },
  ];

  const attrs = (athlete?.attributes ?? []) as AttributeData[];
  const analyticsPct = (athlete?.analytics as { percentiles?: Percentile[] } | undefined)?.percentiles;
  const percentiles: Percentile[] = analyticsPct?.length
    ? analyticsPct.slice(0, 5)
    : attrs.slice(0, 5).map((a, i) => ({
        metric: a.label,
        percentile: a.value,
        benchmark: athlete?.sport ?? 'League',
        color: PCT_COLORS[i % PCT_COLORS.length],
      }));

  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;

  return (
    <>
      {showAdd && athleteId && (
        <AddMatchModal
          athleteId={athleteId}
          onClose={() => setShowAdd(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['matches', athleteId] })}
        />
      )}

      <div className="max-w-6xl space-y-6 pb-10">

        {/* ── HERO HEADER ─────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0C1A2B 0%, #16273B 50%, #0A2040 100%)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-14px)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.19,1,0.22,1)',
          }}>
          {/* ambient orbs */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(184,241,53,0.10) 0%, transparent 70%)', transform: 'translate(35%,-35%)' }} />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(47,128,237,0.08) 0%, transparent 70%)', transform: 'translateY(50%)' }} />

          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(184,241,53,0.10)', border: '1px solid rgba(184,241,53,0.22)', boxShadow: '0 0 28px rgba(184,241,53,0.12)' }}>
                <BarChart3 size={22} className="text-volt" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Performance</h1>
                <p className="text-white/40 text-sm mt-0.5">Match records &amp; AI insights · Season 2025/26</p>
              </div>
            </div>
            {/* quick KPIs */}
            <div className="flex gap-4 flex-shrink-0">
              {[
                { label: 'Avg Rating', val: avgRating,        color: '#B8F135' },
                { label: 'Goals',      val: String(totalGoals), color: '#2F80ED' },
                { label: 'Win Rate',   val: `${winRate}%`, color: '#1FB57A' },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <p className="text-xl font-display font-bold tabular" style={{ color: k.color }}>{k.val}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all active:scale-95"
              style={{ background: '#B8F135', color: '#0C1A2B', boxShadow: '0 4px 20px rgba(184,241,53,0.35)' }}>
              <Plus size={15} /> Add Match
            </button>
          </div>

          {/* energy line */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(184,241,53,0.45) 40%, rgba(47,128,237,0.35) 70%, transparent)' }} />

          {/* flame form indicator */}
          <div className="relative px-6 sm:px-8 py-3 flex items-center gap-3">
            <Flame size={13} className="text-volt" />
            <span className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">Last 3 matches</span>
            <div className="flex gap-1.5">
              {matches.slice(0, 3).map((m, i) => {
                const [color] = RESULT_STYLE[m.result];
                return (
                  <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
                    {m.result[0].toUpperCase()}
                  </div>
                );
              })}
              {!matches.length && <span className="text-[11px] text-white/30">No matches yet</span>}
            </div>
            <span className="text-[11px] text-volt font-semibold ml-1">Avg {avgRating} rating · {winRate}% win rate</span>
          </div>
        </div>

        {/* ── SEASON STAT TILES ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {seasonStats.map((stat, i) => <StatTileCard key={stat.label} stat={stat} delay={i * 60} />)}
        </div>

        {/* ── MID ROW: percentiles + form bars ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* percentile rankings */}
          <div className="card p-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.5s ease 0.2s, transform 0.5s cubic-bezier(0.19,1,0.22,1) 0.2s',
            }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.22)' }}>
                <Target size={14} className="text-azure" />
              </div>
              <h2 className="text-sm font-bold text-white">AI Percentile Rankings</h2>
              <span className="ml-auto badge-azure text-[10px]">vs. League</span>
            </div>
            <div className="space-y-4">
              {!percentiles.length && (
                <p className="text-xs text-white/30 py-4 text-center">No attribute data yet.</p>
              )}
              {percentiles.map((p, i) => (
                <div key={p.metric}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateX(0)' : 'translateX(-12px)',
                    transition: `opacity 0.4s ease ${0.3 + i * 0.07}s, transform 0.4s cubic-bezier(0.19,1,0.22,1) ${0.3 + i * 0.07}s`,
                  }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-white/70">{p.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/25">{p.benchmark}</span>
                      <span className="text-xs font-bold tabular" style={{ color: p.color }}>{p.percentile}<span className="text-[9px]">th</span></span>
                    </div>
                  </div>
                  <ProgressBar pct={p.percentile} color={p.color} delay={300 + i * 70} />
                </div>
              ))}
            </div>
          </div>

          {/* form guide */}
          <div className="card p-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.5s ease 0.28s, transform 0.5s cubic-bezier(0.19,1,0.22,1) 0.28s',
            }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(184,241,53,0.10)', border: '1px solid rgba(184,241,53,0.20)' }}>
                <TrendingUp size={14} className="text-volt" />
              </div>
              <h2 className="text-sm font-bold text-white">Form Guide</h2>
              <span className="ml-auto badge-volt text-[10px]">Last 6</span>
            </div>

            <FormBars matches={matches} />

            {/* legend */}
            <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {(['win', 'draw', 'loss'] as const).map(r => {
                const [color] = RESULT_STYLE[r];
                return (
                  <span key={r} className="flex items-center gap-1.5 text-[11px] capitalize font-medium" style={{ color }}>
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color, boxShadow: `0 0 6px ${color}60` }} />
                    {r}
                  </span>
                );
              })}
              <span className="ml-auto text-[11px] text-white/25">Bar height = rating</span>
            </div>
          </div>
        </div>

        {/* ── MATCH LOG ───────────────────────────────────── */}
        <div className="card p-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.5s ease 0.35s, transform 0.5s cubic-bezier(0.19,1,0.22,1) 0.35s',
          }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(31,181,122,0.10)', border: '1px solid rgba(31,181,122,0.20)' }}>
                <Swords size={14} className="text-emerald" />
              </div>
              <h2 className="text-sm font-bold text-white">Match Log</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/25">Season 2025/26</span>
              <button className="text-[11px] text-azure flex items-center gap-0.5 hover:text-azure/80 transition-colors">
                Full history <ChevronRight size={11} />
              </button>
            </div>
          </div>

          {/* table */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Date', 'Opponent', 'Competition', 'Result', 'G', 'A', 'Min', 'Rating'].map((h, i) => (
                    <th key={h} className={`pb-2.5 font-semibold text-white/30 uppercase tracking-wider text-[10px] ${i >= 4 ? 'text-right' : 'text-left'} ${h === 'Competition' ? 'hidden sm:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!matches.length && (
                  <tr><td colSpan={8} className="py-8 text-center text-white/30">No match records yet. Log your first match.</td></tr>
                )}
                {matches.map((match, i) => {
                  const [color, bg, border] = RESULT_STYLE[match.result];
                  const isHov = hoveredRow === i;
                  return (
                    <tr key={i}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className="cursor-pointer"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent',
                        transition: 'background 0.15s',
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'translateX(0)' : 'translateX(-8px)',
                        // stagger on mount
                      }}>
                      <td className="py-3 text-white/30 font-medium pr-4 whitespace-nowrap">{match.date}</td>
                      <td className="py-3 font-semibold text-white pr-4 whitespace-nowrap">{match.opponent}</td>
                      <td className="py-3 text-white/40 hidden sm:table-cell pr-4">{match.competition}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                          style={{ background: bg, border: `1px solid ${border}`, color }}>
                          {match.result}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold tabular pr-3" style={{ color: match.goals > 0 ? '#B8F135' : 'rgba(255,255,255,0.35)' }}>
                        {match.goals}
                      </td>
                      <td className="py-3 text-right font-bold tabular pr-3" style={{ color: match.assists > 0 ? '#2F80ED' : 'rgba(255,255,255,0.35)' }}>
                        {match.assists}
                      </td>
                      <td className="py-3 text-right text-white/40 tabular pr-3">{match.minutes}'</td>
                      <td className="py-3 text-right">
                        <span className="font-bold tabular text-sm" style={{ color: ratingColor(match.rating) }}>
                          {match.rating}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

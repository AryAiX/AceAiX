import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Swords } from 'lucide-react';
import { useMyAthlete } from '../../hooks/useAthlete';
import { listMatches } from '../../api/portfolio';
import MatchDetailModal from '../../components/athlete/MatchDetailModal';
import type { MatchRecord } from '../../types';

const RESULT_STYLE: Record<string, [string, string, string]> = {
  win:  ['#1FB57A', 'rgba(31,181,122,0.12)',  'rgba(31,181,122,0.30)'],
  draw: ['#F5A623', 'rgba(245,166,35,0.12)',  'rgba(245,166,35,0.30)'],
  loss: ['#EF5350', 'rgba(239,83,80,0.12)',   'rgba(239,83,80,0.30)'],
};

function resultKind(r: string | null): 'win' | 'draw' | 'loss' {
  if (!r) return 'draw';
  const normalized = r.trim().toUpperCase();
  const trailing = normalized.match(/\s([WDL])$/);
  const code = trailing
    ? trailing[1]
    : normalized === 'W' || normalized === 'WIN' ? 'W'
    : normalized === 'D' || normalized === 'DRAW' ? 'D'
    : normalized === 'L' || normalized === 'LOSS' || normalized === 'LOST' ? 'L'
    : null;
  if (code === 'W') return 'win';
  if (code === 'L') return 'loss';
  return 'draw';
}

function matchRating(m: MatchRecord): number | null {
  const r = (m.stats as { rating?: number })?.rating;
  return typeof r === 'number' ? r : null;
}

export default function PerformanceHistoryPage() {
  const { data: athlete } = useMyAthlete();
  const athleteId = athlete?.id;
  const [selected, setSelected] = useState<MatchRecord | null>(null);

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', athleteId, 'all'],
    queryFn: () => listMatches(athleteId!),
    enabled: !!athleteId,
  });

  return (
    <div className="p-6 sm:p-8 space-y-5 max-w-4xl mx-auto">
      <Link to="/athlete/performance" className="inline-flex items-center gap-1 text-[11px] text-azure/70 hover:text-azure transition-colors">
        <ChevronLeft size={12} /> Back to Performance
      </Link>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(31,181,122,0.10)', border: '1px solid rgba(31,181,122,0.20)' }}>
          <Swords size={14} className="text-emerald" />
        </div>
        <h1 className="text-lg font-bold text-white">Full Match History</h1>
      </div>

      <div className="overflow-x-auto">
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
              <tr><td colSpan={8} className="py-8 text-center text-white/30">No match records yet.</td></tr>
            )}
            {matches.map((m) => {
              const kind = resultKind(m.result);
              const [color, bg, border] = RESULT_STYLE[kind];
              const rating = matchRating(m);
              return (
                <tr key={m.id} onClick={() => setSelected(m)} className="cursor-pointer hover:bg-white/04 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="py-3 text-white/60">{new Date(m.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="py-3 text-white font-semibold">{m.opponent ?? 'TBD'}</td>
                  <td className="py-3 text-white/40 hidden sm:table-cell">{m.competition ?? '—'}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: bg, border: `1px solid ${border}`, color }}>{kind}</span>
                  </td>
                  <td className="py-3 text-right tabular">{m.goals}</td>
                  <td className="py-3 text-right tabular">{m.assists}</td>
                  <td className="py-3 text-right tabular text-white/40">{m.minutes_played ?? '–'}'</td>
                  <td className="py-3 text-right tabular">{rating !== null ? rating : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && <MatchDetailModal match={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

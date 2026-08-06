import { X, Calendar, FileText } from 'lucide-react';
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

export default function MatchDetailModal({ match, onClose }: { match: MatchRecord; onClose: () => void }) {
  const kind = resultKind(match.result);
  const [color, bg, border] = RESULT_STYLE[kind];
  const ratingRaw = (match.stats as { rating?: number })?.rating;
  const rating = typeof ratingRaw === 'number' ? ratingRaw : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,26,43,0.85)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease both' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: '#16273B',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h3 className="text-sm font-bold text-white">vs. {match.opponent ?? 'TBD'}</h3>
            <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
              <Calendar size={11} /> {new Date(match.match_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold capitalize" style={{ background: bg, border: `1px solid ${border}`, color }}>
              {kind}
            </span>
            {match.competition && <span className="text-[11px] text-white/40">{match.competition}</span>}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Goals</p>
              <p className="text-lg font-bold text-white tabular">{match.goals}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Assists</p>
              <p className="text-lg font-bold text-white tabular">{match.assists}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Minutes</p>
              <p className="text-lg font-bold text-white tabular">{match.minutes_played ?? '–'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Rating</p>
              <p className="text-lg font-bold text-white tabular">{rating !== null ? rating : '–'}</p>
            </div>
          </div>

          {match.notes && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileText size={10} /> Notes
              </p>
              <p className="text-xs text-white/70 leading-relaxed">{match.notes}</p>
            </div>
          )}

          <p className="text-[10px] text-white/25 capitalize">Recorded: {match.source}</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Calendar, FileText, Pencil, Loader2, Check } from 'lucide-react';
import type { MatchRecord } from '../../types';
import { updateMatch } from '../../api/portfolio';
import VerifiedBadge from '../ui/VerifiedBadge';

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

function parseResultForEdit(r: string | null): { teamScore: string; opponentScore: string; result: 'win' | 'draw' | 'loss' } {
  const kind = resultKind(r);
  if (!r) return { teamScore: '', opponentScore: '', result: kind };
  const scoreMatch = r.trim().match(/^(\d+)-(\d+)/);
  if (scoreMatch) {
    return { teamScore: scoreMatch[1], opponentScore: scoreMatch[2], result: kind };
  }
  return { teamScore: '', opponentScore: '', result: kind };
}

export default function MatchDetailModal({ match, onClose, onSaved }: { match: MatchRecord; onClose: () => void; onSaved: () => void }) {
  const kind = resultKind(match.result);
  const [color, bg, border] = RESULT_STYLE[kind];
  const ratingRaw = (match.stats as { rating?: number })?.rating;
  const rating = typeof ratingRaw === 'number' ? ratingRaw : null;

  const canEdit = match.source !== 'verified';
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const parsedResult = parseResultForEdit(match.result);
  const [form, setForm] = useState({
    opponent: match.opponent ?? '',
    competition: match.competition ?? '',
    result: parsedResult.result,
    teamScore: parsedResult.teamScore,
    opponentScore: parsedResult.opponentScore,
    goals: String(match.goals ?? 0),
    assists: String(match.assists ?? 0),
    minutes: match.minutes_played != null ? String(match.minutes_played) : '',
    rating: rating !== null ? String(rating) : '',
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setSaving(true);
    setError('');
    const RESULT_LETTER: Record<string, string> = { win: 'W', draw: 'D', loss: 'L' };
    const resultText = form.teamScore !== '' && form.opponentScore !== ''
      ? `${form.teamScore}-${form.opponentScore} ${RESULT_LETTER[form.result]}`
      : form.result;
    const existingStats = (match.stats && typeof match.stats === 'object') ? { ...(match.stats as Record<string, unknown>) } : {};
    if (form.rating) {
      existingStats.rating = parseFloat(form.rating);
    } else {
      delete existingStats.rating;
    }
    try {
      await updateMatch(match.id, {
        opponent: form.opponent.trim() || null,
        competition: form.competition.trim() || null,
        result: resultText,
        minutes_played: form.minutes ? parseInt(form.minutes, 10) : null,
        goals: form.goals ? parseInt(form.goals, 10) : 0,
        assists: form.assists ? parseInt(form.assists, 10) : 0,
        stats: existingStats,
      });
      onSaved();
      onClose();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Failed to update match.');
    }
  }

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
            <h3 className="text-sm font-bold text-white">{isEditing ? 'Edit Match' : `vs. ${match.opponent ?? 'TBD'}`}</h3>
            {!isEditing && (
              <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                <Calendar size={11} /> {new Date(match.match_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && canEdit && (
              <button onClick={() => setIsEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors">
                <Pencil size={13} />
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {!isEditing ? (
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

            {match.source === 'verified'
              ? <VerifiedBadge size="sm" label="Verified" animated={false} />
              : <p className="text-[10px] text-white/25 capitalize">Recorded: {match.source}</p>}
          </div>
        ) : (
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

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Result</label>
              <div className="flex gap-2">
                {(['win', 'draw', 'loss'] as const).map(r => {
                  const [c] = RESULT_STYLE[r];
                  const active = form.result === r;
                  return (
                    <button key={r} onClick={() => set('result', r)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                      style={{
                        background: active ? `${c}18` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? c + '40' : 'rgba(255,255,255,0.10)'}`,
                        color: active ? c : 'rgba(255,255,255,0.35)',
                        boxShadow: active ? `0 0 14px ${c}20` : 'none',
                      }}>{r}</button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Your Team Score</label>
                <input type="number" value={form.teamScore} onChange={e => set('teamScore', e.target.value)}
                  className="input-field text-center" placeholder="e.g. 2" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Opponent Score</label>
                <input type="number" value={form.opponentScore} onChange={e => set('opponentScore', e.target.value)}
                  className="input-field text-center" placeholder="e.g. 1" />
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

            {error && <p className="text-xs text-coral">{error}</p>}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: '#B8F135',
                color: '#0C1A2B',
                boxShadow: '0 4px 20px rgba(184,241,53,0.35)',
              }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ShieldCheck, Quote, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import type { Recommendation } from '../../types';

const RELATIONSHIP_LABELS: Record<string, string> = {
  coach:         'Coach',
  teammate:      'Teammate',
  manager:       'Manager / Director',
  scout:         'Scout',
  medical_staff: 'Medical Staff',
  colleague:     'Colleague',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  coach:         'azure',
  teammate:      'emerald',
  manager:       'amber',
  scout:         'volt',
  medical_staff: 'emerald',
  colleague:     'muted',
};

interface RecommendationCardProps {
  rec: Recommendation;
  isOwn?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (rec: Recommendation) => void;
}

export default function RecommendationCard({ rec, isOwn, onDelete, onEdit }: RecommendationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const author = rec.author;
  const colorKey = RELATIONSHIP_COLORS[rec.relationship_type] ?? 'muted';

  const colorClass = {
    azure:   'bg-azure/10 text-azure border-azure/20',
    emerald: 'bg-emerald/10 text-emerald border-emerald/20',
    amber:   'bg-amber/10 text-amber border-amber/20',
    volt:    'bg-volt/10 text-volt border-volt/20',
    muted:   'bg-white/5 text-muted border-white/10',
  }[colorKey] ?? 'bg-white/5 text-muted border-white/10';

  const timeAgo = new Date(rec.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  return (
    <div className="card-dark p-5 group relative hover:border-white/15 transition-colors">
      {/* Quote icon accent */}
      <Quote size={28} className="absolute top-4 right-5 text-white/[0.04] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-azure/15 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt={author.full_name ?? ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-azure">{author?.full_name?.charAt(0) ?? '?'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-white">{author?.full_name ?? 'Anonymous'}</span>
            {author?.is_verified && <ShieldCheck size={11} className="text-emerald flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
              {RELATIONSHIP_LABELS[rec.relationship_type] ?? rec.relationship_type}
            </span>
            <span className="text-[11px] text-muted">{timeAgo}</span>
          </div>
        </div>

        {isOwn && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 w-36 card-dark border border-white/10 shadow-dark-hover overflow-hidden z-10"
                style={{ animation: 'slideUp 0.15s ease-out' }}>
                <button onClick={() => { onEdit?.(rec); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted hover:text-white hover:bg-white/5 transition-colors">
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => { onDelete?.(rec.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-coral hover:bg-coral/10 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <p className="text-sm text-slate-300 leading-relaxed relative z-10">{rec.body}</p>
    </div>
  );
}

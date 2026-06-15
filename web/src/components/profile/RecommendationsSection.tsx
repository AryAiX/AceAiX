import { useState } from 'react';
import { Quote, Loader2 } from 'lucide-react';
import SectionCard from './SectionCard';
import RecommendationCard from '../ui/RecommendationCard';
import type { Recommendation } from '../../types';

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  loading: boolean;
  isOwner?: boolean;
}

export default function RecommendationsSection({ recommendations, loading, isOwner }: RecommendationsSectionProps) {
  const [tab, setTab] = useState<'received' | 'given'>('received');

  const shown = tab === 'received' ? recommendations : [];

  return (
    <SectionCard title="Recommendations" icon={<Quote size={15} />} isOwner={isOwner}>
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl w-fit">
          {(['received', 'given'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={18} className="text-azure animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">
            {tab === 'received' ? 'No recommendations yet.' : 'No given recommendations.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {shown.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

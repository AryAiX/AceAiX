import { useState } from 'react';
import { AlignLeft } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface AboutSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

export default function AboutSection({ athlete, isOwner }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = athlete.bio.split('\n\n');
  const preview = paragraphs[0];
  const hasMore = paragraphs.length > 1;

  return (
    <SectionCard title="About" icon={<AlignLeft size={15} />} isOwner={isOwner}>
      <div className="space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">{preview}</p>
        {hasMore && expanded && paragraphs.slice(1).map((p, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
        ))}
        {hasMore && (
          <button onClick={() => setExpanded(e => !e)}
            className="text-xs font-semibold text-azure hover:text-azure/80 transition-colors flex items-center gap-1">
            {expanded ? 'Show less' : '…show more'}
          </button>
        )}
      </div>
    </SectionCard>
  );
}

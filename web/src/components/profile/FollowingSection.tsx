import { Rss, UserPlus } from 'lucide-react';
import { useState } from 'react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface FollowingSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

export default function FollowingSection({ athlete, isOwner }: FollowingSectionProps) {
  const [following, setFollowing] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setFollowing(s => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }

  return (
    <SectionCard title="Following" icon={<Rss size={15} />} isOwner={isOwner}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {athlete.following.map(item => {
          const isFollowing = following.has(item.name);
          return (
            <div key={item.name}
              className="flex items-center gap-3 border border-white/[0.06] rounded-xl px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold border"
                style={{ background: `${item.color}18`, borderColor: `${item.color}30`, color: item.color }}
              >
                {item.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                <p className="text-xs text-muted">{item.type} · {item.followers} followers</p>
              </div>
              <button
                onClick={() => toggle(item.name)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all flex-shrink-0 ${
                  isFollowing
                    ? 'border-azure/30 bg-azure/10 text-azure'
                    : 'border-white/15 text-muted hover:border-azure/30 hover:text-azure'
                }`}>
                <UserPlus size={9} /> {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

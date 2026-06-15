import { useState, useRef } from 'react';
import { Play, Eye, Heart, MessageCircle, Zap, Film } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface HighlightsSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

function ActivityCard({ post }: { post: AthleteProfileData['activity'][0] }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {post.image && (
        <img src={post.image} alt="" className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
        <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{post.text}</p>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
          <button onClick={() => setLiked(l => !l)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${liked ? 'text-coral' : 'text-muted hover:text-white'}`}>
            <Heart size={12} className={liked ? 'fill-current' : ''} />
            {liked ? post.reactions + 1 : post.reactions}
          </button>
          <button
            type="button"
            disabled
            title="Comments are planned for a later release."
            className="flex items-center gap-1.5 text-xs text-muted/60 cursor-not-allowed"
          >
            <MessageCircle size={12} /> Comment
          </button>
          <span className="text-xs text-muted ml-auto">{post.time}</span>
        </div>
      </div>
    </div>
  );
}

function HighlightCard({ clip, featured }: { clip?: AthleteProfileData['highlights'][0]; featured?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!clip) return null;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 ${featured ? 'w-full' : 'w-52'}`}
      style={{
        transform: hovered ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <img
        src={clip.thumbnail}
        alt={clip.title}
        className={`w-full object-cover ${featured ? 'h-56' : 'h-32'}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />

      {/* Play button */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${hovered ? 'opacity-100' : 'opacity-70'}`}>
        <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center">
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </div>
      </div>

      {/* Duration */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-ink/70 text-[10px] font-semibold text-white">
        {clip.duration}
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className={`text-white font-semibold leading-tight ${featured ? 'text-sm' : 'text-xs'} line-clamp-2`}>{clip.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {(clip.tags ?? []).slice(0, featured ? 3 : 2).map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-azure/20 text-azure border border-azure/20 font-semibold">
              {tag}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-muted ml-auto">
            <Eye size={9} /> {clip.views}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HighlightsSection({ athlete, isOwner }: HighlightsSectionProps) {
  const [tab, setTab] = useState<'highlights' | 'activity'>('highlights');
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <SectionCard
      title="Activity & Highlights"
      icon={<Film size={15} />}
      isOwner={isOwner}
      noPad
    >
      <div className="px-5 pt-3">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4 w-fit">
          {(['highlights', 'activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'highlights' ? (
        (athlete.highlights?.length ?? 0) === 0 ? (
          <div className="px-5 pb-6 text-sm text-muted">No highlight clips yet.</div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            {/* Featured clip */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={11} className="text-volt" />
                <span className="text-[10px] font-bold text-volt uppercase tracking-widest">Featured</span>
              </div>
              <HighlightCard clip={athlete.highlights[0]} featured />
            </div>

            {/* Horizontal gallery */}
            {athlete.highlights.length > 1 && (
              <div>
                <p className="text-xs text-muted font-medium mb-2">All clips</p>
                <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hidden pb-2">
                  {athlete.highlights.slice(1).map(clip => (
                    <HighlightCard key={clip.id} clip={clip} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="px-5 pb-5 space-y-3">
          {(athlete.activity?.length ?? 0) === 0
            ? <div className="text-sm text-muted">No recent activity.</div>
            : athlete.activity.map(post => (
                <ActivityCard key={post.id} post={post} />
              ))}
        </div>
      )}
    </SectionCard>
  );
}

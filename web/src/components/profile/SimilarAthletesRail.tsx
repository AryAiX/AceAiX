import { useEffect, useRef, useState } from 'react';
import { UserPlus, Zap, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface SimilarAthleteItem {
  id: string;
  name: string;
  position: string;
  club: string;
  score: number;
  image: string;
  isVerified: boolean;
}

interface SimilarAthletesRailProps {
  athletes?: SimilarAthleteItem[];
}

function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.55s cubic-bezier(0.19,1,0.22,1) ${delay}s, transform 0.55s cubic-bezier(0.19,1,0.22,1) ${delay}s`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, { threshold: 0.1 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [delay]);
  return ref;
}

function AthleteRow({ a, index, isFollowing, onToggle }: {
  a: SimilarAthleteItem; index: number;
  isFollowing: boolean; onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(16px)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.4s ease ${index * 0.07}s, transform 0.4s cubic-bezier(0.19,1,0.22,1) ${index * 0.07}s`;
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      }, { threshold: 0.1 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [index]);

  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        {a.image
          ? <img src={a.image} alt={a.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
          : <div className="w-10 h-10 rounded-xl bg-azure/10 border border-white/10 flex items-center justify-center text-sm font-bold text-azure">{a.name.charAt(0)}</div>}
        {a.isVerified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald border-2 border-[#0C1A2B] flex items-center justify-center">
            <ShieldCheck size={8} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/athletes/${a.id}`} className="text-sm font-semibold text-white hover:text-azure transition-colors truncate block">{a.name}</Link>
        <p className="text-xs text-muted truncate">{a.position} · {a.club}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="font-display font-bold text-volt text-sm tabular flex items-center gap-1"><Zap size={9} className="text-volt" />{a.score}</span>
        <button onClick={onToggle}
          className={`p-1 rounded-lg transition-all ${isFollowing ? 'text-azure bg-azure/10' : 'text-muted hover:text-azure hover:bg-azure/10'}`}>
          <UserPlus size={12} />
        </button>
      </div>
    </div>
  );
}

export default function SimilarAthletesRail({ athletes = [] }: SimilarAthletesRailProps) {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const railRef = useFadeIn(0);
  const ctaRef = useFadeIn(0.1);

  function toggle(id: string) {
    setFollowing(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="space-y-4">
      <div ref={railRef} className="card-glass p-4">
        <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">People Also Viewed</p>
        {athletes.length === 0 ? (
          <div className="text-center py-6">
            <Users size={22} className="text-muted mx-auto mb-2" />
            <p className="text-xs text-muted">No similar athletes yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {athletes.map((a, i) => (
              <AthleteRow key={a.id} a={a} index={i} isFollowing={following.has(a.id)} onToggle={() => toggle(a.id)} />
            ))}
          </div>
        )}
      </div>
      <div ref={ctaRef} className="card-glass p-4" style={{ background: 'linear-gradient(135deg, rgba(47,128,237,0.12), rgba(22,39,59,0.8))' }}>
        <Zap size={18} className="text-volt mb-2" style={{ filter: 'drop-shadow(0 0 8px rgba(184,241,53,0.6))' }} />
        <p className="text-sm font-bold text-white mb-1">AI Scout Match</p>
        <p className="text-xs text-muted mb-3">3 scouts are actively looking for a player matching this profile.</p>
        <Link to="/auth/register" className="btn-volt w-full py-2 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5">
          View Matches
        </Link>
      </div>
    </div>
  );
}

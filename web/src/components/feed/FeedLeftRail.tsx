import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Bookmark, Play, Star, BarChart3, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyAthlete } from '../../hooks/useAthlete';

const COVER_BANNER = 'https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg?auto=compress&cs=tinysrgb&w=400';
const AVATAR_IMAGE = 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100';

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  function start() {
    if (started.current) return;
    started.current = true;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return { value, start };
}

function StatItem({ number, label }: { number: number; label: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const { value, start } = useCountUp(number);
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { obs.disconnect(); start(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={divRef} className="text-center">
      <div className="font-display text-xl font-bold text-ink tabular">{value.toLocaleString()}</div>
      <div className="text-xs text-slate mt-0.5">{label}</div>
    </div>
  );
}

function ScoreRingInline({ value }: { value: number }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const [active, setActive] = useState(false);
  const radius = 42;
  const circ   = 2 * Math.PI * radius;
  const offset = circ * (1 - value / 100);

  useEffect(() => {
    const id = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="7" />
          <circle
            ref={circleRef}
            cx="50" cy="50" r={radius}
            fill="none" stroke="#2F80ED" strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={active ? offset : circ}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.2s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-ink tabular" style={{ fontSize: 22, fontFamily: "'Clash Display',sans-serif" }}>
            {value}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate font-medium">Visibility Score</span>
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'Saved Opportunities', icon: <Bookmark size={16} />, to: '/athlete/opportunities' },
  { label: 'My Highlights',       icon: <Play    size={16} />, to: '/athlete/media'         },
  { label: 'Endorsements',        icon: <Star    size={16} />, to: '/athlete/network'       },
  { label: 'Analytics',           icon: <BarChart3 size={16} />, to: '/athlete/analytics'   },
];

export default function FeedLeftRail() {
  const { profile } = useAuth();
  const { data: athlete } = useMyAthlete();
  const [barWidth, setBarWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const profileStrength = athlete?.profile_completeness ?? 0;
  const visibilityScore = athlete?.visibility_score ?? 0;
  const followersCount  = athlete?.followers_count ?? 0;
  const connectionsCount = athlete?.connections_count ?? 0;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.opacity   = '0';
    el.style.transform = 'translateX(-14px)';
    el.style.transition = 'opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.19,1,0.22,1)';
    const id = requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateX(0)';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(profileStrength), 600);
    return () => clearTimeout(t);
  }, [profileStrength]);

  const name     = profile?.full_name ?? 'Your Profile';
  const position = athlete?.position_primary ?? athlete?.position ?? '—';
  const level    = athlete?.level ?? '—';
  const club     = athlete?.current_club ?? 'Unsigned';

  return (
    <div ref={wrapRef} className="sticky top-[72px] space-y-3">
      <div className="card overflow-hidden">
        {/* Cover banner */}
        <img src={athlete?.cover_url || COVER_BANNER} alt="cover" className="w-full h-20 object-cover rounded-t-2xl" />

        <div className="p-4">
          {/* Avatar */}
          <div className="flex items-end gap-3 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-full ring-2 ring-[#16273B] overflow-hidden bg-[#0F2133] flex-shrink-0">
              <img
                src={profile?.avatar_url || AVATAR_IMAGE}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Name + headline */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-display font-semibold text-ink">{name}</h2>
              {profile?.is_verified && <ShieldCheck size={14} className="text-emerald flex-shrink-0" />}
            </div>
            <p className="text-sm text-slate">{position} · {level} · {club}</p>
            {profile?.is_verified && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald/10 border border-emerald/20 rounded-full">
                <ShieldCheck size={12} className="text-emerald" />
                <span className="text-xs font-semibold text-emerald">Verified Athlete</span>
              </div>
            )}
          </div>

          {/* Score ring */}
          <div className="py-4 border-t border-rim flex justify-center">
            <ScoreRingInline value={visibilityScore} />
          </div>

          <div className="border-t border-rim my-4" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-2 border-b border-rim">
            <StatItem number={followersCount}   label="Followers"   />
            <StatItem number={connectionsCount} label="Connections" />
            <StatItem number={visibilityScore}  label="Visibility"  />
          </div>

          <div className="border-t border-rim my-4" />

          {/* Quick links */}
          <div className="space-y-0.5">
            {QUICK_LINKS.map(item => (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 text-ink hover:bg-white/[0.06] rounded-lg transition-colors group"
              >
                <span className="text-azure">{item.icon}</span>
                <span className="text-sm flex-1">{item.label}</span>
                <ChevronRight size={14} className="text-slate opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>

          {/* Profile strength */}
          <div className="mt-4 pt-4 border-t border-rim">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate font-medium">Profile Strength</span>
              <span className="text-sm font-semibold text-ink">{profileStrength}%</span>
            </div>
            <div className="h-1.5 bg-rim rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${barWidth}%`,
                  background: '#B8F135',
                  transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

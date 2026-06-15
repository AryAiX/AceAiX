import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Zap, Shield, ShieldCheck, Bot, Network, ArrowRight, ChevronRight, LogIn, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCms } from '../api/content';
import { listAthletes } from '../api/athletes';

interface HomeCms {
  heroStats: { value: string; label: string }[];
  pillars: { title: string; desc: string; icon: string }[];
  trustClubs: string[];
}

const PILLAR_ICONS: Record<string, LucideIcon> = {
  Bot,
  ShieldCheck,
  Network,
  Shield,
};

const PILLAR_PALETTE = [
  { color: '#1FB57A', bg: 'rgba(31,181,122,0.08)' },
  { color: '#2F80ED', bg: 'rgba(47,128,237,0.08)' },
  { color: '#2F80ED', bg: 'rgba(47,128,237,0.08)' },
];

function useInView(options?: IntersectionObserverInit) {
  const [inView, setInView] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  // Callback ref so the observer (re)attaches whenever the node mounts — including
  // when a section swaps from a loading skeleton (no ref) to its real content.
  const ref = useCallback((node: HTMLDivElement | null) => {
    obsRef.current?.disconnect();
    if (!node) return;
    obsRef.current = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        obsRef.current?.disconnect();
      }
    }, options);
    obsRef.current.observe(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, inView };
}

/* ─── Hero Section ───────────────────────────────────────────────────────── */
function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data: cms } = useQuery({ queryKey: ['cms', 'home'], queryFn: () => getCms<HomeCms>('home') });
  const heroStats = cms?.heroStats ?? [];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    const id = requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.8s ease-out 0.2s, transform 0.8s cubic-bezier(0.19,1,0.22,1) 0.2s';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className="relative min-h-screen pt-[60px] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Ink gradient overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, rgba(12,26,43,0.95) 0%, rgba(12,26,43,0.75) 50%, rgba(12,26,43,0.55) 100%)',
        }}
      />

      <div ref={wrapRef} className="relative z-10 w-full max-w-5xl mx-auto px-4 lg:px-8 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/8 mb-8"
          style={{ backdropFilter: 'blur(8px)' }}>
          <Zap size={12} className="text-volt" fill="#B8F135" />
          <span className="text-xs font-semibold text-white/80 tracking-wide">AI-Powered Talent Discovery</span>
        </div>

        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold mb-3 leading-none"
          style={{ fontFamily: "'Clash Display', sans-serif", color: 'white', letterSpacing: '-0.03em' }}
        >
          Elevate Your Game.
        </h1>
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-none"
          style={{
            fontFamily: "'Clash Display', sans-serif",
            backgroundImage: 'linear-gradient(90deg, #2F80ED 0%, #B8F135 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
          }}
        >
          Get Discovered.
        </h1>

        <p
          className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.72)' }}
        >
          The intelligent platform connecting athletes, clubs, and scouts across the UAE &amp; GCC.
        </p>

        {/* Search Bar */}
        <div className="mb-8 max-w-xl mx-auto">
          <div
            className="flex items-center rounded-2xl p-3 pl-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Search size={18} className="flex-shrink-0 mr-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search athletes, positions, clubs…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'white' }}
            />
            <button
              className="ml-3 px-5 py-2 rounded-xl font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: '#2F80ED', color: 'white' }}
            >
              Search
            </button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14">
          <Link
            to="/auth/register"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#B8F135', color: '#0C1A2B' }}
          >
            Create Free Profile <ArrowRight size={18} />
          </Link>
          <Link
            to="/auth/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-white/15"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <LogIn size={18} /> Sign In
          </Link>
          <Link
            to="/athletes"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            Browse Athletes <ChevronRight size={18} />
          </Link>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {heroStats.map((stat, i) => (
            <div key={i} className="text-center">
              <div
                className="text-2xl font-bold leading-none mb-1"
                style={{ fontFamily: "'Clash Display', sans-serif", color: '#B8F135' }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
        <div className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-white/50" style={{ animation: 'float 1.8s ease-in-out infinite' }} />
        </div>
      </div>
    </section>
  );
}

/* ─── Trust Ticker ───────────────────────────────────────────────────────── */
function TrustTicker() {
  const { data: cms } = useQuery({ queryKey: ['cms', 'home'], queryFn: () => getCms<HomeCms>('home') });
  const trustClubs = cms?.trustClubs ?? [];
  if (!trustClubs.length) return null;
  const doubled = [...trustClubs, ...trustClubs];

  return (
    <section className="py-5 overflow-hidden border-y border-rim" style={{ background: 'rgba(10,20,38,0.95)' }}>
      <p className="text-[11px] font-bold text-slate uppercase tracking-widest mb-3 text-center">
        Trusted by clubs and federations across the GCC
      </p>
      <div className="overflow-hidden">
        <div className="flex gap-6 whitespace-nowrap" style={{ animation: 'marquee 30s linear infinite' }}>
          {doubled.map((club, i) => (
            <div
              key={i}
              className="px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
              style={{ background: 'rgba(47,128,237,0.12)', color: '#60AAFF', border: '1px solid rgba(47,128,237,0.25)' }}
            >
              {club}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Three Pillar Cards ─────────────────────────────────────────────────── */
function PillarCards() {
  const { ref, inView } = useInView({ threshold: 0.1 });
  const { data: cms } = useQuery({ queryKey: ['cms', 'home'], queryFn: () => getCms<HomeCms>('home') });
  const pillars = cms?.pillars ?? [];

  return (
    <section className="bg-page py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            Built for the modern athlete
          </h2>
          <p className="text-slate text-lg max-w-xl mx-auto">
            Everything you need to get discovered, track progress, and reach the next level.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => {
            const IconComponent = PILLAR_ICONS[pillar.icon] ?? Shield;
            const palette = PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
            return (
              <div
                key={idx}
                className="card p-8"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${idx * 0.15}s, transform 0.6s cubic-bezier(0.19,1,0.22,1) ${idx * 0.15}s`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = inView ? 'translateY(0)' : 'translateY(24px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: palette.bg, color: palette.color }}
                >
                  <IconComponent size={22} />
                </div>
                <h3 className="text-lg font-bold mb-3 text-ink">{pillar.title}</h3>
                <p className="text-slate text-sm leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Rising Talent Row ──────────────────────────────────────────────────── */
function RisingTalentRow() {
  const { ref, inView } = useInView({ threshold: 0.1 });
  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['athletes', { limit: 4, openToOffers: true }],
    queryFn: () => listAthletes({ limit: 4, openToOffers: true }),
  });

  return (
    <section className="py-20 lg:py-28 border-t border-rim" style={{ background: '#0A1628' }}>
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-bold text-azure uppercase tracking-widest mb-2">Rising Talent</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-ink">Faces to watch</h2>
          </div>
          <Link
            to="/athletes"
            className="hidden md:flex items-center gap-1.5 text-sm font-bold text-azure hover:underline"
          >
            View all <ChevronRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="h-48 bg-rim" />
                <div className="p-4">
                  <div className="h-1.5 bg-rim rounded-full mb-4" />
                  <div className="h-4 w-24 bg-rim rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : athletes.length === 0 ? (
          <p className="text-slate text-sm">No rising talent to show yet.</p>
        ) : (
          <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {athletes.map((athlete, idx) => {
              const score = +(athlete.visibility_score / 10).toFixed(1);
              const name = athlete.user?.full_name ?? 'Athlete';
              const image = athlete.user?.avatar_url ?? undefined;
              const verified = athlete.user?.is_verified;
              return (
                <div
                  key={athlete.id}
                  className="card overflow-hidden cursor-pointer"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateY(0)' : 'translateY(24px)',
                    transition: `opacity 0.6s ease ${idx * 0.1}s, transform 0.6s cubic-bezier(0.19,1,0.22,1) ${idx * 0.1}s`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                  }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={image} alt={name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,26,43,0.75) 0%, transparent 55%)' }} />
                    {/* Score chip */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#2F80ED', color: 'white' }}>
                      {score} AI
                    </div>
                    {verified && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                        style={{ backgroundColor: 'rgba(31,181,122,0.15)', color: '#1FB57A', border: '1px solid rgba(31,181,122,0.3)' }}>
                        ✓ Verified
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4">
                      <p className="font-bold text-white text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{name}</p>
                      <p className="text-xs text-white/70">{athlete.position ?? athlete.position_primary}</p>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="h-1.5 bg-rim rounded-full overflow-hidden mb-4">
                      <div className="h-full rounded-full" style={{ width: `${athlete.visibility_score}%`, backgroundColor: '#B8F135' }} />
                    </div>
                    <Link
                      to={`/athletes/${athlete.id}`}
                      className="text-sm font-bold flex items-center gap-1 text-azure hover:underline"
                    >
                      View Profile <ChevronRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── AI Career Coach CTA ────────────────────────────────────────────────── */
function AiCareerCoachCta() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pairs: [React.RefObject<HTMLDivElement>, string][] = [
      [leftRef,  'translateX(-32px)'],
      [rightRef, 'translateX(32px)'],
    ];
    pairs.forEach(([r, tx]) => {
      const el = r.current;
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = tx;
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          el.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.19,1,0.22,1)';
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
          obs.disconnect();
        }
      }, { threshold: 0.2 });
      obs.observe(el);
    });
  }, []);

  return (
    <section className="bg-page py-20 lg:py-28 border-t border-rim">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div ref={leftRef}>
            <p className="text-xs font-bold text-azure uppercase tracking-widest mb-3">AI Coach</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-ink mb-5">
              Your AI Career Coach
            </h2>
            <p className="text-slate text-lg mb-8 leading-relaxed">
              Get personalized training recommendations, career trajectory forecasts, and real-time scout-visibility insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold"
                style={{ backgroundColor: '#2F80ED', color: 'white' }}
              >
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold border border-rim text-slate hover:text-ink hover:border-azure/30 transition-colors"
              >
                <LogIn size={18} /> Sign In
              </Link>
            </div>
          </div>

          <div
            ref={rightRef}
            className="card p-6"
            style={{ borderLeft: '4px solid #2F80ED' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(47,128,237,0.12)' }}>
                <Zap size={16} className="text-azure" />
              </div>
              <span className="text-sm font-bold text-azure">AceAiX AI Coach</span>
            </div>
            <p className="text-ink text-sm leading-relaxed mb-4">
              "Based on your last 5 matches, your Sprint Speed improved <strong>12%</strong>. Here's your personalized training plan…"
            </p>
            <div className="space-y-2">
              {[
                'Increase explosive interval intensity to capitalize on momentum',
                'Target agility drills to maintain acceleration gains',
                'Scout visibility score can improve by 8 pts with 2 more highlights',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-slate">
                  <div className="w-1.5 h-1.5 rounded-full bg-azure flex-shrink-0 mt-1.5" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Sign Up CTA Banner ─────────────────────────────────────────────────── */
function CtaBanner() {
  return (
    <section
      className="py-20 lg:py-24 text-center"
      style={{ background: 'linear-gradient(135deg, #0C1A2B 0%, #16273B 100%)' }}
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/8 mb-6"
          style={{ backdropFilter: 'blur(8px)' }}>
          <Zap size={11} className="text-volt" fill="#B8F135" />
          <span className="text-xs font-semibold text-white/70">Free to join</span>
        </div>
        <h2
          className="text-4xl lg:text-5xl font-bold text-white mb-4"
          style={{ fontFamily: "'Clash Display', sans-serif" }}
        >
          Ready to get discovered?
        </h2>
        <p className="text-white/60 text-lg mb-10">
          Join over 1,200 athletes already using AceAiX to reach scouts and clubs across the GCC.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/auth/register"
            className="px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
            style={{ backgroundColor: '#B8F135', color: '#0C1A2B' }}
          >
            Create Free Profile <ArrowRight size={18} />
          </Link>
          <Link
            to="/auth/login"
            className="px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-white/10"
            style={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <LogIn size={18} /> Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: '#060E1E' }} className="text-white border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-14">
        <div className="flex items-center gap-3 mb-10 pb-10 border-b border-white/10">
          <div className="w-8 h-8 bg-azure rounded-lg flex items-center justify-center">
            <Zap size={15} className="text-white" fill="white" />
          </div>
          <span className="text-xl font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            AceAi<span style={{ color: '#2F80ED' }}>X</span>
          </span>
          <p className="ml-4 text-sm text-white/40 border-l border-white/10 pl-4 hidden md:block">
            The intelligent platform for athlete talent discovery across the UAE &amp; GCC.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {[
            { heading: 'Platform', links: [['Feed', '/feed'], ['Discover', '/discover'], ['Athletes', '/athletes'], ['Plans', '/plans']] },
            { heading: 'For Athletes', links: [['Your Profile', '/athlete/profile'], ['Analytics', '/athlete/analytics'], ['Medical Records', '/athlete/medical'], ['Network', '/athlete/network']] },
            { heading: 'For Scouts', links: [['Scout Portal', '/recruiter/dashboard'], ['Search Talent', '/recruiter/search'], ['Insights', '/recruiter/analytics']] },
            { heading: 'Company', links: [['About', '/about'], ['Privacy', '/'], ['Terms', '/']] },
          ].map(col => (
            <div key={col.heading}>
              <h3 className="font-bold mb-4 text-sm text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>{col.heading}</h3>
              <ul className="space-y-2.5">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-xs text-white/50 hover:text-white transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 text-xs text-white/40">
          <p>© 2026 AceAiX Technologies. All rights reserved.</p>
          <span className="px-3 py-1.5 rounded-full border border-white/15 text-white/50" title="Arabic localization is planned.">
            EN / عر
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <TrustTicker />
      <PillarCards />
      <RisingTalentRow />
      <AiCareerCoachCta />
      <CtaBanner />
      <Footer />
    </div>
  );
}

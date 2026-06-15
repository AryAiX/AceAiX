import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, MapPin, Calendar, Building2, ChevronLeft, Share2,
  MoreHorizontal, UserPlus, UserCheck, MessageSquare, X,
  Send, Loader2, ShieldCheck, Trophy, Zap, Target, Clock,
  CheckCircle2, Heart, Globe, ChevronDown,
  ChevronUp, ExternalLink, Shirt, Star,
} from 'lucide-react';

import PublicHeader from '../components/PublicHeader';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getOrganizationById, listOrganizations } from '../api/organizations';
import { listAthletes } from '../api/athletes';
import { listOpportunities } from '../api/opportunities';

const DEFAULT_COVER = 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1400';

function initialsOf(name?: string | null) {
  return (name ?? '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '–';
}
function ageFrom(birth?: string | null) {
  if (!birth) return 0;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}
function fmtDeadline(d?: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function staffAvatar(name: string) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`;
}

/* ─── Helpers ─── */
function useCountUp(target: number) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current || started.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect(); started.current = true;
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / 1200, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return { val, ref };
}

const POSITION_COLORS: Record<string, string> = {
  GK: '#F5A623', CB: '#2F80ED', LB: '#2F80ED', RB: '#2F80ED',
  CDM: '#1FB57A', CM: '#1FB57A', CAM: '#B8F135', LW: '#B8F135',
  RW: '#B8F135', ST: '#EF5350', CF: '#EF5350',
};

const TABS = ['Overview', 'Squad', 'Open Trials', 'Honours', 'Statistics', 'Media'] as const;
type Tab = typeof TABS[number];

const TROPHY_ICONS: Record<string, string> = {
  league: '🏆', cup: '🥇', supercup: '🌟', continental: '⚡', other: '🎖',
};

/* ─── Message Modal ─── */
function ContactModal({ name, onClose, isAuth }: { name: string; onClose: () => void; isAuth: boolean }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card-glass p-6" style={{ animation: 'slideUp 0.2s ease-out', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-display font-bold text-white">Contact {name}</h3><p className="text-xs text-muted mt-0.5">General enquiry or partnership</p></div>
          <button onClick={onClose} className="text-muted hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"><X size={16} /></button>
        </div>
        {!isAuth ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-300 mb-4">Sign in to contact {name}.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/auth/login" onClick={onClose} className="btn-primary px-5 py-2.5 text-sm">Sign In</Link>
              <Link to="/auth/register" onClick={onClose} className="btn-outline px-5 py-2.5 text-sm">Register</Link>
            </div>
          </div>
        ) : sent ? (
          <div className="text-center py-6">
            <CheckCircle2 size={36} className="text-emerald mx-auto mb-3" />
            <p className="font-semibold text-white">Message sent!</p>
            <p className="text-xs text-muted mt-1">The club's representative will get back to you.</p>
          </div>
        ) : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Your message…" rows={4} className="input-dark resize-none mb-4 text-sm" autoFocus />
            <button onClick={() => setSent(true)} disabled={!text.trim()}
              className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Send size={14} /> Send Message
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ClubPublicProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: orgRow, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => getOrganizationById(id),
    enabled: !!id,
  });
  const { data: allClubs = [] } = useQuery({
    queryKey: ['organizations', { type: 'club' }],
    queryFn: () => listOrganizations({ type: 'club' }),
  });
  const { data: allAthletes = [] } = useQuery({
    queryKey: ['athletes', 'all'],
    queryFn: () => listAthletes({}),
  });
  const { data: trials = [] } = useQuery({
    queryKey: ['opportunities', { type: 'trial' }],
    queryFn: () => listOpportunities({ type: 'trial' }),
  });

  const club = useMemo(() => {
    const profile = (orgRow?.profile ?? {}) as {
      trophies?: Array<Record<string, unknown>>;
      currentSeason?: Array<Record<string, unknown>>;
      coachingStaff?: Array<Record<string, unknown>>;
    };
    const squad = allAthletes
      .filter(a => a.current_club_id === orgRow?.id)
      .map(a => ({
        id: a.id,
        name: a.user?.full_name ?? 'Unknown',
        position: a.position ?? a.position_primary ?? '—',
        number: '',
        nationality: a.nationality ?? '—',
        age: ageFrom(a.birth_date),
        image: a.user?.avatar_url ?? '',
        isVerified: a.user?.is_verified ?? false,
        score: a.visibility_score ?? 0,
      }));
    const openTrials = trials
      .filter(t => t.organization_id === orgRow?.id)
      .map(t => ({
        id: t.id,
        position: t.title ?? t.position ?? 'Trial',
        ageRange: '—',
        type: (t.type === 'transfer' || t.type === 'loan' ? t.type : 'trial') as 'trial' | 'transfer' | 'loan',
        deadline: fmtDeadline(t.application_deadline),
        description: t.description ?? '',
        requirements: [] as string[],
        applicants: 0,
      }));
    const coachingStaff = (profile.coachingStaff ?? []).map(s => {
      const name = String(s.name ?? '—');
      return { name, role: String(s.role ?? '—'), image: s.image ? String(s.image) : staffAvatar(name), isVerified: Boolean(s.isVerified ?? false) };
    });
    return {
      id: orgRow?.id ?? '',
      name: orgRow?.name ?? 'Unknown Club',
      shortName: orgRow?.short_name ?? orgRow?.name ?? '—',
      initials: orgRow?.initials ?? initialsOf(orgRow?.name),
      league: orgRow?.league ?? '—',
      country: orgRow?.country ?? '—',
      city: orgRow?.city ?? '—',
      founded: orgRow?.founded_year ?? '—',
      stadium: orgRow?.stadium ?? '—',
      stadiumCapacity: orgRow?.stadium_capacity ?? 0,
      primaryColor: orgRow?.primary_color ?? '#2F80ED',
      secondaryColor: orgRow?.secondary_color ?? '#0C1A2B',
      coverImage: orgRow?.cover_url ?? DEFAULT_COVER,
      isVerified: orgRow?.is_verified ?? false,
      followersCount: orgRow?.followers_count ?? 0,
      playerCount: squad.length,
      staffCount: coachingStaff.length,
      description: orgRow?.description ?? 'No description provided yet.',
      values: orgRow?.values ?? [],
      website: orgRow?.website ?? '',
      trophies: (profile.trophies ?? []).map(t => ({
        title: String(t.title ?? '—'),
        year: String(t.year ?? ''),
        type: (t.type as 'league' | 'cup' | 'supercup' | 'continental' | 'other') ?? 'league',
        count: typeof t.count === 'number' ? t.count : undefined,
      })),
      currentSeason: (profile.currentSeason ?? []).map(s => ({
        label: String(s.label ?? '—'),
        value: (s.value as string | number) ?? '—',
        rank: s.rank ? String(s.rank) : undefined,
      })),
      squad,
      openTrials,
      activity: [] as Array<{ id: string; text: string; time: string; reactions: number; image?: string }>,
      coachingStaff,
    };
  }, [orgRow, allAthletes, trials]);

  const similarClubs = useMemo(
    () => allClubs
      .filter(c => c.id !== (orgRow?.id ?? ''))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        league: c.league ?? '—',
        city: c.city ?? '—',
        color: c.primary_color ?? '#2F80ED',
        initials: c.initials ?? initialsOf(c.name),
        isVerified: c.is_verified,
      })),
    [allClubs, orgRow],
  );

  const leaguePosition = useMemo(() => {
    const pos = club.currentSeason.find(s => /position/i.test(s.label))?.value;
    return pos ? `${pos} · ${club.league}` : club.league;
  }, [club.currentSeason, club.league]);

  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [shared, setShared] = useState(false);
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const { val: followerDisplay, ref: followerRef } = useCountUp(followerCount);
  const { val: playerDisplay, ref: playerRef } = useCountUp(club.playerCount);

  async function shareClub() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: club.name, url }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    }
    setShared(true);
  }

  // Parallax
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const h = () => { el.style.transform = `translateY(${window.scrollY * 0.12}px)`; };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, [orgRow]);

  // Sticky bar
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setShowStickyBar(!e.isIntersecting), { threshold: 0 });
    if (introRef.current) obs.observe(introRef.current);
    return () => obs.disconnect();
  }, [orgRow]);

  // Close more menu
  useEffect(() => {
    if (!moreMenuOpen) return;
    const h = (e: MouseEvent) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreMenuOpen]);

  useEffect(() => { setFollowerCount(club.followersCount); }, [club.followersCount]);

  // Load follow state
  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      const { data } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle();
      setIsFollowing(!!data);
    }
    load();
  }, [id, user]);

  async function toggleFollow() {
    if (!user) { navigate('/auth/login'); return; }
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
      setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true); setFollowerCount(c => c + 1);
    }
    setFollowLoading(false);
  }

  const descParagraphs = club.description.split('\n\n');
  const positions = ['All', ...Array.from(new Set(club.squad.map(p => p.position)))];
  const filteredSquad = positionFilter === 'All' ? club.squad : club.squad.filter(p => p.position === positionFilter);

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className="flex items-center justify-center py-40">
          <Loader2 size={28} className="text-azure animate-spin" />
        </div>
      </div>
    );
  }

  if (!orgRow) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className="max-w-md mx-auto text-center py-40 px-4">
          <Building2 size={40} className="text-muted mx-auto mb-4" />
          <h1 className="font-display font-bold text-white text-xl mb-2">Club not found</h1>
          <p className="text-sm text-muted mb-6">This organization doesn't exist or is no longer available.</p>
          <Link to="/clubs" className="btn-outline px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <ChevronLeft size={14} /> Browse clubs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <PublicHeader />

      {/* Sticky mini-bar */}
      {showStickyBar && (
        <div className="fixed top-14 left-0 right-0 z-40 glass-dark border-b border-white/[0.08] px-4 lg:px-8"
          style={{ animation: 'slideUp 0.25s cubic-bezier(0.19,1,0.22,1)' }}>
          <div className="max-w-6xl mx-auto flex items-center gap-4 py-2.5">
            <div className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: `${club.primaryColor}18`, borderColor: `${club.primaryColor}30`, color: club.primaryColor }}>
              {club.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm truncate">{club.name}</p>
              <p className="text-xs text-muted truncate hidden sm:block">{club.league} · {club.city}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={toggleFollow} disabled={followLoading}
                className={`px-4 py-1.5 text-xs rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white' : 'btn-outline'}`}>
                {followLoading ? <Loader2 size={11} className="animate-spin" /> : isFollowing ? <><UserCheck size={11} /> Following</> : <><UserPlus size={11} /> Follow</>}
              </button>
              <button onClick={() => setContactOpen(true)} className="btn-primary px-4 py-1.5 text-xs rounded-lg font-semibold inline-flex items-center gap-1.5">
                <MessageSquare size={11} /> Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover banner */}
      <div ref={introRef} className="relative overflow-hidden" style={{ height: '40vh', minHeight: 280 }}>
        <div ref={bannerRef} className="absolute inset-0">
          <img src={club.coverImage} alt="" className="w-full h-[120%] object-cover object-center" />
          <div className="absolute inset-0 hero-overlay-bottom" />
          <div className="absolute inset-0" style={{ background: 'rgba(12,26,43,0.5)' }} />
        </div>
        <Link to="/clubs" className="absolute top-20 left-4 lg:left-8 z-10 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={16} /> Clubs
        </Link>
      </div>

      {/* Club intro card */}
      <div className="bg-page border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="relative pb-5">
            {/* Club logo */}
            <div className="absolute -top-12 left-0 z-10" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
              <div className="w-24 h-24 rounded-2xl border-4 border-[#0C1A2B] flex items-center justify-center font-display font-bold text-2xl"
                style={{ background: `linear-gradient(135deg, ${club.primaryColor}25, ${club.primaryColor}10)`, borderTopColor: `${club.primaryColor}`, boxShadow: `0 8px 32px ${club.primaryColor}30`, color: club.primaryColor, borderColor: club.primaryColor }}>
                {club.initials}
              </div>
              {club.isVerified && (
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald border-2 border-[#0C1A2B] flex items-center justify-center">
                  <ShieldCheck size={12} className="text-white" />
                </div>
              )}
            </div>

            <div className="pl-28 pt-4" style={{ animation: 'fadeIn 0.55s ease 0.15s both' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-white text-2xl lg:text-3xl">{club.name}</h1>
                {club.isVerified && <VerifiedBadge animated size="sm" />}
              </div>
              <p className="text-sm text-muted mt-1">{club.league}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted"><MapPin size={11} /> {club.city}, {club.country}</span>
                <span className="flex items-center gap-1 text-xs text-muted"><Calendar size={11} /> Founded {club.founded}</span>
                <span className="flex items-center gap-1 text-xs text-muted"><Building2 size={11} /> {club.stadium} ({club.stadiumCapacity.toLocaleString()})</span>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-azure">
                  <Users size={12} />
                  <span ref={followerRef as any} className="tabular">{followerDisplay.toLocaleString()}</span>
                  <span className="text-muted font-normal">followers</span>
                </span>
                <span className="text-white/10">·</span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <span ref={playerRef as any} className="font-semibold text-white tabular">{playerDisplay}</span> squad members
                </span>
                <span className="text-white/10 hidden sm:inline">·</span>
                <span className="text-xs text-muted hidden sm:inline">{club.staffCount} staff</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 mt-4 pl-28 items-center" style={{ animation: 'fadeIn 0.5s ease 0.3s both' }}>
              <button onClick={toggleFollow} disabled={followLoading}
                className={`px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold transition-all ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white hover:border-coral/40 hover:text-coral' : 'btn-outline'}`}>
                {followLoading ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </button>
              <button onClick={() => setContactOpen(true)}
                className="btn-primary px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold">
                <MessageSquare size={14} /> Contact
              </button>
              <button onClick={() => setShortlisted(s => !s)}
                className={`px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold transition-all ${shortlisted ? 'bg-volt/10 border border-volt/25 text-volt' : 'btn-ghost'}`}>
                <Star size={14} className={shortlisted ? 'fill-volt text-volt' : ''} /> {shortlisted ? 'Shortlisted' : 'Shortlist'}
              </button>
              <button onClick={shareClub} className="btn-ghost px-4 py-2 inline-flex items-center gap-2 text-sm">
                <Share2 size={14} /> {shared ? 'Copied' : 'Share'}
              </button>
              <div ref={moreMenuRef} className="relative ml-auto">
                <button onClick={() => setMoreMenuOpen(o => !o)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${moreMenuOpen ? 'bg-white/10 text-white' : 'btn-ghost text-muted hover:text-white'}`}>
                  <MoreHorizontal size={16} />
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 top-11 w-44 card-glass border border-white/10 rounded-2xl overflow-hidden z-20"
                    style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.7)', animation: 'fadeIn 0.15s ease' }}>
                    <a href={`https://${club.website}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/[0.06] transition-colors">
                      <Globe size={13} className="text-muted" /> Visit Website
                    </a>
                    <Link to="/auth/register"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]">
                      <ExternalLink size={13} className="text-muted" /> Apply for Trial
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-0 border-t border-white/[0.06] overflow-x-auto scrollbar-hidden">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex-shrink-0 ${
                  activeTab === tab
                    ? 'border-azure text-white'
                    : 'border-transparent text-muted hover:text-white hover:border-white/20'
                }`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-20 lg:pb-10">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ─ OVERVIEW ─ */}
            {activeTab === 'Overview' && (
              <>
                {/* About */}
                <div className="card-glass p-5">
                  <h2 className="font-display font-bold text-white text-base mb-3">About {club.shortName}</h2>
                  {descParagraphs.slice(0, aboutExpanded ? undefined : 1).map((p, i) => (
                    <p key={i} className="text-sm text-slate-300 leading-relaxed mb-2">{p}</p>
                  ))}
                  {descParagraphs.length > 1 && (
                    <button onClick={() => setAboutExpanded(e => !e)}
                      className="text-xs font-semibold text-azure hover:text-azure/80 transition-colors">
                      {aboutExpanded ? 'Show less' : '…show more'}
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                    {club.values.map(v => (
                      <span key={v} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-muted font-medium">{v}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.06] text-xs text-muted flex-wrap">
                    <span className="flex items-center gap-1.5"><Globe size={11} /> {club.website}</span>
                    <span className="flex items-center gap-1.5"><Building2 size={11} /> {club.stadium}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={11} /> Est. {club.founded}</span>
                  </div>
                </div>

                {/* Activity */}
                <div className="card-glass p-5">
                  <h2 className="font-display font-bold text-white text-base mb-4">Latest Updates</h2>
                  {club.activity.length === 0 && (
                    <p className="text-sm text-muted py-2">No updates yet.</p>
                  )}
                  <div className="space-y-4">
                    {club.activity.map(post => (
                      <div key={post.id} className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        {post.image && <img src={post.image} alt="" className="w-full h-40 object-cover" />}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold"
                              style={{ background: `${club.primaryColor}18`, color: club.primaryColor, border: `1px solid ${club.primaryColor}30` }}>
                              {club.initials}
                            </div>
                            <span className="text-xs font-semibold text-white">{club.shortName}</span>
                            <span className="text-[10px] text-muted">· {post.time}</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{post.text}</p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                            <span className="flex items-center gap-1"><Heart size={11} /> {post.reactions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coaching Staff */}
                <div className="card-glass p-5">
                  <h2 className="font-display font-bold text-white text-base mb-4">Coaching Staff</h2>
                  {club.coachingStaff.length === 0 && (
                    <p className="text-sm text-muted py-2">No staff listed yet.</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {club.coachingStaff.map(staff => (
                      <div key={staff.name} className="text-center">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 mx-auto mb-2">
                          <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                          {staff.isVerified && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald border border-[#0C1A2B] flex items-center justify-center">
                              <ShieldCheck size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-white truncate">{staff.name}</p>
                        <p className="text-[10px] text-muted truncate">{staff.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ─ SQUAD ─ */}
            {activeTab === 'Squad' && (
              <div className="card-glass p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-white text-base">Current Squad</h2>
                  <div className="flex gap-1 flex-wrap">
                    {positions.map(pos => (
                      <button key={pos} onClick={() => setPositionFilter(pos)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${positionFilter === pos ? 'bg-azure/20 text-azure border border-azure/30' : 'bg-white/[0.04] text-muted border border-white/10 hover:border-white/20 hover:text-white'}`}>
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredSquad.map(player => (
                    <Link key={player.id} to={`/athletes/${player.id}`}
                      className="flex items-center gap-3 border border-white/[0.06] rounded-xl px-4 py-3 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 transition-all group">
                      <div className="relative flex-shrink-0">
                        <img src={player.image} alt={player.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                        {player.isVerified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald border-2 border-[#0C1A2B] flex items-center justify-center">
                            <ShieldCheck size={8} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0"
                        style={{ background: `${POSITION_COLORS[player.position] ?? '#2F80ED'}18`, color: POSITION_COLORS[player.position] ?? '#2F80ED', border: `1px solid ${POSITION_COLORS[player.position] ?? '#2F80ED'}30` }}>
                        {player.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-azure transition-colors truncate">{player.name}</p>
                        <p className="text-xs text-muted">{player.position} · {player.nationality} · Age {player.age}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="font-display font-bold text-volt text-sm tabular">{player.score}</span>
                        <p className="text-[10px] text-muted">AI</p>
                      </div>
                    </Link>
                  ))}
                </div>
                {filteredSquad.length === 0 && (
                  <p className="text-center text-muted text-sm py-8">No players found for this position.</p>
                )}
              </div>
            )}

            {/* ─ OPEN TRIALS ─ */}
            {activeTab === 'Open Trials' && (
              <div className="space-y-4">
                <div className="card-glass p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                    <h2 className="font-display font-bold text-white text-base">Open Trials & Transfer Targets</h2>
                  </div>
                  <p className="text-xs text-muted mb-4">{club.openTrials.length} position{club.openTrials.length !== 1 ? 's' : ''} available · Applications open</p>
                  <div className="space-y-4">
                    {club.openTrials.map(trial => {
                      const isOpen = expandedTrial === trial.id;
                      const typeColors = { trial: 'bg-volt/10 border-volt/25 text-volt', transfer: 'bg-azure/10 border-azure/25 text-azure', loan: 'bg-amber/10 border-amber/25 text-amber' };
                      return (
                        <div key={trial.id} className="border border-white/[0.08] rounded-2xl overflow-hidden">
                          <div className="p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                            onClick={() => setExpandedTrial(isOpen ? null : trial.id)}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-semibold text-white">{trial.position}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColors[trial.type]} capitalize`}>{trial.type}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted">
                                  <span className="flex items-center gap-1"><Target size={10} /> Age {trial.ageRange}</span>
                                  <span className="flex items-center gap-1"><Clock size={10} /> Deadline {trial.deadline}</span>
                                  <span className="flex items-center gap-1"><Users size={10} /> {trial.applicants} applied</span>
                                </div>
                              </div>
                              {isOpen ? <ChevronUp size={16} className="text-muted flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-muted flex-shrink-0 mt-1" />}
                            </div>
                          </div>
                          {isOpen && (
                            <div className="px-4 pb-4 border-t border-white/[0.06]">
                              <p className="text-sm text-slate-400 leading-relaxed mt-3 mb-4">{trial.description}</p>
                              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Requirements</p>
                              <ul className="space-y-1.5 mb-4">
                                {trial.requirements.map((req, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                    <CheckCircle2 size={12} className="text-emerald flex-shrink-0 mt-0.5" /> {req}
                                  </li>
                                ))}
                              </ul>
                              <Link to="/auth/register"
                                className="btn-volt px-5 py-2.5 text-sm font-bold rounded-xl inline-flex items-center gap-2">
                                <Zap size={13} className="text-ink" /> Apply Now
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─ HONOURS ─ */}
            {activeTab === 'Honours' && (
              <div className="card-glass p-5">
                <h2 className="font-display font-bold text-white text-base mb-4">Trophy Cabinet</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {club.trophies.map((trophy, i) => (
                    <div key={i} className="flex items-center gap-3 border border-volt/20 rounded-xl px-4 py-3 bg-volt/[0.05]">
                      <span className="text-2xl">{TROPHY_ICONS[trophy.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{trophy.title}</p>
                        <p className="text-xs text-muted">{trophy.year}{trophy.count ? ` · ${trophy.count}× won` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─ STATISTICS ─ */}
            {activeTab === 'Statistics' && (
              <div className="card-glass p-5">
                <h2 className="font-display font-bold text-white text-base mb-1">Current Season</h2>
                <p className="text-xs text-muted mb-4">{club.league} · 2024–25</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {club.currentSeason.map(stat => (
                    <div key={stat.label} className="stat-tile text-center">
                      <div className="text-2xl font-display font-bold text-white tabular">{stat.value}</div>
                      <div className="text-xs text-muted mt-1">{stat.label}</div>
                      {stat.rank && <div className="text-[10px] text-azure mt-0.5">{stat.rank}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─ MEDIA ─ */}
            {activeTab === 'Media' && (
              <div className="card-glass p-5">
                <h2 className="font-display font-bold text-white text-base mb-4">Media Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg?auto=compress&cs=tinysrgb&w=400',
                    'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=400',
                    'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400',
                    'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=400',
                    'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=400',
                    'https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&w=400',
                  ].map((src, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24 space-y-4">
            {/* Quick stats */}
            <div className="card-glass p-4">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Club At a Glance</p>
              <div className="space-y-3">
                {[
                  { label: 'League Position', value: leaguePosition, icon: Trophy },
                  { label: 'Squad Size', value: `${club.playerCount} players`, icon: Shirt },
                  { label: 'Stadium', value: club.stadium, icon: Building2 },
                  { label: 'Founded', value: String(club.founded), icon: Calendar },
                  { label: 'Open Trials', value: `${club.openTrials.length} positions`, icon: Target },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${club.primaryColor}15` }}>
                      <item.icon size={13} style={{ color: club.primaryColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted">{item.label}</p>
                      <p className="text-xs font-semibold text-white truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar clubs */}
            <div className="card-glass p-4">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Similar Clubs</p>
              {similarClubs.length === 0 && (
                <p className="text-xs text-muted">No similar clubs yet.</p>
              )}
              <div className="space-y-4">
                {similarClubs.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${c.color}18`, borderColor: `${c.color}30`, color: c.color, border: `1px solid ${c.color}30` }}>
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/clubs/${c.id}`} className="text-sm font-semibold text-white hover:text-azure transition-colors block truncate">{c.name}</Link>
                      <p className="text-xs text-muted truncate">{c.league} · {c.city}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {c.isVerified && <ShieldCheck size={12} className="text-emerald" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="card-glass p-4" style={{ background: `linear-gradient(135deg, ${club.primaryColor}12, rgba(22,39,59,0.8))` }}>
              <Zap size={18} className="text-volt mb-2" />
              <p className="text-sm font-bold text-white mb-1">Request Player Report</p>
              <p className="text-xs text-muted mb-3">Get full AI-verified profiles of players matching your squad needs.</p>
              <Link to="/auth/register" className="btn-volt w-full py-2 text-xs font-bold rounded-xl inline-flex items-center justify-center">Get Started</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 glass-dark border-t border-white/[0.08] px-4 py-3 flex gap-2.5">
        <button onClick={toggleFollow} disabled={followLoading}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white' : 'btn-outline'}`}>
          {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
        </button>
        <button onClick={() => setContactOpen(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 btn-primary">
          <MessageSquare size={13} /> Contact
        </button>
      </div>

      {contactOpen && <ContactModal name={club.name} onClose={() => setContactOpen(false)} isAuth={!!user} />}
    </div>
  );
}

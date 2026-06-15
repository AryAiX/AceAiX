import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus, UserCheck, MessageSquare, Share2, MoreHorizontal,
  MapPin, Loader2, Users, X, Send, ShieldCheck, Ban,
  UserMinus, AlertTriangle, Zap, ChevronLeft, Trophy, Star,
  BadgeCheck, Plus, Quote, Languages, Activity, CheckCircle2,
  Briefcase, GraduationCap,
} from 'lucide-react';

import PublicHeader from '../components/PublicHeader';
import AuroraBackground from '../components/ui/AuroraBackground';
import MagneticButton from '../components/ui/MagneticButton';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import ScoreRing from '../components/ui/ScoreRing';
import StatTile from '../components/ui/StatTile';
import SectionCard from '../components/profile/SectionCard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getCoachById, listCoaches } from '../api/coaches';

const DEFAULT_COVER = 'https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&w=1400';

function initialsOf(name?: string | null) {
  return (name ?? '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '–';
}

/* ─── Helpers ─── */
function useCountUp(target: number, duration = 1200) {
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
        const p = Math.min((Date.now() - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return { val, ref };
}

const ATTR_COLORS: Record<string, string> = {
  'Tactical Analysis': '#B8F135',
  'Man Management': '#2F80ED',
  'Set Pieces': '#1FB57A',
  'Player Development': '#F5A623',
  'Fitness & Conditioning': '#7C8DA6',
  'Video Analysis': '#EF5350',
};

const LICENSE_TIERS: Record<string, { color: string; bg: string }> = {
  'UEFA Pro': { color: '#B8F135', bg: 'bg-volt/10 border-volt/25' },
  'AFC': { color: '#2F80ED', bg: 'bg-azure/10 border-azure/25' },
  default: { color: '#1FB57A', bg: 'bg-emerald/10 border-emerald/25' },
};

function licenseStyle(title: string) {
  if (title.includes('UEFA Pro')) return LICENSE_TIERS['UEFA Pro'];
  if (title.includes('AFC')) return LICENSE_TIERS['AFC'];
  return LICENSE_TIERS.default;
}

/* ─── Block Modal ─── */
function BlockModal({ name, isBlocked, onConfirm, onCancel, loading }: {
  name: string; isBlocked: boolean; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm card-glass p-6 text-center" style={{ animation: 'slideUp 0.2s ease-out', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <AlertTriangle size={24} className="text-coral mx-auto mb-3" />
        <h3 className="font-display font-bold text-white mb-1">{isBlocked ? `Unblock ${name}?` : `Block ${name}?`}</h3>
        <p className="text-sm text-muted mb-6">{isBlocked ? `${name} will be able to see your profile again.` : `${name} won't be able to contact you.`}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-ghost py-2.5 text-sm rounded-xl">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 text-sm rounded-xl font-semibold inline-flex items-center justify-center gap-2 bg-coral/15 border border-coral/30 text-coral hover:bg-coral/25 disabled:opacity-50 transition-all">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
            {isBlocked ? 'Unblock' : 'Block'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Message Modal ─── */
function MessageModal({ name, onClose, onSend, sending, isAuth }: {
  name: string; onClose: () => void; onSend: (t: string) => Promise<void>; sending: boolean; isAuth: boolean;
}) {
  const [text, setText] = useState('');
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
          <div><h3 className="font-display font-bold text-white">Send Message</h3><p className="text-xs text-muted mt-0.5">to {name}</p></div>
          <button onClick={onClose} className="text-muted hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"><X size={16} /></button>
        </div>
        {!isAuth ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-300 mb-4">Sign in to message {name.split(' ')[0]}.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/auth/login" onClick={onClose} className="btn-primary px-5 py-2.5 text-sm">Sign In</Link>
              <Link to="/auth/register" onClick={onClose} className="btn-outline px-5 py-2.5 text-sm">Register</Link>
            </div>
          </div>
        ) : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={`Write a message…`} rows={4} className="input-dark resize-none mb-4 text-sm" autoFocus />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{text.length}/500</span>
              <button onClick={() => text.trim() && onSend(text)} disabled={!text.trim() || sending}
                className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Inline section components ─── */

function WinRateBar({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses;
  if (total === 0) return null;
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex rounded-full overflow-hidden h-2">
        <div style={{ width: `${wPct}%`, background: '#1FB57A', transition: 'width 1s ease' }} />
        <div style={{ width: `${dPct}%`, background: '#F5A623', transition: 'width 1s ease 0.1s' }} />
        <div style={{ width: `${lPct}%`, background: '#EF5350', transition: 'width 1s ease 0.2s' }} />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald inline-block" /> {wins}W</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber inline-block" /> {draws}D</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-coral inline-block" /> {losses}L</span>
      </div>
    </div>
  );
}

function VerificationStripCoach() {
  const items = [
    { label: 'License Verified', sub: 'UEFA Pro · AFC', color: 'emerald' as const, Icon: BadgeCheck },
    { label: 'Identity Verified', sub: 'Passport · FPF ID', color: 'azure' as const, Icon: ShieldCheck },
    { label: 'Background Check', sub: 'AceAiX Cleared', color: 'emerald' as const, Icon: CheckCircle2 },
  ];
  const COLORS = {
    emerald: { bg: 'bg-emerald/10 border-emerald/25', icon: 'text-emerald', dot: 'bg-emerald', label: 'text-emerald' },
    azure:   { bg: 'bg-azure/10 border-azure/25',     icon: 'text-azure',   dot: 'bg-azure',   label: 'text-azure'   },
  };
  return (
    <div className="card-glass px-5 py-4" style={{ borderColor: 'rgba(31,181,122,0.2)', boxShadow: '0 0 32px rgba(31,181,122,0.06)' }}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={14} className="text-emerald" />
        <span className="text-xs font-bold text-emerald uppercase tracking-widest">AceAiX Verified Coach</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const c = COLORS[item.color];
          return (
            <div key={item.label} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${c.bg}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <item.Icon size={16} className={c.icon} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold ${c.label}`}>{item.label}</p>
                <p className="text-[10px] text-muted truncate mt-0.5">{item.sub}</p>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto ${c.dot}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CoachPublicProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: coachRow, isLoading: coachLoading } = useQuery({
    queryKey: ['coach', id],
    queryFn: () => getCoachById(id),
    enabled: !!id,
  });
  const { data: coachRows = [] } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => listCoaches(),
  });

  const profileUserId = coachRow?.user_id ?? '';

  const coach = useMemo(() => {
    const u = coachRow?.user;
    const spells = ((coachRow?.coaching_spells ?? []) as Array<Record<string, unknown>>).map(s => ({
      club: String(s.club ?? '—'),
      clubInitials: initialsOf(String(s.club ?? '')),
      clubColor: '#2F80ED',
      role: String(s.role ?? 'Coach'),
      from: String(s.from ?? '—'),
      to: String(s.to ?? '—'),
      matches: Number(s.matches ?? 0),
      wins: Number(s.wins ?? 0),
      draws: Number(s.draws ?? 0),
      losses: Number(s.losses ?? 0),
      trophies: (Array.isArray(s.trophies) ? s.trophies : []) as string[],
      description: String(s.description ?? ''),
    }));
    return {
      id: coachRow?.id ?? '',
      name: u?.full_name ?? 'Unknown Coach',
      role: spells[0]?.role ?? 'Head Coach',
      specialty: coachRow?.specialty ?? '—',
      currentClub: coachRow?.current_club ?? '—',
      currentClubInitials: initialsOf(coachRow?.current_club),
      currentClubColor: '#2F80ED',
      country: coachRow?.country ?? u?.country ?? '—',
      nationality: coachRow?.nationality ?? '—',
      yearsExperience: coachRow?.years_experience ?? 0,
      score: coachRow?.score ?? 0,
      winRate: Math.round(coachRow?.win_rate ?? 0),
      totalTrophies: coachRow?.total_trophies ?? 0,
      totalMatches: coachRow?.total_matches ?? 0,
      isVerified: u?.is_verified ?? false,
      isOpenToOpportunities: coachRow?.is_open_to_opportunities ?? false,
      image: u?.avatar_url ?? '',
      coverImage: coachRow?.cover_url ?? DEFAULT_COVER,
      followersCount: 0,
      connectionsCount: 0,
      philosophy: coachRow?.philosophy ?? 'No coaching philosophy provided yet.',
      coachingSpells: spells,
      licenses: ((coachRow?.licenses ?? []) as Array<Record<string, unknown>>).map(l => ({
        title: String(l.title ?? '—'),
        issuer: String(l.issuer ?? '—'),
        date: String(l.date ?? l.year ?? ''),
        verified: l.verified !== undefined ? Boolean(l.verified) : true,
      })),
      attributes: ((coachRow?.attributes ?? []) as Array<Record<string, unknown>>).map(a => ({
        label: String(a.label ?? '—'),
        value: Number(a.value ?? 0),
        endorsements: Number(a.endorsements ?? 0),
        topEndorser: String(a.topEndorser ?? '—'),
        topEndorserVerified: Boolean(a.topEndorserVerified ?? false),
      })),
      honors: ((coachRow?.honors ?? []) as Array<Record<string, unknown>>).map(h => ({
        title: String(h.title ?? '—'),
        org: String(h.org ?? '—'),
        year: String(h.year ?? ''),
        type: (h.type as 'individual' | 'team' | 'recognition') ?? 'team',
      })),
      languages: ((coachRow?.languages ?? []) as Array<Record<string, unknown>>).map(l => ({
        name: String(l.name ?? '—'),
        level: String(l.level ?? ''),
      })),
      activity: ((coachRow?.activity ?? []) as Array<Record<string, unknown>>).map((a, i) => ({
        id: String(i),
        text: String(a.text ?? ''),
        time: String(a.time ?? ''),
        reactions: Number(a.reactions ?? 0),
        image: a.image ? String(a.image) : undefined,
      })),
      recommendations: [] as Array<{ id: string; authorName: string; authorVerified: boolean; relationship: string; body: string; date: string }>,
    };
  }, [coachRow]);

  const similarCoaches = useMemo(
    () => coachRows
      .filter(c => c.id !== (coachRow?.id ?? ''))
      .slice(0, 4)
      .map(c => ({
        id: c.id,
        name: c.user?.full_name ?? 'Unknown',
        role: ((c.coaching_spells?.[0] as Record<string, unknown> | undefined)?.role as string) ?? 'Coach',
        club: c.current_club ?? '—',
        score: c.score ?? 0,
        image: c.user?.avatar_url ?? '',
        isVerified: c.user?.is_verified ?? false,
      })),
    [coachRows, coachRow],
  );

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [shared, setShared] = useState(false);
  const [endorsedAttrs, setEndorsedAttrs] = useState<Set<string>>(new Set());
  const [expandedSpells, setExpandedSpells] = useState<Set<number>>(new Set([0]));
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isSelf = !!profileUserId && user?.id === profileUserId;

  const { val: followerDisplay, ref: followerRef } = useCountUp(followerCount);
  const { val: connDisplay, ref: connRef } = useCountUp(coach.connectionsCount);

  async function shareCoach() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: coach.name, url }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    }
    setShared(true);
  }

  // Parallax
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const h = () => { el.style.transform = `translateY(${window.scrollY * 0.15}px)`; };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, [coachRow]);

  // Sticky bar
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setShowStickyBar(!e.isIntersecting), { threshold: 0 });
    if (introRef.current) obs.observe(introRef.current);
    return () => obs.disconnect();
  }, [coachRow]);

  // Close more menu
  useEffect(() => {
    if (!moreMenuOpen) return;
    const h = (e: MouseEvent) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreMenuOpen]);

  // Load social data
  useEffect(() => {
    async function load() {
      const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileUserId);
      if (count) setFollowerCount(count);
      if (user) {
        const [fR, bR] = await Promise.all([
          supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profileUserId).maybeSingle(),
          supabase.from('user_blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', profileUserId).maybeSingle(),
        ]);
        setIsFollowing(!!fR.data);
        setIsBlocked(!!bR.data);
      }
    }
    if (profileUserId) load();
  }, [profileUserId, user]);

  async function toggleFollow() {
    if (!user) { navigate('/auth/login'); return; }
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileUserId);
      setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profileUserId });
      setIsFollowing(true); setFollowerCount(c => c + 1);
    }
    setFollowLoading(false);
  }

  async function toggleBlock() {
    if (!user) { navigate('/auth/login'); return; }
    setBlockLoading(true);
    if (isBlocked) {
      await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', profileUserId);
      setIsBlocked(false);
    } else {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileUserId);
        setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1));
      }
      await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: profileUserId });
      setIsBlocked(true);
    }
    setBlockLoading(false); setBlockConfirmOpen(false); setMoreMenuOpen(false);
  }

  async function handleSendMessage(text: string) {
    if (!user) return;
    setMsgSending(true);
    const { data: existing } = await supabase.from('conversations').select('id')
      .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${profileUserId}),and(participant_1_id.eq.${profileUserId},participant_2_id.eq.${user.id})`).maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data: nc } = await supabase.from('conversations').insert({ participant_1_id: user.id, participant_2_id: profileUserId }).select('id').single();
      convId = nc?.id;
    }
    if (convId) await supabase.from('messages').insert({ conversation_id: convId, sender_id: user.id, content: text });
    setMsgSending(false); setMsgSent(true); setMsgOpen(false);
  }

  const totalWins = coach.coachingSpells.reduce((s, c) => s + c.wins, 0);
  const totalDraws = coach.coachingSpells.reduce((s, c) => s + c.draws, 0);
  const totalLosses = coach.coachingSpells.reduce((s, c) => s + c.losses, 0);

  if (coachLoading) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className="flex items-center justify-center py-40">
          <Loader2 size={28} className="text-azure animate-spin" />
        </div>
      </div>
    );
  }

  if (!coachRow) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className="max-w-md mx-auto text-center py-40 px-4">
          <Users size={40} className="text-muted mx-auto mb-4" />
          <h1 className="font-display font-bold text-white text-xl mb-2">Coach not found</h1>
          <p className="text-sm text-muted mb-6">This profile doesn't exist or is no longer available.</p>
          <Link to="/feed" className="btn-outline px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <ChevronLeft size={14} /> Back to feed
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
            <img src={coach.image} alt={coach.name} className="w-8 h-8 rounded-full object-cover border border-white/15 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm truncate">{coach.name}</p>
              <p className="text-xs text-muted truncate hidden sm:block">{coach.role} · {coach.currentClub}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isSelf && !isBlocked && (
                <button onClick={toggleFollow} disabled={followLoading}
                  className={`px-4 py-1.5 text-xs rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white' : 'btn-outline'}`}>
                  {followLoading ? <Loader2 size={11} className="animate-spin" /> : isFollowing ? <><UserCheck size={11} /> Following</> : <><UserPlus size={11} /> Follow</>}
                </button>
              )}
              {!isSelf && !isBlocked && (
                <button onClick={() => user ? setMsgOpen(true) : navigate('/auth/login')}
                  className="btn-primary px-4 py-1.5 text-xs rounded-lg font-semibold inline-flex items-center gap-1.5">
                  <MessageSquare size={11} /> Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div ref={introRef} className="relative overflow-hidden" style={{ height: '50vh', minHeight: 340 }}>
        <AuroraBackground />
        <div ref={bannerRef} className="absolute inset-0">
          <img src={coach.coverImage} alt="" className="w-full h-[120%] object-cover object-center" />
          <div className="absolute inset-0 hero-overlay-bottom" />
          <div className="absolute inset-0" style={{ background: 'rgba(12,26,43,0.4)' }} />
        </div>
        <Link to="/feed" className="absolute top-20 left-4 lg:left-8 z-10 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={16} /> Back
        </Link>
        <div className="absolute top-20 right-6 lg:right-10 z-10" style={{ animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.5s both' }}>
          <div className="card-glass p-3 text-center min-w-[72px]" style={{ boxShadow: '0 0 24px rgba(47,128,237,0.3)' }}>
            <div className="text-3xl font-display font-bold text-azure tabular" style={{ filter: 'drop-shadow(0 0 10px rgba(47,128,237,0.6))' }}>{coach.score}</div>
            <div className="text-[10px] text-muted mt-0.5">Coach Score</div>
            <div className="badge-azure mt-1.5 justify-center text-[9px]"><Zap size={8} /> Pro</div>
          </div>
        </div>
      </div>

      {/* Intro card */}
      <div className="bg-page border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="relative pb-5">
            {/* Avatar */}
            <div className="absolute -top-14 left-0 z-10" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-4 border-[#0C1A2B]" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                <img src={coach.image} alt={coach.name} className="w-full h-full object-cover" />
              </div>
              {!coach.isOpenToOpportunities && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-panel text-muted text-[9px] font-bold whitespace-nowrap border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted" /> Not Available
                </div>
              )}
              {coach.isOpenToOpportunities && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-azure text-white text-[9px] font-bold whitespace-nowrap border border-azure/30"
                  style={{ boxShadow: '0 0 10px rgba(47,128,237,0.5)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Open to Roles
                </div>
              )}
            </div>

            <div className="pl-32 pt-4" style={{ animation: 'fadeIn 0.55s ease 0.2s both' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-white text-2xl lg:text-3xl leading-tight">{coach.name}</h1>
                {coach.isVerified && <VerifiedBadge animated size="sm" />}
              </div>
              <p className="text-muted text-sm mt-1">{coach.role} · {coach.specialty}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold"
                    style={{ borderColor: `${coach.currentClubColor}40`, background: `${coach.currentClubColor}15`, color: coach.currentClubColor }}>
                    {coach.currentClubInitials.charAt(0)}
                  </span>
                  {coach.currentClub}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted"><MapPin size={11} /> {coach.country} · {coach.nationality}</span>
                <span className="badge-muted text-[10px]">{coach.yearsExperience} yrs exp.</span>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <button className="flex items-center gap-1.5 text-xs font-semibold text-azure hover:text-azure/80 transition-colors">
                  <Users size={12} />
                  <span ref={followerRef as any} className="tabular">{followerDisplay.toLocaleString()}</span>
                  <span className="text-muted font-normal">followers</span>
                </button>
                <span className="text-white/10">·</span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <span ref={connRef as any} className="font-semibold text-white tabular">{connDisplay.toLocaleString()}</span> connections
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 mt-4 pl-32 items-center" style={{ animation: 'fadeIn 0.5s ease 0.35s both' }}>
              {!isSelf && !isBlocked && (
                <button onClick={toggleFollow} disabled={followLoading}
                  className={`px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold transition-all ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white hover:border-coral/40 hover:text-coral' : 'btn-outline'}`}>
                  {followLoading ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                </button>
              )}
              <MagneticButton className="btn-volt px-5 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-2">
                <Star size={13} className="text-ink" /> Endorse
              </MagneticButton>
              {!isSelf && !isBlocked && (
                <button onClick={() => user ? setMsgOpen(true) : navigate('/auth/login')}
                  className={`px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold transition-all ${msgSent ? 'bg-emerald/10 border border-emerald/20 text-emerald' : 'btn-primary'}`}>
                  <MessageSquare size={14} /> {msgSent ? 'Sent' : 'Message'}
                </button>
              )}
              {isBlocked && !isSelf && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-coral/10 border border-coral/20 text-coral">
                  <Ban size={13} /> Blocked
                </span>
              )}
              <button onClick={shareCoach} className="btn-ghost px-4 py-2 inline-flex items-center gap-2 text-sm">
                <Share2 size={14} /> {shared ? 'Copied' : 'Share'}
              </button>
              {!isSelf && (
                <div ref={moreMenuRef} className="relative">
                  <button onClick={() => setMoreMenuOpen(o => !o)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${moreMenuOpen ? 'bg-white/10 text-white' : 'btn-ghost text-muted hover:text-white'}`}>
                    <MoreHorizontal size={16} />
                  </button>
                  {moreMenuOpen && user && (
                    <div className="absolute right-0 top-11 w-48 card-glass border border-white/10 rounded-2xl overflow-hidden z-20"
                      style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.7)', animation: 'fadeIn 0.15s ease' }}>
                      {isFollowing && (
                        <button onClick={() => { toggleFollow(); setMoreMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/[0.06] transition-colors border-b border-white/[0.06]">
                          <UserMinus size={14} className="text-muted" /> Unfollow
                        </button>
                      )}
                      <button onClick={() => { setMoreMenuOpen(false); setBlockConfirmOpen(true); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isBlocked ? 'text-emerald hover:bg-emerald/10' : 'text-coral hover:bg-coral/10'}`}>
                        <Ban size={14} /> {isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-28 lg:pb-10">
        <div className="flex gap-6 items-start">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-4">
            <VerificationStripCoach />

            {/* Key Metrics */}
            <SectionCard title="Key Metrics" delay={0.04}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div className="flex flex-col items-center">
                  <ScoreRing value={coach.winRate} size={96} label="Win Rate %" isTopTier />
                </div>
                <div className="flex flex-col items-center">
                  <ScoreRing value={coach.score} size={96} label="Coach Score" />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
                  <StatTile value={coach.yearsExperience} label="Years Exp." accent="azure" />
                  <StatTile value={coach.totalMatches} label="Matches" accent="azure" />
                  <StatTile value={coach.totalTrophies} label="Trophies" accent="volt" />
                  <StatTile value={coach.coachingSpells.length} label="Clubs" accent="azure" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Career Record</p>
                <WinRateBar wins={totalWins} draws={totalDraws} losses={totalLosses} />
              </div>
            </SectionCard>

            {/* Philosophy */}
            <SectionCard title="Coaching Philosophy" icon={<Briefcase size={15} />}>
              <div className="space-y-3">
                {coach.philosophy.split('\n\n').slice(0, bioExpanded ? undefined : 1).map((p, i) => (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
                ))}
                {coach.philosophy.split('\n\n').length > 1 && (
                  <button onClick={() => setBioExpanded(e => !e)}
                    className="text-xs font-semibold text-azure hover:text-azure/80 transition-colors">
                    {bioExpanded ? 'Show less' : '…show more'}
                  </button>
                )}
              </div>
            </SectionCard>

            {/* Activity */}
            <SectionCard title="Activity" icon={<Activity size={15} />}>
              <div className="space-y-4">
                {coach.activity.map(post => (
                  <div key={post.id} className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
                    {post.image && <img src={post.image} alt="" className="w-full h-36 object-cover" />}
                    <div className="p-4">
                      <p className="text-sm text-slate-300 leading-relaxed">{post.text}</p>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05] text-xs text-muted">
                        <span>❤ {post.reactions.toLocaleString()}</span>
                        <span className="ml-auto">{post.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Coaching Experience */}
            <SectionCard title="Coaching Experience" icon={<Briefcase size={15} />}>
              <div className="space-y-4">
                {coach.coachingSpells.map((spell, i) => {
                  const open = expandedSpells.has(i);
                  const isCurrent = spell.to === 'Present';
                  return (
                    <div key={i} className="relative pl-12">
                      {i < coach.coachingSpells.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-px bg-white/[0.06]" />}
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold"
                        style={{ background: `${spell.clubColor}18`, borderColor: `${spell.clubColor}30`, color: spell.clubColor }}>
                        {spell.clubInitials}
                      </div>
                      <div className="border border-white/[0.06] rounded-2xl p-4 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
                        onClick={() => setExpandedSpells(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white text-sm">{spell.club}</p>
                              {isCurrent && <span className="flex items-center gap-1 text-[9px] font-bold text-emerald border border-emerald/25 bg-emerald/10 px-1.5 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-emerald animate-pulse" />Current</span>}
                            </div>
                            <p className="text-xs text-muted mt-0.5">{spell.role} · {spell.from} – {spell.to}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-display font-bold text-volt text-lg tabular">{spell.wins}</span>
                            <span className="text-muted text-xs">W</span>
                            <span className="mx-1 text-muted text-xs">·</span>
                            <span className="font-display font-bold text-azure text-lg tabular">{spell.matches}</span>
                            <span className="text-muted text-xs">G</span>
                          </div>
                        </div>
                        {open && (
                          <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-3">
                            <p className="text-xs text-slate-400 leading-relaxed">{spell.description}</p>
                            <WinRateBar wins={spell.wins} draws={spell.draws} losses={spell.losses} />
                            {spell.trophies.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {spell.trophies.map(t => (
                                  <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-volt/10 border border-volt/20 text-volt font-semibold">
                                    <Trophy size={9} /> {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Licenses */}
            <SectionCard title="Licenses &amp; Certifications" icon={<GraduationCap size={15} />}>
              <div className="space-y-3">
                {coach.licenses.map((lic, i) => {
                  const style = licenseStyle(lic.title);
                  return (
                    <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${style.bg}`}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${style.color}18` }}>
                        <BadgeCheck size={14} style={{ color: style.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{lic.title}</p>
                          {lic.verified && <span className="text-[9px] font-bold text-emerald border border-emerald/20 bg-emerald/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Verified</span>}
                        </div>
                        <p className="text-xs text-muted mt-0.5">{lic.issuer} · {lic.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Coaching Attributes */}
            <SectionCard title="Coaching Attributes" icon={<Zap size={15} />}>
              <div className="space-y-4">
                {coach.attributes.map((attr, i) => {
                  const isEndorsed = endorsedAttrs.has(attr.label);
                  const color = ATTR_COLORS[attr.label] ?? '#2F80ED';
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{attr.label}</span>
                          <span className="font-display font-bold text-sm tabular" style={{ color }}>{attr.value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">{attr.endorsements + (isEndorsed ? 1 : 0)}</span>
                          <button onClick={() => setEndorsedAttrs(s => { const n = new Set(s); n.has(attr.label) ? n.delete(attr.label) : n.add(attr.label); return n; })}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${isEndorsed ? 'border-azure/40 bg-azure/15 text-azure' : 'border-white/15 bg-white/[0.04] text-muted hover:border-azure/30 hover:text-azure'}`}>
                            <Plus size={9} /> {isEndorsed ? 'Endorsed' : 'Endorse'}
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${attr.value}%`, background: color, transition: 'width 1s ease' }} />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-muted">Top endorser: {attr.topEndorser}</span>
                        {attr.topEndorserVerified && <ShieldCheck size={9} className="text-emerald" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Honors */}
            <SectionCard title="Honors &amp; Recognition" icon={<Trophy size={15} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coach.honors.map((h, i) => {
                  const cfg = h.type === 'individual' ? { color: '#B8F135', bg: 'bg-volt/10 border-volt/20', Icon: Star }
                    : h.type === 'recognition' ? { color: '#2F80ED', bg: 'bg-azure/10 border-azure/20', Icon: BadgeCheck }
                    : { color: '#F5A623', bg: 'bg-amber/10 border-amber/20', Icon: Trophy };
                  return (
                    <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${cfg.bg}`}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}18` }}>
                        <cfg.Icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{h.title}</p>
                        <p className="text-xs text-muted truncate">{h.org} · {h.year}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Recommendations */}
            <SectionCard title="Recommendations" icon={<Quote size={15} />}>
              <div className="space-y-4">
                {coach.recommendations.length === 0 && (
                  <p className="text-center text-muted text-sm py-6">No recommendations yet.</p>
                )}
                {coach.recommendations.map(rec => (
                  <div key={rec.id} className="border border-white/[0.06] rounded-2xl p-4 bg-white/[0.02]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-azure/15 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-azure">{rec.authorName.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white">{rec.authorName}</span>
                          {rec.authorVerified && <ShieldCheck size={11} className="text-emerald" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-azure border border-azure/20 bg-azure/10 px-1.5 py-0.5 rounded-full">{rec.relationship}</span>
                          <span className="text-[11px] text-muted">{rec.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{rec.body}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Languages */}
            <SectionCard title="Languages" icon={<Languages size={15} />}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {coach.languages.map(lang => (
                  <div key={lang.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{lang.name}</p>
                      <p className="text-xs text-muted">{lang.level}</p>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-azure" style={{
                        width: lang.level === 'Native' ? '100%' : lang.level === 'Fluent' ? '85%' : lang.level === 'Professional' ? '75%' : lang.level === 'Conversational' ? '55%' : '35%',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right rail */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24 space-y-4">
            <div className="card-glass p-4">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Similar Coaches</p>
              {similarCoaches.length === 0 ? (
                <p className="text-xs text-muted py-2">No other coaches yet.</p>
              ) : (
                <div className="space-y-4">
                  {similarCoaches.map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {c.image
                          ? <img src={c.image} alt={c.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                          : <div className="w-10 h-10 rounded-xl bg-azure/10 border border-white/10 flex items-center justify-center text-sm font-bold text-azure">{c.name.charAt(0)}</div>}
                        {c.isVerified && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald border-2 border-[#0C1A2B] flex items-center justify-center"><ShieldCheck size={8} className="text-white" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/coaches/${c.id}`} className="text-sm font-semibold text-white hover:text-azure transition-colors block truncate">{c.name}</Link>
                        <p className="text-xs text-muted truncate">{c.role} · {c.club}</p>
                      </div>
                      <span className="font-display font-bold text-azure text-sm tabular flex-shrink-0">{c.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-glass p-4" style={{ background: 'linear-gradient(135deg, rgba(47,128,237,0.12), rgba(22,39,59,0.8))' }}>
              <Zap size={18} className="text-volt mb-2" style={{ filter: 'drop-shadow(0 0 8px rgba(184,241,53,0.6))' }} />
              <p className="text-sm font-bold text-white mb-1">Find Your Next Coach</p>
              <p className="text-xs text-muted mb-3">AI-matched coaching candidates for your club's tactical profile.</p>
              <Link to="/auth/register" className="btn-volt w-full py-2 text-xs font-bold rounded-xl inline-flex items-center justify-center">Search Coaches</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky */}
      {!isSelf && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 glass-dark border-t border-white/[0.08] px-4 py-3 flex gap-2.5">
          {!isBlocked && (
            <button onClick={toggleFollow} disabled={followLoading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white' : 'btn-outline'}`}>
              {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
            </button>
          )}
          {!isBlocked && (
            <button onClick={() => user ? setMsgOpen(true) : navigate('/auth/login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${msgSent ? 'bg-emerald/10 border border-emerald/20 text-emerald' : 'btn-primary'}`}>
              <MessageSquare size={13} /> Message
            </button>
          )}
        </div>
      )}

      {blockConfirmOpen && <BlockModal name={coach.name} isBlocked={isBlocked} onConfirm={toggleBlock} onCancel={() => setBlockConfirmOpen(false)} loading={blockLoading} />}
      {msgOpen && <MessageModal name={coach.name} onClose={() => setMsgOpen(false)} onSend={handleSendMessage} sending={msgSending} isAuth={!!user} />}
    </div>
  );
}

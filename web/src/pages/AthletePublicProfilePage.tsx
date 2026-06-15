import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus, UserCheck, MessageSquare, Share2, MoreHorizontal,
  MapPin, Loader2, Users, X, Send, ShieldCheck, Ban,
  UserMinus, AlertTriangle, Zap, ChevronLeft, LayoutDashboard, Pencil,
  BarChart2, Briefcase, Network, LayoutGrid, UserX,
} from 'lucide-react';

import PublicHeader from '../components/PublicHeader';
import AuroraBackground from '../components/ui/AuroraBackground';
import MagneticButton from '../components/ui/MagneticButton';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import StatusChip from '../components/ui/StatusChip';

import VerificationStrip from '../components/profile/VerificationStrip';
import KeyMetricsSection from '../components/profile/KeyMetricsSection';
import AboutSection from '../components/profile/AboutSection';
import HighlightsSection from '../components/profile/HighlightsSection';
import AttributesSection from '../components/profile/AttributesSection';
import PerformanceSection from '../components/profile/PerformanceSection';
import ClubCareerSection from '../components/profile/ClubCareerSection';
import AcademySection from '../components/profile/AcademySection';
import CertificationsSection from '../components/profile/CertificationsSection';
import RecommendationsSection from '../components/profile/RecommendationsSection';
import HonorsSection from '../components/profile/HonorsSection';
import LanguagesSection from '../components/profile/LanguagesSection';
import FollowingSection from '../components/profile/FollowingSection';
import MedicalSection from '../components/profile/MedicalSection';
import SimilarAthletesRail, { type SimilarAthleteItem } from '../components/profile/SimilarAthletesRail';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getAthleteById, listAthletes } from '../api/athletes';
import { listMedia, listMatches } from '../api/portfolio';
import { listEndorsements, listRecommendations } from '../api/network';
import { latestClearance, listMedicalRecords } from '../api/medical';
import { listPosts } from '../api/content';
import type { UserProfile, AttributeData } from '../types';

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
function fmtMatchDate(d?: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDuration(seconds?: number | null) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function fmtViews(n?: number | null) {
  const v = n ?? 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}
function timeAgo(d?: string | null) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
}

/* ─── Block Confirm Modal ─────────────────────────────────── */
function BlockConfirmModal({ name, isBlocked, onConfirm, onCancel, loading }: {
  name: string; isBlocked: boolean;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
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
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mx-auto mb-4">
          {isBlocked ? <Ban size={20} className="text-coral" /> : <AlertTriangle size={20} className="text-coral" />}
        </div>
        <h3 className="font-display font-bold text-white mb-1">{isBlocked ? `Unblock ${name}?` : `Block ${name}?`}</h3>
        <p className="text-sm text-muted mb-6">{isBlocked ? `${name} will be able to see your profile again.` : `${name} won't be able to message you or see your activity.`}</p>
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

/* ─── Followers Modal ─────────────────────────────────────── */
function FollowersModal({ profileUserId, count, currentUserId, onClose }: {
  profileUserId: string; count: number; currentUserId?: string; onClose: () => void;
}) {
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      const [fr, br] = await Promise.all([
        supabase.from('follows').select('follower:user_profiles!follows_follower_id_fkey(id,full_name,avatar_url,role,is_verified,city,country)').eq('following_id', profileUserId).order('created_at', { ascending: false }),
        currentUserId ? supabase.from('user_blocks').select('blocked_id').eq('blocker_id', currentUserId) : Promise.resolve({ data: [] }),
      ]);
      setFollowers(((fr.data ?? []) as any[]).map(r => r.follower).filter(Boolean));
      setBlockedIds(new Set(((br.data ?? []) as any[]).map(r => r.blocked_id)));
      setLoading(false);
    }
    load();
  }, [profileUserId, currentUserId]);

  const filtered = followers.filter(f => !search || (f.full_name ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md flex flex-col card-glass" style={{ maxHeight: '80vh', animation: 'slideUp 0.2s ease-out', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h3 className="font-display font-bold text-white">Followers</h3>
            <p className="text-xs text-muted mt-0.5">{count.toLocaleString()} people follow this athlete</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search followers…" className="input-dark text-sm py-2" />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={20} className="text-azure animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Users size={28} className="text-muted mx-auto mb-3" /><p className="text-sm text-muted">{search ? 'No results.' : 'No followers yet.'}</p></div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {filtered.map(f => (
                <li key={f.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors ${blockedIds.has(f.id) ? 'opacity-50' : ''}`}>
                  <div className="w-9 h-9 rounded-xl bg-azure/10 border border-azure/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {f.avatar_url ? <img src={f.avatar_url} alt={f.full_name ?? ''} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-azure">{(f.full_name ?? '?').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{f.full_name ?? 'Anonymous'}</p>
                      {f.is_verified && <span className="w-3.5 h-3.5 bg-azure rounded-full flex items-center justify-center flex-shrink-0"><svg viewBox="0 0 10 10" width={8} height={8}><path d="M1.5 5L4 7.5l4.5-5" stroke="white" strokeWidth={1.5} fill="none" strokeLinecap="round" /></svg></span>}
                    </div>
                    <p className="text-xs text-muted truncate">{f.role} {(f.city || f.country) && `· ${[f.city, f.country].filter(Boolean).join(', ')}`}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Message Modal ───────────────────────────────────────── */
function MessageModal({ athleteName, onClose, onSend, sending, isAuth }: {
  athleteName: string; onClose: () => void;
  onSend: (text: string) => Promise<void>; sending: boolean; isAuth: boolean;
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
          <div><h3 className="font-display font-bold text-white">Send Message</h3><p className="text-xs text-muted mt-0.5">to {athleteName}</p></div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"><X size={16} /></button>
        </div>
        {!isAuth ? (
          <div className="text-center py-4">
            <MessageSquare size={32} className="text-muted mx-auto mb-3" />
            <p className="text-sm text-slate-300 mb-4">Sign in to message {athleteName.split(' ')[0]}.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/auth/login" onClick={onClose} className="btn-primary px-5 py-2.5 text-sm">Sign In</Link>
              <Link to="/auth/register" onClick={onClose} className="btn-outline px-5 py-2.5 text-sm">Register Free</Link>
            </div>
          </div>
        ) : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={`Write a message to ${athleteName.split(' ')[0]}…`} rows={4} className="input-dark resize-none mb-4 text-sm leading-relaxed" autoFocus />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{text.length}/500</span>
              <button onClick={() => text.trim() && onSend(text)} disabled={!text.trim() || sending || text.length > 500}
                className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Count-up hook ───────────────────────────────────────── */
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current || started.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      started.current = true;
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return { val, ref };
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function AthletePublicProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // ─── DB queries ───
  const { data: athleteRow, isLoading: athleteLoading } = useQuery({
    queryKey: ['athlete', id],
    queryFn: () => getAthleteById(id),
    enabled: !!id,
  });
  const athleteRowId = athleteRow?.id ?? '';
  const profileUserId = athleteRow?.user_id ?? '';

  const { data: media = [] } = useQuery({
    queryKey: ['athlete-media', athleteRowId],
    queryFn: () => listMedia(athleteRowId, { publicOnly: true }),
    enabled: !!athleteRowId,
  });
  const { data: matches = [] } = useQuery({
    queryKey: ['athlete-matches', athleteRowId],
    queryFn: () => listMatches(athleteRowId),
    enabled: !!athleteRowId,
  });
  const { data: endorsements = [] } = useQuery({
    queryKey: ['athlete-endorsements', athleteRowId],
    queryFn: () => listEndorsements(athleteRowId),
    enabled: !!athleteRowId,
  });
  const { data: clearance } = useQuery({
    queryKey: ['athlete-clearance', athleteRowId],
    queryFn: () => latestClearance(athleteRowId),
    enabled: !!athleteRowId,
  });
  const { data: medicalRecords = [] } = useQuery({
    queryKey: ['athlete-medical-records', athleteRowId],
    queryFn: () => listMedicalRecords(athleteRowId),
    enabled: !!athleteRowId,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ['athlete-posts', athleteRowId],
    queryFn: () => listPosts({ athleteId: athleteRowId }),
    enabled: !!athleteRowId,
  });
  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ['athlete-recommendations', profileUserId],
    queryFn: () => listRecommendations(profileUserId),
    enabled: !!profileUserId,
  });
  const { data: similarRows = [] } = useQuery({
    queryKey: ['athlete-similar', athleteRow?.sport, athleteRowId],
    queryFn: () => listAthletes({ sport: athleteRow?.sport ?? undefined, limit: 8 }),
    enabled: !!athleteRowId,
  });

  // ─── Build the AthleteProfileData-shaped object the section components expect ───
  const athlete = useMemo(() => {
    const u = athleteRow?.user;
    const matchGoals = matches.reduce((s, m) => s + (m.goals ?? 0), 0);
    const matchAssists = matches.reduce((s, m) => s + (m.assists ?? 0), 0);
    const honorsArr = (athleteRow?.honors ?? []) as Array<{ title?: string; org?: string; year?: string; type?: string }>;
    const endorsementCounts = endorsements.reduce<Record<string, number>>((acc, e) => {
      acc[e.skill_or_trait] = (acc[e.skill_or_trait] ?? 0) + 1;
      return acc;
    }, {});
    const attributes = ((athleteRow?.attributes ?? []) as AttributeData[]).map(a => ({
      ...a,
      endorsements: endorsementCounts[a.label] ?? a.endorsements ?? 0,
    }));
    return {
      id: athleteRow?.id ?? '',
      name: u?.full_name ?? 'Unknown Athlete',
      position: athleteRow?.position_primary ?? athleteRow?.position ?? '—',
      positionSecondary: athleteRow?.position_secondary ?? '',
      sport: athleteRow?.sport ?? 'Football',
      club: athleteRow?.current_club ?? '—',
      clubInitials: initialsOf(athleteRow?.current_club),
      clubColor: '#2F80ED',
      country: u?.country ?? athleteRow?.nationality ?? '—',
      nationality: athleteRow?.nationality ?? '—',
      age: ageFrom(athleteRow?.birth_date),
      height: athleteRow?.height_cm ? `${athleteRow.height_cm} cm` : '—',
      weight: athleteRow?.weight_kg ? `${athleteRow.weight_kg} kg` : '—',
      preferredFoot: athleteRow?.dominant_foot ?? '—',
      score: athleteRow?.visibility_score ?? 0,
      visibilityScore: athleteRow?.visibility_score ?? 0,
      performanceScore: athleteRow?.performance_score ?? 0,
      fitnessScore: athleteRow?.fitness_score ?? 0,
      isVerified: u?.is_verified ?? false,
      isOpenToTrials: athleteRow?.is_open_to_offers ?? false,
      image: u?.avatar_url ?? '',
      coverImage: athleteRow?.cover_url ?? DEFAULT_COVER,
      followersCount: athleteRow?.followers_count ?? 0,
      connectionsCount: athleteRow?.connections_count ?? 0,
      bio: athleteRow?.bio ?? u?.bio ?? 'No bio provided yet.',
      attributes,
      career: athleteRow?.current_club ? [{
        club: athleteRow.current_club,
        clubInitials: initialsOf(athleteRow.current_club),
        clubColor: '#2F80ED',
        role: athleteRow.position_primary ?? athleteRow.position ?? 'Player',
        from: athleteRow.created_at ? String(new Date(athleteRow.created_at).getFullYear()) : '—',
        to: 'Present',
        appearances: matches.length,
        goals: matchGoals,
        assists: matchAssists,
        honors: honorsArr.map(h => h.title).filter(Boolean) as string[],
        description: athleteRow.bio ?? '',
      }] : [],
      academy: (athleteRow?.academy ?? []) as Array<{ name: string; location: string; years: string; scholarship: boolean; description: string }>,
      certifications: (athleteRow?.certifications ?? []) as Array<{ title: string; issuer: string; date: string; verified: boolean; expiry?: string }>,
      honors: honorsArr.map(h => ({ title: h.title ?? '', org: h.org ?? '', year: h.year ?? '', type: (h.type as 'team' | 'individual' | 'national') ?? 'team' })),
      languages: (athleteRow?.languages ?? []) as Array<{ name: string; level: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Elementary' }>,
      following: (athleteRow?.following ?? []) as Array<{ name: string; type: 'Club' | 'Federation' | 'Platform' | 'Athlete'; followers: string; color: string; initials: string }>,
      recentMatches: matches.map(m => ({
        date: fmtMatchDate(m.match_date),
        opponent: m.opponent ?? '—',
        competition: m.competition ?? '—',
        result: m.result ?? '—',
        minutes: m.minutes_played ?? 0,
        goals: m.goals ?? 0,
        assists: m.assists ?? 0,
        rating: typeof (m.stats as { rating?: number })?.rating === 'number' ? (m.stats as { rating: number }).rating : 0,
      })),
      trajectory: ((athleteRow?.trajectory ?? []) as Array<{ season: string; score?: number; goals?: number; forecast?: number }>).map(t => ({
        season: t.season,
        goals: t.score ?? t.goals,
        forecast: t.forecast,
      })),
      highlights: media.map(m => ({
        id: m.id,
        thumbnail: m.thumbnail_url ?? m.storage_url,
        title: m.title,
        duration: fmtDuration(m.duration_seconds),
        tags: m.ai_tags ?? [],
        views: fmtViews(m.views_count),
      })),
      activity: posts.map(p => ({
        id: p.id,
        type: (p.type as 'achievement' | 'match' | 'milestone' | 'media') ?? 'media',
        text: p.text ?? '',
        time: timeAgo(p.created_at),
        reactions: p.reactions_count ?? 0,
        image: p.image_url ?? undefined,
      })),
    };
  }, [athleteRow, matches, media, posts, endorsements]);

  const similarAthletes: SimilarAthleteItem[] = useMemo(
    () => similarRows
      .filter(a => a.id !== athleteRowId)
      .slice(0, 4)
      .map(a => ({
        id: a.id,
        name: a.user?.full_name ?? 'Unknown',
        position: a.position_primary ?? a.position ?? '—',
        club: a.current_club ?? '—',
        score: a.visibility_score ?? 0,
        image: a.user?.avatar_url ?? '',
        isVerified: a.user?.is_verified ?? false,
      })),
    [similarRows, athleteRowId],
  );

  // Social state
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'career' | 'network'>('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [shared, setShared] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Parallax
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const handler = () => { el.style.transform = `translateY(${window.scrollY * 0.18}px)`; };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [athleteRow]);

  // Sticky mini-bar visibility
  const introRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setShowStickyBar(!e.isIntersecting), { threshold: 0 });
    if (introRef.current) obs.observe(introRef.current);
    return () => obs.disconnect();
  }, [athleteRow]);

  // Count-up refs
  const { val: followerDisplayCount, ref: followerRef } = useCountUp(followerCount);
  const { val: connCount, ref: connRef } = useCountUp(athlete.connectionsCount);

  const isSelf = !!user && !!profileUserId && user.id === profileUserId;

  // Load follow / block state + live follower count
  const loadSocialData = useCallback(async () => {
    if (!profileUserId) return;
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
  }, [profileUserId, user]);

  useEffect(() => { loadSocialData(); }, [loadSocialData]);
  useEffect(() => { setFollowerCount(athlete.followersCount); }, [athlete.followersCount]);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreMenuOpen]);

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
    const base = role === 'scout' || role === 'club' ? '/recruiter' : '/athlete';
    setTimeout(() => navigate(`${base}/messages`), 300);
  }

  async function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: athlete.name, url }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    }
    setShared(true);
  }

  if (athleteLoading) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className="flex items-center justify-center py-40">
          <Loader2 size={28} className="text-azure animate-spin" />
        </div>
      </div>
    );
  }

  if (!athleteRow) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className="max-w-md mx-auto text-center py-40 px-4">
          <UserX size={40} className="text-muted mx-auto mb-4" />
          <h1 className="font-display font-bold text-white text-xl mb-2">Athlete not found</h1>
          <p className="text-sm text-muted mb-6">This profile doesn't exist or is no longer available.</p>
          <Link to="/athletes" className="btn-outline px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <ChevronLeft size={14} /> Browse athletes
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
            <img src={athlete.image} alt={athlete.name} className="w-8 h-8 rounded-full object-cover border border-white/15 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm truncate">{athlete.name}</p>
              <p className="text-xs text-muted truncate hidden sm:block">{athlete.position} · {athlete.club}</p>
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

      {/* ─ HERO BANNER ─ */}
      <div ref={introRef} className="relative overflow-hidden" style={{ height: '55vh', minHeight: 380 }}>
        <AuroraBackground />
        <div ref={bannerRef} className="absolute inset-0">
          <img src={athlete.coverImage} alt="" className="w-full h-[120%] object-cover object-center" />
          <div className="absolute inset-0 hero-overlay-bottom" />
          <div className="absolute inset-0" style={{ background: 'rgba(12,26,43,0.35)' }} />
        </div>

        <Link to={isSelf ? '/athlete/dashboard' : '/feed'} className="absolute top-20 left-4 lg:left-8 z-10 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={16} /> {isSelf ? 'Dashboard' : 'Feed'}
        </Link>

        {/* AI Score badge */}
        <div className="absolute top-20 right-6 lg:right-10 z-10" style={{ animation: 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.55s both' }}>
          <div className="card-glass p-3 text-center min-w-[72px]" style={{ boxShadow: '0 0 24px rgba(184,241,53,0.3)' }}>
            <div className="text-3xl font-display font-bold text-volt tabular" style={{ filter: 'drop-shadow(0 0 12px rgba(184,241,53,0.6))' }}>
              {athlete.score}
            </div>
            <div className="text-[10px] text-muted mt-0.5">AI Score</div>
            <div className="badge-volt mt-1.5 justify-center text-[9px]"><Zap size={8} /> Elite</div>
          </div>
        </div>
      </div>

      {/* ─ INTRO CARD ─ */}
      <div className="bg-page border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="relative pb-5">
            {/* Avatar */}
            <div className="absolute -top-14 left-0 z-10" style={{ animation: 'scaleIn 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-4 border-[#0C1A2B]"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" />
              </div>
              {athlete.isOpenToTrials && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald text-ink text-[9px] font-bold whitespace-nowrap border border-emerald/30"
                  style={{ boxShadow: '0 0 10px rgba(31,181,122,0.5)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0C1A2B] animate-pulse" />
                  Open to Trials
                </div>
              )}
            </div>

            {/* Name & headline */}
            <div className="pl-32 pt-4">
              <div style={{ animation: 'fadeIn 0.55s ease 0.2s both' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-bold text-white text-2xl lg:text-3xl leading-tight">{athlete.name}</h1>
                  {athlete.isVerified && <VerifiedBadge animated size="sm" />}
                </div>
                <p className="text-muted text-sm mt-1">{athlete.position} · {athlete.positionSecondary} · {athlete.sport}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <span className="w-4 h-4 rounded-full bg-amber/20 border border-amber/30 text-[9px] flex items-center justify-center text-amber font-bold" style={{ color: athlete.clubColor }}>
                      {athlete.clubInitials.charAt(0)}
                    </span>
                    {athlete.club}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted"><MapPin size={11} /> {athlete.country} · {athlete.nationality}</span>
                  <StatusChip status="cleared" />
                </div>
              </div>

              {/* Followers / Connections */}
              <div className="flex items-center gap-4 mt-3" style={{ animation: 'fadeIn 0.5s ease 0.3s both' }}>
                <button onClick={() => setFollowersOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-azure hover:text-azure/80 transition-colors">
                  <Users size={12} />
                  <span ref={followerRef as any} className="tabular">{followerDisplayCount.toLocaleString()}</span>
                  <span className="text-muted font-normal">followers</span>
                </button>
                <span className="text-white/10">·</span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <span ref={connRef as any} className="tabular font-semibold text-white">{connCount.toLocaleString()}</span>
                  connections
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2.5 mt-4 pl-32 items-center" style={{ animation: 'fadeIn 0.5s ease 0.35s both' }}>

              {isSelf && (
                <>
                  {/* Owner banner */}
                  <div
                    className="w-full mb-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm"
                    style={{ background: 'rgba(47,128,237,0.08)', border: '1px solid rgba(47,128,237,0.2)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-azure animate-pulse flex-shrink-0" />
                    <span className="text-white/50 text-xs flex-1">You are viewing your public profile</span>
                    <Link
                      to="/athlete/dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <LayoutDashboard size={12} /> Dashboard
                    </Link>
                    <Link
                      to="/athlete/profile"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(47,128,237,0.2)', color: '#2F80ED', border: '1px solid rgba(47,128,237,0.3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(47,128,237,0.35)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(47,128,237,0.2)'; }}
                    >
                      <Pencil size={12} /> Edit Profile
                    </Link>
                  </div>
                </>
              )}

              {!isSelf && !isBlocked && (
                <button onClick={toggleFollow} disabled={followLoading}
                  className={`px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold transition-all ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white hover:border-coral/40 hover:text-coral' : 'btn-outline'}`}>
                  {followLoading ? <Loader2 size={14} className="animate-spin" /> : isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                </button>
              )}

              <MagneticButton className="btn-volt px-5 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-2">
                ✦ Endorse
              </MagneticButton>

              {!isSelf && !isBlocked && (
                <button onClick={() => user ? setMsgOpen(true) : navigate('/auth/login')}
                  className={`px-5 py-2 inline-flex items-center gap-2 text-sm rounded-xl font-semibold transition-all ${msgSent ? 'bg-emerald/10 border border-emerald/20 text-emerald' : 'btn-primary'}`}>
                  <MessageSquare size={14} /> {msgSent ? 'Sent' : 'Message'}
                </button>
              )}

              {isBlocked && !isSelf && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-coral/10 border border-coral/20 text-coral font-medium">
                  <Ban size={13} /> Blocked
                </span>
              )}

              <button onClick={shareProfile} className="btn-ghost px-4 py-2 inline-flex items-center gap-2 text-sm">
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
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors border-b border-white/[0.06]">
                          <UserMinus size={14} className="text-muted" /> Unfollow
                        </button>
                      )}
                      {!isFollowing && !isBlocked && (
                        <button onClick={() => { toggleFollow(); setMoreMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors border-b border-white/[0.06]">
                          <UserPlus size={14} className="text-azure" /> Follow
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

              {!user && (
                <Link to="/auth/register" className="btn-outline px-5 py-2 inline-flex items-center gap-2 text-sm ml-auto">
                  <ShieldCheck size={14} /> Request Full Report
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─ TAB BAR ─ */}
      <div className="sticky top-16 z-30 glass-dark border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {([
              { id: 'overview',    label: 'Overview',    icon: LayoutGrid },
              { id: 'performance', label: 'Performance', icon: BarChart2 },
              { id: 'career',      label: 'Career',      icon: Briefcase },
              { id: 'network',     label: 'Network',     icon: Network },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                style={{ color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.4)' }}
              >
                <Icon size={14} style={{ color: activeTab === id ? '#2F80ED' : undefined }} />
                {label}
                {activeTab === id && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, #2F80ED, #B8F135)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─ BODY ─ */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-28 lg:pb-10">
        <div className="flex gap-6 items-start">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-4">
            <VerificationStrip
              identityVerified={athlete.isVerified}
              hasPerformanceData={matches.length > 0}
              medicalCleared={clearance?.status === 'cleared'}
              medicalLabel={clearance?.issued_by ?? undefined}
            />

            {activeTab === 'overview' && (
              <>
                <KeyMetricsSection athlete={athlete} isOwner={isSelf} />
                <AboutSection athlete={athlete} isOwner={isSelf} />
                <HighlightsSection athlete={athlete} isOwner={isSelf} />
                <AttributesSection athlete={athlete} isOwner={isSelf} />
                <LanguagesSection athlete={athlete} isOwner={isSelf} />
              </>
            )}

            {activeTab === 'performance' && (
              <>
                <PerformanceSection athlete={athlete} isOwner={isSelf} />
                <MedicalSection isGranted={false} isOwner={isSelf} clearance={clearance} records={medicalRecords} />
              </>
            )}

            {activeTab === 'career' && (
              <>
                <ClubCareerSection athlete={athlete} isOwner={isSelf} />
                <AcademySection athlete={athlete} isOwner={isSelf} />
                <CertificationsSection athlete={athlete} isOwner={isSelf} />
                <HonorsSection athlete={athlete} isOwner={isSelf} />
              </>
            )}

            {activeTab === 'network' && (
              <>
                <RecommendationsSection recommendations={recommendations} loading={recsLoading} isOwner={isSelf} />
                <FollowingSection athlete={athlete} isOwner={isSelf} />
              </>
            )}
          </div>

          {/* Right rail — sticky on desktop */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-28 space-y-4">
            <SimilarAthletesRail athletes={similarAthletes} />
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      {!isSelf && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 glass-dark border-t border-white/[0.08] px-4 py-3 flex gap-2.5">
          {!isBlocked && (
            <button onClick={toggleFollow} disabled={followLoading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${isFollowing ? 'bg-white/[0.06] border border-white/10 text-white' : 'btn-outline'}`}>
              {followLoading ? <Loader2 size={13} className="animate-spin" /> : isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
            </button>
          )}
          {!isBlocked && (
            <button onClick={() => user ? setMsgOpen(true) : navigate('/auth/login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${msgSent ? 'bg-emerald/10 border border-emerald/20 text-emerald' : 'btn-primary'}`}>
              <MessageSquare size={13} /> {msgSent ? 'Sent' : 'Message'}
            </button>
          )}
          <button onClick={() => setMoreMenuOpen(o => !o)}
            className="w-11 py-2.5 rounded-xl flex items-center justify-center btn-ghost text-muted hover:text-white transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      )}

      {/* Modals */}
      {followersOpen && <FollowersModal profileUserId={profileUserId} count={followerCount} currentUserId={user?.id} onClose={() => setFollowersOpen(false)} />}
      {blockConfirmOpen && <BlockConfirmModal name={athlete.name} isBlocked={isBlocked} onConfirm={toggleBlock} onCancel={() => setBlockConfirmOpen(false)} loading={blockLoading} />}
      {msgOpen && <MessageModal athleteName={athlete.name} onClose={() => setMsgOpen(false)} onSend={handleSendMessage} sending={msgSending} isAuth={!!user} />}
    </div>
  );
}

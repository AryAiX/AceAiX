import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserPlus, UserCheck, UserMinus, ShieldCheck,
  Search, MessageSquare, Quote, Award, Eye,
  X, Loader2, Check, ChevronRight, TrendingUp,
  Network, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useMyAthlete } from '../../hooks/useAthlete';
import { listAthletes } from '../../api/athletes';
import { listProfileViews, profileViewCount } from '../../api/analytics';
import RecommendationCard from '../../components/ui/RecommendationCard';
import type { Recommendation, UserProfile, RecommendationRelationship } from '../../types';

/* ── constants ──────────────────────────────────────────────── */
const ACTIVITY_COLORS = ['#F5A623', '#B8F135', '#2F80ED', '#1FB57A'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

const ROLE_LABEL: Record<string, string> = {
  athlete: 'Athlete', scout: 'Scout', club: 'Club / Coach',
  medical_partner: 'Medical Partner', admin: 'Admin',
};

const ROLE_COLOR: Record<string, string> = {
  athlete: '#2F80ED', scout: '#F5A623', club: '#1FB57A',
  medical_partner: '#A78BFA', admin: '#EF5350',
};

const RELATIONSHIP_OPTIONS: { value: RecommendationRelationship; label: string }[] = [
  { value: 'coach',         label: 'Coach'           },
  { value: 'teammate',      label: 'Teammate'        },
  { value: 'manager',       label: 'Manager'         },
  { value: 'scout',         label: 'Scout'           },
  { value: 'medical_staff', label: 'Medical Staff'   },
  { value: 'colleague',     label: 'Colleague'       },
];

type Tab = 'followers' | 'following' | 'recommendations';

/* ── write recommendation modal ─────────────────────────────── */
function WriteRecommendationModal({ recipientId, recipientName, onClose, onSaved }: {
  recipientId: string; recipientName: string; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [relationship, setRelationship] = useState<RecommendationRelationship>('colleague');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!body.trim() || !user) return;
    setSaving(true);
    const { error: err } = await supabase.from('recommendations').upsert({
      author_id: user.id, recipient_id: recipientId,
      relationship_type: relationship, body: body.trim(), is_public: true,
    }, { onConflict: 'author_id,recipient_id' });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,26,43,0.88)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease both' }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: '#16273B', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>

        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(184,241,53,0.12)', border: '1px solid rgba(184,241,53,0.25)' }}>
              <Quote size={13} className="text-volt" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Write a Recommendation</h3>
              <p className="text-[11px] text-white/35 mt-0.5">For <span className="text-white/60 font-semibold">{recipientName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors"><X size={13} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Your Relationship</label>
            <div className="grid grid-cols-3 gap-2">
              {RELATIONSHIP_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setRelationship(opt.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: relationship === opt.value ? 'rgba(184,241,53,0.10)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${relationship === opt.value ? 'rgba(184,241,53,0.30)' : 'rgba(255,255,255,0.08)'}`,
                    color: relationship === opt.value ? '#B8F135' : 'rgba(255,255,255,0.35)',
                  }}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Recommendation</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder={`Share what makes ${recipientName.split(' ')[0]} stand out…`}
              rows={5}
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 leading-relaxed focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', caretColor: '#B8F135' }} />
            <p className="text-[11px] text-white/25 mt-1 text-right tabular">{body.length} / 1000</p>
          </div>
          {error && <p className="text-xs text-coral">{error}</p>}
        </div>

        <div className="px-6 pb-6">
          <button onClick={handleSubmit} disabled={!body.trim() || saving || saved}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: saved ? '#1FB57A' : '#B8F135', color: '#0C1A2B', boxShadow: saved ? '0 4px 20px rgba(31,181,122,0.4)' : '0 4px 20px rgba(184,241,53,0.3)' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Quote size={14} />}
            {saving ? 'Posting…' : saved ? 'Posted!' : 'Post Recommendation'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── avatar ─────────────────────────────────────────────────── */
function Avatar({ user, size = 10 }: { user: Partial<UserProfile>; size?: number }) {
  const color = ROLE_COLOR[user.role ?? ''] ?? '#7C8DA6';
  return (
    <div className="relative flex-shrink-0">
      <div className={`w-${size} h-${size} rounded-full overflow-hidden border`}
        style={{ borderColor: `${color}30`, background: `${color}12` }}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt={user.full_name ?? ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color }}>{user.full_name?.charAt(0) ?? '?'}</div>
        }
      </div>
      {user.is_verified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
          style={{ background: '#1FB57A', borderColor: '#16273B' }}>
          <ShieldCheck size={8} className="text-white" />
        </div>
      )}
    </div>
  );
}

/* ── user row (followers / following) ───────────────────────── */
function UserRow({ user, isFollowing, onToggle, onMessage, delay = 0 }: {
  user: Partial<UserProfile>; isFollowing: boolean; onToggle: () => void; onMessage?: () => void; delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hov, setHov] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  const color = ROLE_COLOR[user.role ?? ''] ?? '#7C8DA6';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-3 px-5 py-3.5 transition-all"
      style={{
        background: hov ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.045)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
        transition: `opacity 0.35s ease, transform 0.35s cubic-bezier(0.19,1,0.22,1), background 0.15s`,
      }}>
      <Avatar user={user} size={10} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{user.full_name ?? 'Unknown'}</p>
        <span className="text-[11px] font-semibold" style={{ color }}>{ROLE_LABEL[user.role ?? ''] ?? user.role}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0"
        style={{ opacity: hov ? 1 : 0, transition: 'opacity 0.2s' }}>
        {onMessage && (
          <button onClick={onMessage}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(47,128,237,0.08)', border: '1px solid rgba(47,128,237,0.18)', color: '#2F80ED' }}>
            <MessageSquare size={12} />
          </button>
        )}
        <button onClick={onToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={isFollowing
            ? { background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.20)', color: '#EF5350' }
            : { background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.25)', color: '#2F80ED' }}>
          {isFollowing ? <><UserMinus size={10} />Unfollow</> : <><UserPlus size={10} />Follow</>}
        </button>
      </div>
    </div>
  );
}

/* ── suggestion card ────────────────────────────────────────── */
function SuggestionCard({ user, isFollowing, onFollow, onRecommend, delay = 0 }: {
  user: Partial<UserProfile & { mutualCount?: number }>; isFollowing: boolean;
  onFollow: () => void; onRecommend: () => void; delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  const color = ROLE_COLOR[user.role ?? ''] ?? '#7C8DA6';

  return (
    <div className="p-3.5 rounded-2xl transition-all"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
        transition: `opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)`,
      }}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar user={user} size={10} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
          <p className="text-[11px] font-semibold" style={{ color }}>{ROLE_LABEL[user.role ?? ''] ?? user.role}</p>
          {user.mutualCount && (
            <p className="text-[10px] mt-0.5" style={{ color: '#2F80ED' }}>{user.mutualCount} mutual connections</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onFollow}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
          style={isFollowing
            ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)' }
            : { background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.25)', color: '#2F80ED' }}>
          {isFollowing ? <><UserCheck size={9} />Following</> : <><UserPlus size={9} />Follow</>}
        </button>
        <button onClick={onRecommend}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
          style={{ background: 'rgba(184,241,53,0.08)', border: '1px solid rgba(184,241,53,0.18)', color: '#B8F135' }}>
          <Award size={9} />Recommend
        </button>
      </div>
    </div>
  );
}

/* ── empty state ────────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Icon size={24} className="text-white/20" />
      </div>
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-xs text-white/35">{sub}</p>
    </div>
  );
}

/* ── stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, delay }: {
  label: string; value: number | string; icon: React.ElementType; color: string; delay: number;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}1E`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-display font-bold tabular" style={{ color }}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────── */
export default function NetworkPage() {
  const { user } = useAuth();
  const { data: athlete } = useMyAthlete();
  const [tab, setTab]                       = useState<Tab>('followers');
  const [search, setSearch]                 = useState('');
  const [followers, setFollowers]           = useState<UserProfile[]>([]);
  const [following, setFollowing]           = useState<UserProfile[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading]               = useState(false);
  const [suggFollowingIds, setSuggFollowingIds] = useState<Set<string>>(new Set());
  const [writeRecModal, setWriteRecModal]   = useState<{ id: string; name: string } | null>(null);
  const [mounted, setMounted]               = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  useEffect(() => { if (user) loadAll(); }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadFollowers(), loadFollowing(), loadRecommendations()]);
    setLoading(false);
  }

  async function loadFollowers() {
    if (!user) return;
    const { data } = await supabase.from('follows')
      .select('follower_id, follower:user_profiles!follows_follower_id_fkey(*)')
      .eq('following_id', user.id);
    if (data) setFollowers(data.map((r: any) => r.follower as UserProfile).filter(Boolean));
  }

  async function loadFollowing() {
    if (!user) return;
    const { data } = await supabase.from('follows')
      .select('following_id, following:user_profiles!follows_following_id_fkey(*)')
      .eq('follower_id', user.id);
    if (data) {
      const users = data.map((r: any) => r.following as UserProfile).filter(Boolean);
      setFollowing(users);
      setMyFollowingIds(new Set(users.map((u: UserProfile) => u.id)));
    }
  }

  async function loadRecommendations() {
    if (!user) return;
    const { data } = await supabase.from('recommendations')
      .select('*, author:user_profiles!recommendations_author_id_fkey(*)')
      .eq('recipient_id', user.id).order('created_at', { ascending: false });
    if (data) setRecommendations(data as Recommendation[]);
  }

  async function toggleFollow(targetId: string) {
    if (!user) return;
    if (myFollowingIds.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setMyFollowingIds(s => { const n = new Set(s); n.delete(targetId); return n; });
      setFollowing(f => f.filter(u => u.id !== targetId));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setMyFollowingIds(s => new Set([...s, targetId]));
    }
  }

  async function toggleSuggFollow(targetId: string) {
    if (!user) return;
    if (suggFollowingIds.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setSuggFollowingIds(s => { const n = new Set(s); n.delete(targetId); return n; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setSuggFollowingIds(s => new Set([...s, targetId]));
    }
  }

  const { data: suggestionAthletes = [] } = useQuery({
    queryKey: ['suggest-athletes'],
    queryFn: () => listAthletes({ limit: 10 }),
  });
  const { data: profileViews = [] } = useQuery({
    queryKey: ['network-profile-views', athlete?.id],
    queryFn: () => listProfileViews(athlete!.id, 6),
    enabled: !!athlete?.id,
  });
  const { data: viewCount = 0 } = useQuery({
    queryKey: ['network-view-count', athlete?.id],
    queryFn: () => profileViewCount(athlete!.id),
    enabled: !!athlete?.id,
  });

  const suggestions = suggestionAthletes
    .map(a => a.user)
    .filter((u): u is UserProfile => !!u && u.id !== user?.id && !myFollowingIds.has(u.id))
    .slice(0, 6);

  const scoutActivity = profileViews.map((v, i) => ({
    name: v.viewer_org || v.viewer_name || 'Scout',
    action: 'Viewed your profile',
    time: timeAgo(v.created_at),
    color: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length],
  }));

  function filterBySearch<T extends { full_name?: string | null }>(list: T[]) {
    if (!search.trim()) return list;
    return list.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()));
  }

  const TABS: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'followers',       label: 'Followers',       count: followers.length,       color: '#2F80ED' },
    { id: 'following',       label: 'Following',        count: following.length,       color: '#1FB57A' },
    { id: 'recommendations', label: 'Recommendations',  count: recommendations.length, color: '#B8F135' },
  ];

  return (
    <>
      {writeRecModal && (
        <WriteRecommendationModal
          recipientId={writeRecModal.id} recipientName={writeRecModal.name}
          onClose={() => setWriteRecModal(null)} onSaved={loadRecommendations}
        />
      )}

      <div className="max-w-6xl space-y-5 pb-10">

        {/* ── HERO HEADER ─────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0C1A2B 0%, #16273B 50%, #091826 100%)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-14px)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.19,1,0.22,1)',
          }}>
          {/* ambient orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(47,128,237,0.10) 0%, transparent 70%)', transform: 'translate(40%,-40%)' }} />
          <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(184,241,53,0.07) 0%, transparent 70%)', transform: 'translateY(55%)' }} />

          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.25)', boxShadow: '0 0 28px rgba(47,128,237,0.15)' }}>
                <Network size={22} style={{ color: '#2F80ED' }} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Network</h1>
                <p className="text-white/40 text-sm mt-0.5">Followers · Following · Recommendations</p>
              </div>
            </div>

            {/* live scout pulse */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl flex-shrink-0"
              style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.22)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F5A623', boxShadow: '0 0 6px rgba(245,166,35,0.7)' }} />
              <span className="text-xs font-bold text-amber">4 scouts active today</span>
            </div>

            <button onClick={() => setWriteRecModal({ id: user?.id ?? '', name: 'someone' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all active:scale-95"
              style={{ background: '#2F80ED', color: '#fff', boxShadow: '0 4px 20px rgba(47,128,237,0.40)' }}>
              <Quote size={15} /> Recommend
            </button>
          </div>

          {/* energy line */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(47,128,237,0.5) 35%, rgba(184,241,53,0.35) 65%, transparent)' }} />

          {/* stat row */}
          <div className="relative p-6 sm:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Followers"       value={followers.length}       icon={Users}      color="#2F80ED" delay={80}  />
            <StatCard label="Following"       value={following.length}       icon={UserCheck}  color="#1FB57A" delay={140} />
            <StatCard label="Recommendations" value={recommendations.length} icon={Quote}      color="#B8F135" delay={200} />
            <StatCard label="Scout Views"     value={viewCount}              icon={Eye}        color="#F5A623" delay={260} />
          </div>
        </div>

        {/* ── BODY: sidebar + main ─────────────────────────── */}
        <div className="flex gap-5 items-start">

          {/* ── SIDEBAR ─────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">

            {/* people you may know */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#16273B', border: '1px solid rgba(255,255,255,0.08)', animation: 'slideUp 0.4s ease 0.15s both' }}>
              <div className="px-4 py-3.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-azure" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">People you may know</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.20)', color: '#2F80ED' }}>
                  {suggestions.length}
                </span>
              </div>
              <div className="p-3 space-y-2.5">
                {suggestions.length === 0 && (
                  <p className="text-[11px] text-white/30 text-center py-4">No suggestions right now.</p>
                )}
                {suggestions.map((u, i) => (
                  <SuggestionCard key={u.id} user={u}
                    isFollowing={suggFollowingIds.has(u.id ?? '')}
                    onFollow={() => toggleSuggFollow(u.id ?? '')}
                    onRecommend={() => setWriteRecModal({ id: u.id ?? '', name: u.full_name ?? '' })}
                    delay={i * 50}
                  />
                ))}
              </div>
            </div>

            {/* scout activity */}
            <div className="rounded-2xl p-4"
              style={{ background: '#16273B', border: '1px solid rgba(255,255,255,0.08)', animation: 'slideUp 0.4s ease 0.22s both' }}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.22)' }}>
                  <TrendingUp size={13} style={{ color: '#F5A623' }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Scout Activity</p>
                  <p className="text-[10px] text-white/30">This week</p>
                </div>
              </div>
              <div className="space-y-3">
                {scoutActivity.length === 0 && (
                  <p className="text-[11px] text-white/30 text-center py-2">No scout activity yet.</p>
                )}
                {scoutActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: item.color, boxShadow: `0 0 6px ${item.color}70` }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{item.action} · {item.time}</p>
                    </div>
                    <ChevronRight size={11} className="text-white/15 flex-shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 rounded-xl text-[11px] font-bold text-amber flex items-center justify-center gap-1.5 transition-colors hover:bg-amber/08"
                style={{ border: '1px solid rgba(245,166,35,0.18)' }}>
                <Eye size={11} /> See full report
              </button>
            </div>
          </div>

          {/* ── MAIN PANEL ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 rounded-2xl overflow-hidden"
            style={{
              background: '#16273B',
              border: '1px solid rgba(255,255,255,0.08)',
              animation: 'slideUp 0.4s ease 0.1s both',
            }}>

            {/* tab bar */}
            <div className="flex items-center px-1 pt-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
                  className="relative flex items-center gap-2 px-5 py-4 text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
                  style={{ color: tab === t.id ? t.color : 'rgba(255,255,255,0.30)' }}>
                  {t.label}
                  {t.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular"
                      style={{
                        background: tab === t.id ? `${t.color}18` : 'rgba(255,255,255,0.05)',
                        color: tab === t.id ? t.color : 'rgba(255,255,255,0.25)',
                        border: `1px solid ${tab === t.id ? t.color + '30' : 'transparent'}`,
                      }}>{t.count}</span>
                  )}
                  {tab === t.id && (
                    <div className="absolute bottom-0 inset-x-3 h-0.5 rounded-full"
                      style={{ background: t.color, boxShadow: `0 0 6px ${t.color}80` }} />
                  )}
                </button>
              ))}
              {tab === 'recommendations' && (
                <button onClick={() => setWriteRecModal({ id: user?.id ?? '', name: 'someone' })}
                  className="ml-auto mr-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'rgba(184,241,53,0.12)', border: '1px solid rgba(184,241,53,0.25)', color: '#B8F135' }}>
                  <Quote size={11} /> Write
                </button>
              )}
            </div>

            {/* search bar */}
            {tab !== 'recommendations' && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="relative">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${tab}…`}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm placeholder-white/25 text-white focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#2F80ED' }} />
                </div>
              </div>
            )}

            {/* content area */}
            <div className="min-h-72">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(47,128,237,0.3)', borderTopColor: '#2F80ED' }} />
                </div>
              ) : (
                <>
                  {tab === 'followers' && (
                    filterBySearch(followers).length === 0
                      ? <EmptyState icon={Users} title="No followers yet" sub="Share your profile to attract followers and scouts" />
                      : filterBySearch(followers).map((u, i) => (
                          <UserRow key={u.id} user={u} isFollowing={myFollowingIds.has(u.id)}
                            onToggle={() => toggleFollow(u.id)} onMessage={() => {}} delay={i * 40} />
                        ))
                  )}

                  {tab === 'following' && (
                    filterBySearch(following).length === 0
                      ? <EmptyState icon={UserPlus} title="Not following anyone yet" sub="Discover athletes, scouts and coaches to follow" />
                      : filterBySearch(following).map((u, i) => (
                          <UserRow key={u.id} user={u} isFollowing={true}
                            onToggle={() => toggleFollow(u.id)} onMessage={() => {}} delay={i * 40} />
                        ))
                  )}

                  {tab === 'recommendations' && (
                    recommendations.length === 0
                      ? <EmptyState icon={Quote} title="No recommendations yet" sub="Ask teammates, coaches, or clubs to recommend you" />
                      : <div className="p-4 space-y-3">
                          {recommendations.map(rec => (
                            <RecommendationCard key={rec.id} rec={rec}
                              isOwn={rec.recipient_id === user?.id}
                              onDelete={async (id) => {
                                await supabase.from('recommendations').delete().eq('id', id);
                                setRecommendations(r => r.filter(x => x.id !== id));
                              }} />
                          ))}
                        </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

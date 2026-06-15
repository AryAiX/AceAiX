import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play, Upload, Star, Eye, Plus, Film, Tag, Trash2,
  Share2, Pencil, MoreHorizontal, TrendingUp,
  CheckCircle2, Loader2, X, Sparkles, BarChart2,
} from 'lucide-react';
import { useMyAthlete } from '../../hooks/useAthlete';
import { listMedia, createMedia, deleteMedia } from '../../api/portfolio';
import type { AthleteMedia } from '../../types';

/* ── display shape ─────────────────────────────────────────── */
interface MediaView {
  id: string;
  title: string;
  date: string;
  views: number;
  duration: string;
  thumbnail: string;
  tags: string[];
  featured: boolean;
  status: 'published' | 'processing';
  likes: number;
}

const FALLBACK_THUMB = 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=600';

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toMediaView(m: AthleteMedia): MediaView {
  return {
    id: m.id,
    title: m.title,
    date: fmtDate(m.created_at),
    views: m.views_count,
    duration: fmtDuration(m.duration_seconds),
    thumbnail: m.thumbnail_url || m.storage_url || FALLBACK_THUMB,
    tags: m.ai_tags ?? [],
    featured: m.is_featured,
    status: m.transcode_status === 'processing' ? 'processing' : 'published',
    likes: 0,
  };
}

const TAG_COLORS: Record<string, [string, string]> = {
  Goal:         ['#B8F135', 'rgba(184,241,53,0.12)'],
  Sprint:       ['#2F80ED', 'rgba(47,128,237,0.12)'],
  Header:       ['#1FB57A', 'rgba(31,181,122,0.12)'],
  'Long Shot':  ['#F5A623', 'rgba(245,166,35,0.12)'],
  Tackle:       ['#EF5350', 'rgba(239,83,80,0.12)'],
  Interception: ['#A78BFA', 'rgba(167,139,250,0.12)'],
  Dribble:      ['#2F80ED', 'rgba(47,128,237,0.12)'],
  Training:     ['#7C8DA6', 'rgba(124,141,166,0.12)'],
  'Free Kick':  ['#B8F135', 'rgba(184,241,53,0.12)'],
  Analysis:     ['#1FB57A', 'rgba(31,181,122,0.12)'],
};

function TagChip({ tag }: { tag: string }) {
  const [color, bg] = TAG_COLORS[tag] ?? ['#7C8DA6', 'rgba(124,141,166,0.12)'];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color, background: bg, border: `1px solid ${color}30` }}>
      <Tag size={7} />{tag}
    </span>
  );
}

/* ── stat bar at top ────────────────────────────────────────── */
function StatBar({ value, label, color, icon: Icon, delay }: {
  value: string; label: string; color: string; icon: React.ElementType; delay: number;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.19,1,0.22,1)',
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p className="text-base font-display font-bold tabular" style={{ color }}>{value}</p>
        <p className="text-[10px] text-white/35 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/* ── processing pulse badge ─────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === 'processing') return (
    <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(245,166,35,0.85)', color: '#0C1A2B', backdropFilter: 'blur(8px)' }}>
      <Loader2 size={8} className="animate-spin" /> Processing
    </div>
  );
  return null;
}

/* ── video card ─────────────────────────────────────────────── */
function VideoCard({ media, delay, onDelete }: { media: MediaView; delay: number; onDelete: (id: string) => void }) {
  const [vis, setVis] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(22,39,59,0.85)',
        border: `1px solid ${hovered ? 'rgba(47,128,237,0.30)' : 'rgba(255,255,255,0.09)'}`,
        boxShadow: hovered
          ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(47,128,237,0.10)'
          : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.35)',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
        transition: `opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.25s`,
      }}
    >
      {/* thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-navy-900">
        <img src={media.thumbnail} alt={media.title}
          className="w-full h-full object-cover"
          style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.55s cubic-bezier(0.19,1,0.22,1)' }} />

        {/* dark overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(12,26,43,0.75) 0%, transparent 55%)', opacity: hovered ? 1 : 0.6, transition: 'opacity 0.3s' }} />

        {/* play button */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.25s ease' }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255,255,255,0.30)',
              boxShadow: '0 0 24px rgba(255,255,255,0.15)',
              transform: hovered ? 'scale(1)' : 'scale(0.7)',
              transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
            <Play size={22} className="text-white ml-1" />
          </div>
        </div>

        {/* duration pill */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white tabular"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
          {media.duration}
        </div>

        {/* featured star */}
        {media.featured && (
          <div className="absolute top-2.5 right-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(184,241,53,0.90)', boxShadow: '0 0 12px rgba(184,241,53,0.5)' }}>
              <Star size={11} fill="#0C1A2B" stroke="none" />
            </div>
          </div>
        )}

        <StatusBadge status={media.status} />
      </div>

      {/* card body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 flex-1">{media.title}</h3>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-36 rounded-xl overflow-hidden z-20 py-1"
                style={{ background: '#16273B', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', animation: 'slideUp 0.2s ease both' }}>
                {[
                  { label: 'Edit',     icon: Pencil,  color: '#2F80ED', action: () => setMenuOpen(false) },
                  { label: 'Share',    icon: Share2,  color: '#1FB57A', action: () => setMenuOpen(false) },
                  { label: 'Delete',   icon: Trash2,  color: '#EF5350', action: () => { setMenuOpen(false); onDelete(media.id); } },
                ].map(item => (
                  <button key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/05"
                    style={{ color: item.color }}>
                    <item.icon size={12} />{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* tags */}
        <div className="flex flex-wrap gap-1.5">
          {media.tags.map(t => <TagChip key={t} tag={t} />)}
        </div>

        {/* footer stats */}
        <div className="flex items-center gap-3 mt-auto pt-2.5 border-t border-white/[0.07]">
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Eye size={10} />{media.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Star size={10} />{media.likes}
          </span>
          <span className="text-[11px] text-white/25 ml-auto">{media.date}</span>
        </div>
      </div>
    </div>
  );
}

/* ── upload modal ──────────────────────────────────────────── */
function UploadMediaModal({ athleteId, onClose, onUploaded }: {
  athleteId: string; onClose: () => void; onUploaded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', storage_url: '', thumbnail_url: '', tags: '' });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.title.trim() || !form.storage_url.trim()) { setError('Title and media URL are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await createMedia({
        athlete_id: athleteId,
        title: form.title.trim(),
        storage_url: form.storage_url.trim(),
        thumbnail_url: form.thumbnail_url.trim() || null,
        media_type: 'video',
        is_public: true,
        ai_tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setSaving(false);
      setDone(true);
      onUploaded();
      setTimeout(onClose, 800);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Failed to upload.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,26,43,0.85)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease both' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: '#16273B', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,83,80,0.14)', border: '1px solid rgba(239,83,80,0.25)' }}>
              <Upload size={14} style={{ color: '#EF5350' }} />
            </div>
            <h3 className="text-sm font-bold text-white">Upload Media</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors"><X size={13} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className="input-field" placeholder="e.g. Hat-trick vs Al Hilal" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Media URL</label>
            <input value={form.storage_url} onChange={e => set('storage_url', e.target.value)} className="input-field" placeholder="https://…" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Thumbnail URL <span className="text-white/20 normal-case">(optional)</span></label>
            <input value={form.thumbnail_url} onChange={e => set('thumbnail_url', e.target.value)} className="input-field" placeholder="https://…" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Tags <span className="text-white/20 normal-case">(comma separated)</span></label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} className="input-field" placeholder="Goal, Sprint, Header" />
          </div>
          {error && <p className="text-xs text-coral">{error}</p>}
        </div>
        <div className="px-6 pb-6">
          <button onClick={submit} disabled={saving || done}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: done ? '#1FB57A' : '#EF5350', color: '#fff', boxShadow: done ? '0 4px 20px rgba(31,181,122,0.4)' : '0 4px 20px rgba(239,83,80,0.35)' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : done ? <CheckCircle2 size={14} /> : <Upload size={14} />}
            {saving ? 'Uploading…' : done ? 'Uploaded!' : 'Upload Media'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────── */
export default function MediaPage() {
  const { data: athlete } = useMyAthlete();
  const athleteId = athlete?.id;
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<'all' | 'featured' | 'processing'>('all');
  const [mounted, setMounted] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const { data: rawMedia = [], isLoading } = useQuery({
    queryKey: ['media', athleteId],
    queryFn: () => listMedia(athleteId!),
    enabled: !!athleteId,
  });

  const media: MediaView[] = rawMedia.map(toMediaView);

  function invalidateMedia() {
    queryClient.invalidateQueries({ queryKey: ['media', athleteId] });
  }

  async function handleDelete(id: string) {
    await deleteMedia(id);
    invalidateMedia();
  }

  const filtered = media.filter(m =>
    filter === 'all' ? true :
    filter === 'featured' ? m.featured :
    m.status === 'processing'
  );

  const totalViews = media.reduce((s, m) => s + m.views, 0);
  const totalLikes = media.reduce((s, m) => s + m.likes, 0);

  return (
    <div className="max-w-6xl space-y-6 pb-10">

      {showUpload && athleteId && (
        <UploadMediaModal athleteId={athleteId} onClose={() => setShowUpload(false)} onUploaded={invalidateMedia} />
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0C1A2B 0%, #16273B 50%, #0A2040 100%)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-14px)',
          transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.19,1,0.22,1)',
        }}
      >
        {/* orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(239,83,80,0.12) 0%, transparent 70%)', transform: 'translate(35%,-35%)' }} />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(47,128,237,0.10) 0%, transparent 70%)', transform: 'translateY(50%)' }} />

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,83,80,0.12)', border: '1px solid rgba(239,83,80,0.25)', boxShadow: '0 0 24px rgba(239,83,80,0.15)' }}>
              <Film size={22} style={{ color: '#EF5350' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Media &amp; Highlights</h1>
              <p className="text-white/40 text-sm mt-0.5">Upload footage · AI auto-tags key moments</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition-all active:scale-95"
            style={{ background: '#EF5350', color: '#fff', boxShadow: '0 4px 20px rgba(239,83,80,0.40)' }}>
            <Upload size={15} /> Upload Video
          </button>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" />
        </div>

        {/* energy line */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,83,80,0.5) 30%, rgba(184,241,53,0.4) 70%, transparent)' }} />

        {/* stat row */}
        <div className="relative p-6 sm:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBar value={String(media.length)}          label="Total clips"   color="#2F80ED" icon={Film}       delay={80}  />
          <StatBar value={totalViews.toLocaleString()}        label="Total views"   color="#1FB57A" icon={Eye}        delay={140} />
          <StatBar value={totalLikes.toLocaleString()}        label="Total likes"   color="#B8F135" icon={Star}       delay={200} />
          <StatBar value={String(media.filter(m => m.featured).length)} label="Featured"  color="#EF5350" icon={TrendingUp} delay={260} />
        </div>
      </div>

      {/* ── AI BANNER ───────────────────────────────────────── */}
      {!aiDismissed && (
        <div
          className="relative rounded-2xl p-4 flex items-start gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(47,128,237,0.10) 0%, rgba(184,241,53,0.06) 100%)',
            border: '1px solid rgba(47,128,237,0.22)',
            animation: 'slideUp 0.4s ease 0.1s both',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(47,128,237,0.15)', border: '1px solid rgba(47,128,237,0.25)' }}>
            <Sparkles size={16} className="text-azure" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-azure mb-0.5">AI Clip Analysis Active</p>
            <p className="text-xs text-white/45 leading-relaxed">Upload raw match footage and our AI auto-tags goals, sprints, tackles &amp; key moments — then generates an optimized highlight reel for scouts.</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald">
                <CheckCircle2 size={11} /> 3 videos analyzed this week
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-volt">
                <BarChart2 size={11} /> 189 scout impressions
              </span>
            </div>
          </div>
          <button onClick={() => setAiDismissed(true)}
            className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/08 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── UPLOAD DROPZONE ─────────────────────────────────── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); }}
        onClick={() => setShowUpload(true)}
        className="relative rounded-2xl cursor-pointer overflow-hidden group"
        style={{
          padding: '2.5rem 2rem',
          border: `2px dashed ${dragOver ? '#2F80ED' : 'rgba(255,255,255,0.12)'}`,
          background: dragOver ? 'rgba(47,128,237,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'border-color 0.2s, background 0.2s',
          animation: 'slideUp 0.4s ease 0.15s both',
        }}
      >
        {/* hover shimmer */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(135deg, rgba(47,128,237,0.04) 0%, rgba(184,241,53,0.03) 100%)' }} />

        <div className="relative flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: dragOver ? 'rgba(47,128,237,0.18)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${dragOver ? 'rgba(47,128,237,0.40)' : 'rgba(255,255,255,0.10)'}`,
              transform: dragOver ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, border-color 0.2s',
              boxShadow: dragOver ? '0 0 24px rgba(47,128,237,0.25)' : 'none',
            }}>
            <Upload size={26} style={{ color: dragOver ? '#2F80ED' : 'rgba(255,255,255,0.30)' }} />
          </div>
          <div className="flex-1">
            <p className="text-white/70 font-semibold text-sm">
              {dragOver ? 'Drop to upload' : 'Drag & drop video files here'}
            </p>
            <p className="text-white/30 text-xs mt-1">MP4, MOV, AVI · up to 2 GB per file</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
              {['Auto-tagging', 'Highlight reels', 'Scout delivery'].map((f, i) => (
                <span key={f} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: ['#2F80ED', '#B8F135', '#1FB57A'][i] }}>
                  <CheckCircle2 size={9} />{f}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowUpload(true); }}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'rgba(47,128,237,0.15)', border: '1px solid rgba(47,128,237,0.30)', color: '#2F80ED' }}>
            <Plus size={13} /> Browse files
          </button>
        </div>
      </div>

      {/* ── FILTER TABS + GRID ──────────────────────────────── */}
      <div>
        {/* filter row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {([['all', 'All Clips'], ['featured', 'Featured'], ['processing', 'Processing']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: filter === id ? 'rgba(47,128,237,0.15)' : 'transparent',
                  border: filter === id ? '1px solid rgba(47,128,237,0.28)' : '1px solid transparent',
                  color: filter === id ? '#2F80ED' : 'rgba(255,255,255,0.35)',
                }}>
                {label}
                {id === 'processing' && media.some(m => m.status === 'processing') && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber align-middle" />
                )}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-white/25 font-medium">{filtered.length} clip{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="text-azure animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Film size={24} className="text-white/20" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">No clips yet</p>
            <p className="text-xs text-white/35">Upload your first highlight to showcase your game.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m, i) => (
              <VideoCard key={m.id} media={m} delay={i * 60} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

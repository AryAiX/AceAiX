import React, { useState, useEffect, useRef } from 'react';
import {
  Save, User, Camera, MapPin, Flag, Ruler, Weight, Zap,
  ChevronRight, ShieldCheck, Check, Loader2,
  Globe, Trophy, Footprints, Activity, Shirt, Info,
  ArrowUpRight, Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useMyAthlete } from '../../hooks/useAthlete';
import { updateAthlete } from '../../api/athletes';
import { updateUserProfile } from '../../api/profiles';

/* ── tiny animated completeness ring ───────────────────────── */
function CompletenessRing({ pct }: { pct: number }) {
  const r = 26, sw = 4;
  const circ = 2 * Math.PI * r;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  const offset = circ * (1 - pct / 100);
  return (
    <div className="relative" style={{ width: 64, height: 64 }}>
      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle cx={32} cy={32} r={r} fill="none"
          stroke="url(#cpGrad)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={mounted ? offset : circ}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.3s', filter: 'drop-shadow(0 0 4px rgba(184,241,53,0.6))' }}
        />
        <defs>
          <linearGradient id="cpGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4FF72" />
            <stop offset="100%" stopColor="#B8F135" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold tabular" style={{ color: '#B8F135', fontFamily: "'Clash Display', sans-serif" }}>{pct}%</span>
      </div>
    </div>
  );
}

/* ── section header strip ────────────────────────────────── */
function SectionHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}30, transparent)` }} />
    </div>
  );
}

/* ── animated field wrapper ─────────────────────────────── */
function Field({ label, icon: Icon, children, delay = 0 }: {
  label: string; icon?: React.ElementType; children: React.ReactNode; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.19,1,0.22,1)',
      }}>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-white/35 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />}
        {children}
      </div>
    </div>
  );
}

/* ── tab definition ──────────────────────────────────────── */
const TABS = [
  { id: 'identity', label: 'Identity',  icon: User,      color: '#2F80ED' },
  { id: 'athletic', label: 'Athletic',  icon: Activity,  color: '#B8F135' },
  { id: 'physical', label: 'Physical',  icon: Ruler,     color: '#1FB57A' },
];

/* ── checklist ───────────────────────────────────────────── */
const CHECKLIST_FIELDS: { label: string; key: string }[] = [
  { label: 'Full name',       key: 'full_name'        },
  { label: 'Bio',             key: 'bio'              },
  { label: 'Nationality',     key: 'nationality'      },
  { label: 'Sport',           key: 'sport'            },
  { label: 'Primary position',key: 'position_primary' },
  { label: 'Current club',    key: 'current_club'     },
  { label: 'Height',          key: 'height_cm'        },
  { label: 'Weight',          key: 'weight_kg'        },
];

export default function AthleteProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { data: athlete, isLoading: loading } = useMyAthlete();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    sport: '',
    position_primary: '',
    position_secondary: '',
    height_cm: '',
    weight_kg: '',
    nationality: '',
    current_club: '',
    level: 'amateur',
    dominant_foot: '',
    city: '',
    country: '',
  });

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    if (!profile) return;
    setForm(f => ({ ...f, full_name: profile.full_name || '', city: profile.city || '', country: profile.country || '' }));
  }, [profile]);

  useEffect(() => {
    if (!athlete) return;
    setForm(f => ({
      ...f,
      bio: athlete.bio || '',
      sport: athlete.sport || '',
      position_primary: athlete.position_primary || '',
      position_secondary: athlete.position_secondary || '',
      height_cm: athlete.height_cm ? String(athlete.height_cm) : '',
      weight_kg: athlete.weight_kg ? String(athlete.weight_kg) : '',
      nationality: athlete.nationality || '',
      current_club: athlete.current_club || '',
      level: athlete.level || 'amateur',
      dominant_foot: athlete.dominant_foot || '',
    }));
  }, [athlete]);

  const completeness = Math.round(
    (CHECKLIST_FIELDS.filter(f => !!(form as Record<string, string>)[f.key]).length / CHECKLIST_FIELDS.length) * 100
  );

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    await updateUserProfile(profile.id, {
      full_name: form.full_name, bio: form.bio, city: form.city, country: form.country,
    });
    if (athlete) {
      await updateAthlete(athlete.id, {
        sport: form.sport, position_primary: form.position_primary,
        position_secondary: form.position_secondary,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        nationality: form.nationality, current_club: form.current_club,
        level: form.level, dominant_foot: form.dominant_foot, bio: form.bio,
      });
      queryClient.invalidateQueries({ queryKey: ['my-athlete'] });
    }
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-azure/10 border border-azure/20 flex items-center justify-center">
            <Loader2 size={18} className="text-azure animate-spin" />
          </div>
          <p className="text-xs text-white/30 uppercase tracking-widest">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl pb-12 space-y-6">

      {/* ── HERO CARD ────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0C1A2B 0%, #16273B 45%, #0A2040 100%)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.19,1,0.22,1)',
        }}
      >
        {/* ambient orbs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(47,128,237,0.14) 0%, transparent 70%)', transform: 'translate(40%,-40%)' }} />
        <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(184,241,53,0.08) 0%, transparent 70%)', transform: 'translate(-50%,50%)' }} />

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'rgba(47,128,237,0.12)', border: '2px solid rgba(47,128,237,0.30)', boxShadow: '0 0 32px rgba(47,128,237,0.20)' }}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User size={36} className="text-azure/60" />}
            </div>
            <button
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background: '#2F80ED', boxShadow: '0 4px 12px rgba(47,128,237,0.5)' }}
            >
              <Camera size={13} className="text-white" />
            </button>
          </div>

          {/* name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white truncate">
                {profile?.full_name || 'Your Name'}
              </h1>
              {profile?.is_verified && (
                <ShieldCheck size={18} className="text-emerald flex-shrink-0" />
              )}
            </div>
            <p className="text-white/45 text-sm mb-3">
              {form.position_primary || 'Position'} · {form.sport || 'Sport'} · {form.level}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(47,128,237,0.12)', border: '1px solid rgba(47,128,237,0.25)', color: '#2F80ED' }}>
                <Zap size={9} /> AceAiX Profile
              </span>
              {form.current_club && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                  <Shirt size={9} /> {form.current_club}
                </span>
              )}
              {form.city && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                  <MapPin size={9} /> {form.city}
                </span>
              )}
            </div>
          </div>

          {/* completeness ring */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <CompletenessRing pct={completeness} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Complete</p>
          </div>

          {/* save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60"
            style={{
              background: saved ? '#1FB57A' : '#B8F135',
              color: '#0C1A2B',
              boxShadow: saved ? '0 4px 20px rgba(31,181,122,0.4)' : '0 4px 20px rgba(184,241,53,0.35)',
              transform: saved ? 'scale(1.04)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {saving
              ? <Loader2 size={15} className="animate-spin" />
              : saved
                ? <Check size={15} />
                : <Save size={15} />
            }
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>

        {/* energy line */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(47,128,237,0.4) 30%, rgba(184,241,53,0.5) 60%, transparent 100%)' }} />

        {/* profile strength bar */}
        <div className="relative px-6 sm:px-8 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Sparkles size={12} className="text-volt" />
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Profile Strength</span>
          </div>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${completeness}%`,
                background: 'linear-gradient(90deg, #2F80ED 0%, #B8F135 100%)',
                boxShadow: '0 0 8px rgba(184,241,53,0.4)',
                transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1) 0.4s',
              }}
            />
          </div>
          <span className="text-[11px] font-bold tabular" style={{ color: completeness >= 80 ? '#B8F135' : '#2F80ED' }}>{completeness}%</span>
          <a href={`/athletes/${profile?.id}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-azure/70 hover:text-azure transition-colors ml-2">
            Preview <ArrowUpRight size={10} />
          </a>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease 0.1s, transform 0.4s cubic-bezier(0.19,1,0.22,1) 0.1s',
        }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: active ? `${tab.color}16` : 'transparent',
                border: active ? `1px solid ${tab.color}30` : '1px solid transparent',
                color: active ? tab.color : 'rgba(255,255,255,0.35)',
                boxShadow: active ? `0 0 20px ${tab.color}18` : 'none',
              }}
            >
              <tab.icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── IDENTITY TAB ─────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div
          className="card p-6 space-y-6"
          style={{ animation: 'slideUp 0.35s cubic-bezier(0.19,1,0.22,1) both' }}
        >
          <SectionHeader icon={User} label="Personal Information" color="#2F80ED" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Full Name" icon={User} delay={0}>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="input-field pl-9" placeholder="Your full name" />
            </Field>

            <Field label="Nationality" icon={Flag} delay={40}>
              <input value={form.nationality} onChange={e => set('nationality', e.target.value)}
                className="input-field pl-9" placeholder="e.g. UAE" />
            </Field>

            <Field label="City" icon={MapPin} delay={80}>
              <input value={form.city} onChange={e => set('city', e.target.value)}
                className="input-field pl-9" placeholder="City" />
            </Field>

            <Field label="Country" icon={Globe} delay={120}>
              <input value={form.country} onChange={e => set('country', e.target.value)}
                className="input-field pl-9" placeholder="Country" />
            </Field>
          </div>

          <Field label="Bio — describe your style & achievements" icon={Info} delay={160}>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
              rows={4}
              className="input-field resize-none pl-9 pt-3"
              placeholder="Describe your playing style, achievements, and career goals…" />
          </Field>

          {/* bio character bar */}
          <div className="flex items-center justify-between text-[10px] text-white/25 -mt-2">
            <span>Min 60 chars recommended</span>
            <span className={form.bio.length >= 60 ? 'text-emerald' : ''}>{form.bio.length} chars</span>
          </div>
        </div>
      )}

      {/* ── ATHLETIC TAB ─────────────────────────────────────── */}
      {activeTab === 'athletic' && (
        <div
          className="card p-6 space-y-6"
          style={{ animation: 'slideUp 0.35s cubic-bezier(0.19,1,0.22,1) both' }}
        >
          <SectionHeader icon={Activity} label="Athletic Details" color="#B8F135" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Sport" icon={Trophy} delay={0}>
              <input value={form.sport} onChange={e => set('sport', e.target.value)}
                className="input-field pl-9" placeholder="e.g. Football" />
            </Field>

            <Field label="Career Level" delay={40}>
              <select value={form.level} onChange={e => set('level', e.target.value)} className="input-field">
                <option value="amateur">Amateur</option>
                <option value="semi-pro">Semi-Pro</option>
                <option value="professional">Professional</option>
                <option value="elite">Elite</option>
              </select>
            </Field>

            <Field label="Primary Position" icon={Shirt} delay={80}>
              <input value={form.position_primary} onChange={e => set('position_primary', e.target.value)}
                className="input-field pl-9" placeholder="e.g. Striker" />
            </Field>

            <Field label="Secondary Position" icon={Shirt} delay={120}>
              <input value={form.position_secondary} onChange={e => set('position_secondary', e.target.value)}
                className="input-field pl-9" placeholder="Optional" />
            </Field>

            <Field label="Current Club" icon={Zap} delay={160}>
              <input value={form.current_club} onChange={e => set('current_club', e.target.value)}
                className="input-field pl-9" placeholder="Club name" />
            </Field>

            <Field label="Dominant Foot" icon={Footprints} delay={200}>
              <select value={form.dominant_foot} onChange={e => set('dominant_foot', e.target.value)} className="input-field">
                <option value="">Select</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="both">Both</option>
              </select>
            </Field>
          </div>

          {/* level pills */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-3">Quick-set Level</p>
            <div className="flex flex-wrap gap-2">
              {(['amateur', 'semi-pro', 'professional', 'elite'] as const).map((lvl, i) => {
                const colors = ['#7C8DA6', '#2F80ED', '#1FB57A', '#B8F135'];
                const active = form.level === lvl;
                return (
                  <button key={lvl} onClick={() => set('level', lvl)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-200"
                    style={{
                      background: active ? `${colors[i]}20` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? colors[i] + '50' : 'rgba(255,255,255,0.10)'}`,
                      color: active ? colors[i] : 'rgba(255,255,255,0.40)',
                      boxShadow: active ? `0 0 14px ${colors[i]}20` : 'none',
                    }}>
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PHYSICAL TAB ─────────────────────────────────────── */}
      {activeTab === 'physical' && (
        <div
          className="card p-6 space-y-6"
          style={{ animation: 'slideUp 0.35s cubic-bezier(0.19,1,0.22,1) both' }}
        >
          <SectionHeader icon={Ruler} label="Physical Measurements" color="#1FB57A" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Height (cm)" icon={Ruler} delay={0}>
              <input type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)}
                className="input-field pl-9" placeholder="e.g. 180" min={140} max={220} />
            </Field>

            <Field label="Weight (kg)" icon={Weight} delay={40}>
              <input type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
                className="input-field pl-9" placeholder="e.g. 75" min={50} max={120} />
            </Field>
          </div>

          {/* physical stat visualisation */}
          {(form.height_cm || form.weight_kg) && (
            <div
              className="grid grid-cols-2 gap-4 pt-2"
              style={{ animation: 'fadeIn 0.4s ease both' }}
            >
              {form.height_cm && (
                <div className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(31,181,122,0.06)', border: '1px solid rgba(31,181,122,0.15)' }}>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Height</p>
                  <p className="text-3xl font-display font-bold text-emerald tabular">{form.height_cm}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">cm</p>
                </div>
              )}
              {form.weight_kg && (
                <div className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(47,128,237,0.06)', border: '1px solid rgba(47,128,237,0.15)' }}>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Weight</p>
                  <p className="text-3xl font-display font-bold text-azure tabular">{form.weight_kg}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">kg</p>
                </div>
              )}
            </div>
          )}

          {/* BMI hint */}
          {form.height_cm && form.weight_kg && (() => {
            const h = parseFloat(form.height_cm) / 100;
            const w = parseFloat(form.weight_kg);
            if (!h || !w) return null;
            const bmi = w / (h * h);
            const status = bmi < 18.5 ? ['Underweight', '#F5A623']
              : bmi < 25 ? ['Optimal Range', '#1FB57A']
              : bmi < 30 ? ['Slightly Above', '#F5A623']
              : ['Above Range', '#EF5350'];
            return (
              <div className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: `${status[1]}0C`, border: `1px solid ${status[1]}25` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${status[1]}18` }}>
                  <Activity size={16} style={{ color: status[1] as string }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: status[1] as string }}>BMI {bmi.toFixed(1)} — {status[0]}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">Based on entered height &amp; weight</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── COMPLETION CHECKLIST ─────────────────────────────── */}
      <div
        className="card p-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease 0.25s, transform 0.5s cubic-bezier(0.19,1,0.22,1) 0.25s',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChevronRight size={14} className="text-volt" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Profile Checklist</span>
          </div>
          <span className="text-xs font-bold tabular" style={{ color: completeness >= 80 ? '#B8F135' : '#2F80ED' }}>
            {CHECKLIST_FIELDS.filter(f => !!(form as Record<string, string>)[f.key]).length}/{CHECKLIST_FIELDS.length} done
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHECKLIST_FIELDS.map((item, i) => {
            const done = !!(form as Record<string, string>)[item.key];
            return (
              <div key={item.key}
                className="flex items-center gap-2.5 text-xs"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-8px)',
                  transition: `opacity 0.35s ease ${i * 40}ms, transform 0.35s cubic-bezier(0.19,1,0.22,1) ${i * 40}ms`,
                }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    background: done ? 'rgba(31,181,122,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${done ? 'rgba(31,181,122,0.35)' : 'rgba(255,255,255,0.10)'}`,
                  }}>
                  {done
                    ? <Check size={9} className="text-emerald" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                </div>
                <span style={{ color: done ? 'rgba(244,248,252,0.75)' : 'rgba(255,255,255,0.25)', textDecoration: done ? 'none' : 'none' }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Mail, Lock, Eye, EyeOff, ArrowRight,
  ShieldCheck, TrendingUp, Users, Star, ChevronRight,
  Trophy, Stethoscope, Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ── login role groups ──────────────────────────────────────── */
const LOGIN_GROUPS = [
  {
    id: 'athlete' as const,
    label: 'Athlete',
    desc: 'Access your performance dashboard',
    color: '#B8F135',
    textDark: true,
    icon: Trophy,
    subLabels: null as null | string[],
  },
  {
    id: 'scout' as const,
    label: 'Scout / Coach / Club',
    desc: 'Recruiter & talent management tools',
    color: '#2F80ED',
    textDark: false,
    icon: Users,
    subLabels: ['Scout / Recruiter', 'Coach', 'Club / Team'] as string[],
  },
  {
    id: 'medical' as const,
    label: 'Medical Partner',
    desc: 'Manage health records & clearances',
    color: '#1FB57A',
    textDark: false,
    icon: Stethoscope,
    subLabels: null as null | string[],
  },
  {
    id: 'super_admin' as const,
    label: 'Super Admin',
    desc: 'Restricted platform ownership access',
    color: '#EF5350',
    textDark: false,
    icon: ShieldCheck,
    subLabels: null as null | string[],
  },
] as const;

type GroupId = typeof LOGIN_GROUPS[number]['id'];

const TRUST_STATS = [
  { icon: Users,       value: '127K+', label: 'Athletes' },
  { icon: TrendingUp,  value: '94%',   label: 'Placement Rate' },
  { icon: ShieldCheck, value: '100%',  label: 'Verified Data' },
  { icon: Star,        value: '4.9',   label: 'App Rating' },
];

const FEATURES = [
  'AI-powered performance analytics',
  'Verified athlete profiles & credentials',
  'Direct club & scout connections',
  'Career trajectory forecasting',
];

const TICKER_ITEMS = [
  'Verified profiles · Real athlete data',
  'Scout network · Consent-first contact',
  'Medical clearance · Partner-issued records',
  'AI insights · Based on verified performance',
  'Career growth · Portfolio-first discovery',
  'Opportunities · Matched from live listings',
];

export default function LoginPage() {
  const [roleStep, setRoleStep]         = useState(true);
  const [activeId, setActiveId]         = useState<GroupId>('athlete');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [redirecting, setRedirecting]   = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mounted, setMounted]           = useState(false);

  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const formRef  = useRef<HTMLFormElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    if (!redirecting || !user || !profile) return;
    const role = profile.role;
    if (role === 'athlete') navigate('/athlete/dashboard');
    else if (role === 'scout' || role === 'club') navigate('/recruiter/dashboard');
    else if (role === 'medical_partner') navigate('/partner/dashboard');
    else if (role === 'admin' || role === 'super_admin') navigate('/admin/dashboard');
    else navigate('/athlete/dashboard');
  }, [redirecting, user, profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) { setError(err.message || 'Invalid login credentials'); setLoading(false); return; }
    setRedirecting(true);
  }

  function pickGroup(id: GroupId) {
    setActiveId(id);
    setError('');
  }

  const activeGroup = LOGIN_GROUPS.find(g => g.id === activeId)!;
  const accent = activeGroup.color;

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#0C1A2B' }}>

      {/* ── LEFT panel ──────────────────────────────────── */}
      <div className="hidden lg:flex flex-col relative w-[52%] xl:w-[56%] overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0a1628 0%,#0C1A2B 50%,#091220 100%)' }}>
        {/* orbs */}
        <div className="absolute top-[-120px] left-[-80px] w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(47,128,237,0.18) 0%,transparent 70%)', animation: 'floatOrb 14s ease-in-out infinite' }} />
        <div className="absolute bottom-[-100px] right-[-60px] w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(184,241,53,0.12) 0%,transparent 70%)', animation: 'floatOrbAlt 18s ease-in-out infinite' }} />
        <div className="absolute top-[40%] right-[10%] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(31,181,122,0.10) 0%,transparent 70%)', animation: 'floatOrb 22s ease-in-out infinite reverse' }} />
        {/* grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
          <div style={{ animation: mounted ? 'slideInLeft 0.6s cubic-bezier(0.19,1,0.22,1) both' : 'none', opacity: mounted ? undefined : 0 }}>
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-azure rounded-xl flex items-center justify-center" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
                <Zap size={18} className="text-white" fill="white" />
              </div>
              <span className="font-display font-bold text-white text-lg">AceAi<span className="text-azure">X</span></span>
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div style={{ animation: mounted ? 'slideInLeft 0.7s 0.15s cubic-bezier(0.19,1,0.22,1) both' : 'none', opacity: mounted ? undefined : 0 }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border mb-6"
                style={{ color: '#B8F135', borderColor: 'rgba(184,241,53,0.25)', background: 'rgba(184,241,53,0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-volt animate-pulse" />
                The Football Intelligence Platform
              </span>
              <h1 className="text-4xl xl:text-5xl font-display font-bold text-white leading-[1.1] mb-5">
                Your career,<br />
                <span style={{ background: 'linear-gradient(90deg,#2F80ED,#B8F135,#2F80ED)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>
                  data-driven.
                </span>
              </h1>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                Connect with verified clubs, coaches, and scouts. Get your AceAiX performance score and unlock opportunities across global football.
              </p>
            </div>

            <div className="space-y-3 mb-10"
              style={{ animation: mounted ? 'slideInLeft 0.7s 0.3s cubic-bezier(0.19,1,0.22,1) both' : 'none', opacity: mounted ? undefined : 0 }}>
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-azure/15 border border-azure/30 flex items-center justify-center flex-shrink-0">
                    <ChevronRight size={10} className="text-azure" />
                  </div>
                  <span className="text-sm text-white/60">{f}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3"
              style={{ animation: mounted ? 'slideInLeft 0.7s 0.45s cubic-bezier(0.19,1,0.22,1) both' : 'none', opacity: mounted ? undefined : 0 }}>
              {TRUST_STATS.map(({ icon: Icon, value, label }, i) => (
                <div key={i} className="rounded-2xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon size={16} className="text-azure mx-auto mb-1.5 opacity-70" />
                  <div className="text-white font-bold text-base font-display">{value}</div>
                  <div className="text-white/35 text-[10px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ticker */}
          <div className="overflow-hidden py-4 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)', animation: mounted ? 'fadeIn 0.6s 0.8s both' : 'none', opacity: mounted ? undefined : 0 }}>
            <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'ticker 30s linear infinite' }}>
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="text-xs text-white/25 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-azure/40 flex-shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{ background: `radial-gradient(ellipse at 60% 40%, ${accent}09 0%, transparent 60%)` }} />

        <div className="relative w-full max-w-[420px]"
          style={{ animation: mounted ? 'slideInRight 0.65s 0.1s cubic-bezier(0.19,1,0.22,1) both' : 'none', opacity: mounted ? undefined : 0 }}>

          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-azure rounded-xl flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-white text-base">AceAi<span className="text-azure">X</span></span>
          </div>

          {/* ── STEP 1: role selector ─────────────────── */}
          {roleStep && (
            <div style={{ animation: 'slideUp 0.35s ease both' }}>
              <div className="mb-6">
                <h2 className="text-2xl font-display font-bold text-white mb-1.5">Welcome back</h2>
                <p className="text-white/40 text-sm">Sign in as…</p>
              </div>

              <div className="space-y-2.5">
                {LOGIN_GROUPS.map(group => {
                  const isActive = activeId === group.id;
                  return (
                    <button key={group.id}
                      onClick={() => pickGroup(group.id)}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-200"
                      style={{
                        background: isActive ? `${group.color}0D` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? group.color + '35' : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: isActive ? `0 0 20px ${group.color}10` : 'none',
                      }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${group.color}14`, border: `1px solid ${group.color}25` }}>
                        <group.icon size={17} style={{ color: group.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{group.label}</p>
                        <p className="text-[11px] text-white/35 mt-0.5">{group.desc}</p>
                        {group.subLabels && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {group.subLabels.map((s: string) => (
                              <span key={s} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                style={{ background: `${group.color}14`, color: group.color, border: `1px solid ${group.color}25` }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ borderColor: isActive ? group.color : 'rgba(255,255,255,0.18)', background: isActive ? group.color : 'transparent' }}>
                        {isActive && <Check size={9} className={group.textDark ? 'text-black' : 'text-white'} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setRoleStep(false)}
                className="w-full mt-5 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: accent, color: activeGroup.textDark ? '#0C1A2B' : '#fff', boxShadow: `0 4px 20px ${accent}40` }}>
                Continue <ArrowRight size={15} />
              </button>

              <p className="text-center text-xs text-white/25 mt-5">
                No account yet?{' '}
                <Link to="/auth/register" className="font-semibold" style={{ color: '#2F80ED' }}>Create one free</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: credentials ──────────────────── */}
          {!roleStep && (
            <div style={{ animation: 'slideUp 0.35s ease both' }}>
              {/* back + role badge */}
              <button onClick={() => setRoleStep(true)}
                className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 mb-5 transition-colors">
                <ChevronRight size={13} className="rotate-180" /> Change role
              </button>

              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
                style={{ background: `${accent}0C`, border: `1px solid ${accent}28` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}>
                  <activeGroup.icon size={14} style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{activeGroup.label}</p>
                  <p className="text-[11px] text-white/35">{activeGroup.desc}</p>
                </div>
              </div>

              <h2 className="text-xl font-display font-bold text-white mb-5">Sign in</h2>

              {/* form */}
              <div className="rounded-3xl p-6 mb-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)' }}>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Email address</label>
                    <div className="relative rounded-xl transition-all duration-200"
                      style={{ boxShadow: focusedField === 'email' ? `0 0 0 2px ${accent}50` : '0 0 0 1px rgba(255,255,255,0.09)' }}>
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                        style={{ color: focusedField === 'email' ? accent : 'rgba(255,255,255,0.25)' }} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                        placeholder="you@example.com"
                        className="w-full bg-white/[0.03] rounded-xl px-4 pl-10 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.06] transition-all"
                        required />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Password</label>
                      <button type="button" className="text-[11px] transition-colors"
                        style={{ color: `${accent}90` }}>Forgot password?</button>
                    </div>
                    <div className="relative rounded-xl transition-all duration-200"
                      style={{ boxShadow: focusedField === 'password' ? `0 0 0 2px ${accent}50` : '0 0 0 1px rgba(255,255,255,0.09)' }}>
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                        style={{ color: focusedField === 'password' ? accent : 'rgba(255,255,255,0.25)' }} />
                      <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                        placeholder="••••••••"
                        className="w-full bg-white/[0.03] rounded-xl px-4 pl-10 pr-11 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.06] transition-all"
                        required />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
                      style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)', color: '#EF5350', animation: 'slideUp 0.3s both' }}>
                      <span className="mt-0.5 flex-shrink-0">!</span>{error}
                    </div>
                  )}

                  <button type="submit" disabled={loading || redirecting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-60"
                    style={{ background: loading || redirecting ? `${accent}70` : accent, color: activeGroup.textDark ? '#0C1A2B' : '#fff', boxShadow: loading || redirecting ? 'none' : `0 4px 20px ${accent}40` }}>
                    {loading || redirecting
                      ? <span className="w-4 h-4 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: activeGroup.textDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }} />
                      : <>Sign In <ArrowRight size={15} /></>
                    }
                  </button>
                </form>
              </div>

              <p className="text-center text-xs text-white/25">
                No account yet?{' '}
                <Link to="/auth/register" className="font-semibold" style={{ color: '#2F80ED' }}>Create one free</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

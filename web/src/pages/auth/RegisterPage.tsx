import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight,
  ChevronLeft, Check, Trophy, Users, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

/* ─────────────────────────────────────────────────────────────
   Role groups — Coach and Club both map to role='club' in the DB
   (they share the recruiter dashboard)
───────────────────────────────────────────────────────────── */
const ROLE_GROUPS = [
  {
    id: 'athlete' as const,
    label: 'Athlete',
    desc: 'Build your verified performance portfolio and get discovered',
    color: '#B8F135',
    textDark: true,
    icon: Trophy,
    dbRole: 'athlete' as UserRole,
    subRoles: null,
  },
  {
    id: 'scout-group' as const,
    label: 'Scout / Coach / Club',
    desc: 'Discover talent, manage players and run recruitment',
    color: '#2F80ED',
    textDark: false,
    icon: Users,
    dbRole: 'scout' as UserRole,          // default sub-role
    subRoles: [
      { label: 'Scout / Recruiter', desc: 'Search and track athlete talent intelligently', dbRole: 'scout' as UserRole },
      { label: 'Coach',             desc: 'Manage players, sessions and development',      dbRole: 'club'  as UserRole },
      { label: 'Club / Team',       desc: 'Recruitment pipeline and squad analytics',      dbRole: 'club'  as UserRole },
    ],
  },
  {
    id: 'medical' as const,
    label: 'Medical Partner',
    desc: 'Issue and verify athlete health clearances',
    color: '#1FB57A',
    textDark: false,
    icon: Stethoscope,
    dbRole: 'medical_partner' as UserRole,
    subRoles: null,
  },
] as const;

type GroupId = typeof ROLE_GROUPS[number]['id'];

interface Selection {
  groupId: GroupId;
  dbRole: UserRole;
  label: string;
  color: string;
  textDark: boolean;
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [expanded, setExpanded] = useState<GroupId | null>('scout-group');
  const [sel, setSel] = useState<Selection>({
    groupId: 'athlete',
    dbRole: 'athlete',
    label: 'Athlete',
    color: '#B8F135',
    textDark: true,
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  const [mounted, setMounted]   = useState(false);

  const { signUp } = useAuth();
  const navigate   = useNavigate();

  useEffect(() => {
    // honour ?role= param
    const param = searchParams.get('role') as UserRole | null;
    if (param === 'scout' || param === 'club') {
      setSel({ groupId: 'scout-group', dbRole: param, label: param === 'scout' ? 'Scout / Recruiter' : 'Club / Team', color: '#2F80ED', textDark: false });
      setExpanded('scout-group');
    } else if (param === 'medical_partner') {
      setSel({ groupId: 'medical', dbRole: 'medical_partner', label: 'Medical Partner', color: '#1FB57A', textDark: false });
    }
    requestAnimationFrame(() => setMounted(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await signUp(email, password, sel.dbRole, fullName);
    if (err) { setError(err.message || 'Registration failed'); setLoading(false); return; }
    setDone(true);
    setLoading(false);
    setTimeout(() => navigate('/dashboard'), 900);
  }

  const accent = sel.color;

  /* ── helpers ──────────────────────────────────────────────── */
  function selectGroup(g: typeof ROLE_GROUPS[number]) {
    if (g.subRoles) {
      setExpanded(prev => prev === g.id ? null : g.id);
      if (!g.subRoles.find(s => s.label === sel.label)) {
        // pick first sub-role
        setSel({ groupId: g.id, dbRole: g.subRoles[0].dbRole, label: g.subRoles[0].label, color: g.color, textDark: g.textDark });
      }
    } else {
      setSel({ groupId: g.id, dbRole: g.dbRole, label: g.label, color: g.color, textDark: g.textDark });
      setExpanded(null);
    }
  }

  function selectSub(g: typeof ROLE_GROUPS[number], sub: { label: string; desc: string; dbRole: UserRole }) {
    setSel({ groupId: g.id, dbRole: sub.dbRole, label: sub.label, color: g.color, textDark: g.textDark });
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#0C1A2B' }}>

      {/* ── LEFT brand strip (desktop) ───────────────────── */}
      <div className="hidden lg:flex flex-col w-[44%] xl:w-[48%] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#091220 0%,#0C1A2B 60%,#0A1E14 100%)' }}>
        {/* orbs */}
        <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(184,241,53,0.09) 0%,transparent 70%)', transform: 'translate(40%,-40%)' }} />
        <div className="absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(47,128,237,0.09) 0%,transparent 70%)', transform: 'translate(-40%,40%)' }} />
        {/* grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-auto">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#2F80ED', boxShadow: '0 0 20px rgba(47,128,237,0.4)' }}>
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-white">AceAi<span style={{ color: '#2F80ED' }}>X</span></span>
          </Link>

          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 w-fit"
              style={{ color: '#B8F135', background: 'rgba(184,241,53,0.08)', border: '1px solid rgba(184,241,53,0.20)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-volt animate-pulse" />
              The Football Intelligence Platform
            </span>
            <h2 className="text-4xl xl:text-5xl font-display font-bold text-white leading-[1.1] mb-4">
              One platform,<br />
              <span style={{ background: 'linear-gradient(90deg,#2F80ED,#B8F135)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                every role.
              </span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8">
              Athletes, scouts, coaches, clubs and medical partners — AceAiX is purpose-built for every stakeholder in football.
            </p>

            {/* role list */}
            <div className="space-y-2.5">
              {[
                { label: 'Athlete',            color: '#B8F135', sub: 'Get discovered by global clubs' },
                { label: 'Scout / Recruiter',  color: '#2F80ED', sub: 'Find & track talent'           },
                { label: 'Coach',              color: '#2F80ED', sub: 'Develop your players'          },
                { label: 'Club / Team',        color: '#2F80ED', sub: 'Manage recruitment'            },
                { label: 'Medical Partner',    color: '#1FB57A', sub: 'Issue verified clearances'     },
              ].map((r, i) => (
                <div key={r.label}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                  style={{
                    background: `${r.color}08`,
                    border: `1px solid ${r.color}18`,
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateX(0)' : 'translateX(-16px)',
                    transition: `opacity 0.4s ease ${i * 0.07}s, transform 0.4s cubic-bezier(0.19,1,0.22,1) ${i * 0.07}s`,
                  }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: r.color, boxShadow: `0 0 6px ${r.color}80` }} />
                  <span className="text-sm font-semibold text-white flex-1">{r.label}</span>
                  <span className="text-[11px]" style={{ color: r.color }}>{r.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-white/20 mt-10">UAE data-protection standards apply. Your data is encrypted end-to-end.</p>
        </div>
      </div>

      {/* ── RIGHT: form ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto relative">
        {/* reactive bg glow */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{ background: `radial-gradient(ellipse at 60% 30%, ${accent}0A 0%, transparent 60%)` }} />

        <div className="relative w-full max-w-[420px]"
          style={{
            animation: mounted ? 'slideInRight 0.6s 0.1s cubic-bezier(0.19,1,0.22,1) both' : 'none',
            opacity: mounted ? undefined : 0,
          }}>

          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#2F80ED' }}>
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-white">AceAi<span className="text-azure">X</span></span>
          </div>

          {/* ── STEP 1: role picker ─────────────────────── */}
          {step === 1 && (
            <div style={{ animation: 'slideUp 0.35s ease both' }}>
              <div className="mb-6">
                <h1 className="text-2xl font-display font-bold text-white mb-1">I'm joining as…</h1>
                <p className="text-white/35 text-sm">Choose your role to set up the right experience</p>
              </div>

              <div className="space-y-3">
                {ROLE_GROUPS.map(group => {
                  const isGroupSel  = sel.groupId === group.id;
                  const isExpanded  = expanded === group.id;
                  return (
                    <div key={group.id} className="rounded-2xl overflow-hidden transition-all duration-200"
                      style={{
                        border: `1px solid ${isGroupSel ? group.color + '35' : 'rgba(255,255,255,0.08)'}`,
                        background: isGroupSel ? `${group.color}07` : 'rgba(255,255,255,0.025)',
                      }}>

                      {/* group header row */}
                      <button onClick={() => selectGroup(group)}
                        className="w-full flex items-center gap-4 px-4 py-4 text-left">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${group.color}14`, border: `1px solid ${group.color}28` }}>
                          <group.icon size={17} style={{ color: group.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{group.label}</p>
                          <p className="text-[11px] text-white/35 mt-0.5">{group.desc}</p>
                        </div>
                        {group.subRoles ? (
                          /* chevron for expandable groups */
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 transition-transform duration-200"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', color: 'rgba(255,255,255,0.30)' }}>
                            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          /* radio dot */
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ borderColor: isGroupSel ? group.color : 'rgba(255,255,255,0.20)', background: isGroupSel ? group.color : 'transparent' }}>
                            {isGroupSel && <Check size={9} className={group.textDark ? 'text-black' : 'text-white'} />}
                          </div>
                        )}
                      </button>

                      {/* sub-options */}
                      {group.subRoles && isExpanded && (
                        <div className="px-3 pb-3 space-y-1.5"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', animation: 'slideUp 0.2s ease both' }}>
                          {group.subRoles.map(sub => {
                            const isSubSel = sel.groupId === group.id && sel.label === sub.label;
                            return (
                              <button key={sub.label}
                                onClick={() => selectSub(group, sub)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                style={{
                                  background: isSubSel ? `${group.color}12` : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${isSubSel ? group.color + '30' : 'rgba(255,255,255,0.05)'}`,
                                }}>
                                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                  style={{ borderColor: isSubSel ? group.color : 'rgba(255,255,255,0.20)', background: isSubSel ? group.color : 'transparent' }}>
                                  {isSubSel && <Check size={7} className="text-white" />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white">{sub.label}</p>
                                  <p className="text-[10px] text-white/35">{sub.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setStep(2)}
                className="w-full mt-5 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: accent, color: sel.textDark ? '#0C1A2B' : '#fff', boxShadow: `0 4px 20px ${accent}40` }}>
                Continue as {sel.label} <ArrowRight size={15} />
              </button>

              <p className="text-center text-xs text-white/25 mt-5">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-semibold" style={{ color: '#2F80ED' }}>Sign in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: credentials ─────────────────────── */}
          {step === 2 && (
            <div style={{ animation: 'slideUp 0.35s ease both' }}>
              <button onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 mb-5 transition-colors">
                <ChevronLeft size={13} /> Change role
              </button>

              {/* selected role badge */}
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
                style={{ background: `${accent}0C`, border: `1px solid ${accent}28` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}>
                  {ROLE_GROUPS.find(g => g.id === sel.groupId) &&
                    React.createElement(ROLE_GROUPS.find(g => g.id === sel.groupId)!.icon, { size: 14, style: { color: accent } })}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{sel.label}</p>
                  <p className="text-[11px] text-white/35">{ROLE_GROUPS.find(g => g.id === sel.groupId)?.desc}</p>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: accent }}>
                  <Check size={9} className={sel.textDark ? 'text-black' : 'text-white'} />
                </div>
              </div>

              <h1 className="text-xl font-display font-bold text-white mb-5">Create your account</h1>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* name */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">Full name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', caretColor: accent }}
                      required />
                  </div>
                </div>

                {/* email */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', caretColor: accent }}
                      required />
                  </div>
                </div>

                {/* password */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" minLength={8}
                      className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', caretColor: accent }}
                      required />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
                    style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)', color: '#EF5350' }}>
                    <span className="flex-shrink-0 mt-0.5">!</span>{error}
                  </div>
                )}

                <p className="text-[11px] text-white/25 leading-relaxed">
                  By creating an account you agree to AceAiX's Terms of Service and Privacy Policy. UAE data-protection standards apply.
                </p>

                <button type="submit" disabled={loading || done}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: done ? '#1FB57A' : accent, color: (done || sel.textDark) ? '#0C1A2B' : '#fff', boxShadow: `0 4px 20px ${done ? '#1FB57A' : accent}40` }}>
                  {loading ? (
                    <span className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'rgba(0,0,0,0.7)' }} />
                  ) : done ? (
                    <><Check size={14} /> Account created!</>
                  ) : (
                    <>Create Account <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-white/25 mt-5">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-semibold" style={{ color: '#2F80ED' }}>Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

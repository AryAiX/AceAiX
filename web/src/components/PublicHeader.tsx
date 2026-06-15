import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, Search, Home, Users, User, UserCog, Briefcase, MessageSquare, Bell,
  ChevronDown, Settings, LogOut, X, ShieldCheck, Menu,
  Bookmark, FileText, BarChart3, Compass,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listNotifications } from '../api/notifications';

type NavItem = { label: string; path: string; Icon: React.ElementType };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
}

const PUBLIC_NAV: NavItem[] = [
  { label: 'Feed',      path: '/feed',      Icon: Home      },
  { label: 'Discover',  path: '/discover',  Icon: Compass   },
  { label: 'Athletes',  path: '/athletes',  Icon: Users     },
  { label: 'Plans',     path: '/plans',     Icon: Briefcase },
  { label: 'About',     path: '/about',     Icon: FileText  },
];

function getNavItems(role: string | null): NavItem[] {
  if (role === 'athlete') return [
    { label: 'Home',          Icon: Home,          path: '/feed'                  },
    { label: 'Network',       Icon: Users,         path: '/athlete/network'       },
    { label: 'Opportunities', Icon: Briefcase,     path: '/athlete/opportunities' },
    { label: 'Messages',      Icon: MessageSquare, path: '/athlete/messages'      },
  ];
  if (role === 'scout' || role === 'club') return [
    { label: 'Home',       Icon: Home,          path: '/feed'                 },
    { label: 'Search',     Icon: Search,        path: '/recruiter/search'     },
    { label: 'Watchlists', Icon: Bookmark,      path: '/recruiter/watchlists' },
    { label: 'Messages',   Icon: MessageSquare, path: '/recruiter/messages'   },
  ];
  if (role === 'medical_partner') return [
    { label: 'Home',     Icon: Home,     path: '/feed'             },
    { label: 'Requests', Icon: FileText, path: '/partner/requests' },
  ];
  if (role === 'admin') return [
    { label: 'Home',      Icon: Home,      path: '/feed'            },
    { label: 'Users',     Icon: Users,     path: '/admin/users'     },
    { label: 'Analytics', Icon: BarChart3, path: '/admin/analytics' },
  ];
  return PUBLIC_NAV;
}

function dashPath(role: string | null) {
  if (role === 'athlete')                  return '/athlete/dashboard';
  if (role === 'scout' || role === 'club') return '/recruiter/dashboard';
  if (role === 'medical_partner')          return '/partner/dashboard';
  if (role === 'admin')                    return '/admin/dashboard';
  return '/auth/login';
}

function settingsPath(role: string | null) {
  if (role === 'athlete')                  return '/athlete/settings';
  if (role === 'scout' || role === 'club') return '/recruiter/settings';
  if (role === 'medical_partner')          return '/partner/settings';
  if (role === 'admin')                    return '/admin/settings';
  return '/auth/login';
}

function profilePath(role: string | null) {
  if (role === 'athlete')                  return '/athlete/profile';
  if (role === 'scout' || role === 'club') return '/recruiter/dashboard';
  return null;
}

function publicProfilePath(role: string | null, userId: string | null | undefined) {
  if (!userId) return null;
  if (role === 'athlete') return `/athletes/${userId}`;
  return null;
}

function isNavActive(itemPath: string, currentPath: string) {
  if (itemPath === '/feed') return currentPath === '/feed';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function Dropdown({ open, children, className = '' }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute z-50 ${className}`}
      style={{
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-6px)',
        transition: 'opacity 0.15s ease-out, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
}

const dropCardStyle: React.CSSProperties = {
  background: 'rgba(10,20,40,0.97)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
  overflow: 'hidden',
};

const itemCls = 'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors w-full text-left';

export default function PublicHeader() {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [meOpen,      setMeOpen]      = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const meRef    = useRef<HTMLDivElement>(null);

  const navItems = getNavItems(role);
  const { data: notifications = [], isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => listNotifications(user!.id),
    enabled: !!user?.id,
  });
  const unread   = notifications.filter(n => !n.is_read).length;
  const initial  = profile?.full_name?.charAt(0) ?? 'A';

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (meRef.current   && !meRef.current.contains(e.target as Node))     setMeOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  async function handleSignOut() {
    setMeOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[60px] glass-nav">
      <div className="h-full max-w-[1400px] mx-auto flex items-center px-4 md:px-6 relative">

        {/* ── Logo + Search ─────────────────────────── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-azure rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-azure-sm">
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-white text-[15px] hidden sm:block">
              AceAi<span className="text-azure">X</span>
            </span>
          </Link>
          <div className="relative hidden md:flex items-center w-52">
            <Search size={13} className="absolute left-3 text-white/40 pointer-events-none" />
            <input
              placeholder="Search…"
              className="w-full rounded-xl pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-white/30
                         focus:outline-none focus:ring-2 focus:ring-azure/30 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>
        </div>

        {/* ── Centered Nav tabs ─────────────────────── */}
        <nav className="hidden lg:flex items-stretch h-full absolute left-1/2 -translate-x-1/2">
          {navItems.map(({ label, Icon, path }) => {
            const active = isNavActive(path, location.pathname);
            return (
              <Link
                key={path}
                to={path}
                className="relative flex flex-col items-center justify-center gap-0.5 px-5 text-xs font-medium h-full transition-colors min-w-[72px] flex-shrink-0"
                style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.50)' }}
              >
                <Icon size={16} style={{ color: active ? '#2F80ED' : undefined }} />
                <span className="leading-none">{label}</span>
                <div
                  className="absolute bottom-0 inset-x-3 h-[2.5px] rounded-full bg-volt"
                  style={{
                    opacity: active ? 1 : 0,
                    transform: active ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
              </Link>
            );
          })}
        </nav>

        {/* ── Right controls ────────────────────────── */}
        <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">

          {/* Mobile search toggle */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            onClick={() => setSearchOpen(s => !s)}
          >
            <Search size={18} />
          </button>

          {/* Notifications */}
          {profile && (
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(o => !o); setMeOpen(false); }}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-azure rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </button>
              <Dropdown open={notifOpen} className="right-0 top-12 w-80">
                <div style={dropCardStyle}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                    <p className="text-sm font-bold text-white">Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="text-white/40 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  {notifsLoading ? (
                    <div className="px-4 py-6 flex items-center justify-center gap-2 text-white/40">
                      <div className="w-4 h-4 border-2 border-azure border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                      <span className="text-xs">Loading…</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-white/40">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id}
                        className="px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.05]"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.07)',
                          background: !n.is_read ? 'rgba(47,128,237,0.08)' : undefined,
                        }}
                        onClick={() => { setNotifOpen(false); if (n.action_url) navigate(n.action_url); }}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-azure mt-1.5 flex-shrink-0" />}
                          <div className={!n.is_read ? '' : 'ml-4'}>
                            <p className="text-xs text-white/80 leading-relaxed">{n.title}</p>
                            {n.body && <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{n.body}</p>}
                            <p className="text-[11px] text-white/40 mt-0.5">{timeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="px-4 py-2.5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button className="text-xs text-azure hover:underline font-medium">View all notifications</button>
                  </div>
                </div>
              </Dropdown>
            </div>
          )}

          {/* Me dropdown or Auth */}
          {profile ? (
            <div ref={meRef} className="relative">
              <button
                onClick={() => { setMeOpen(o => !o); setNotifOpen(false); }}
                className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl hover:bg-white/[0.07] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-azure/10 border border-azure/20 flex items-center justify-center text-xs font-bold text-azure overflow-hidden flex-shrink-0">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initial}
                </div>
                <ChevronDown
                  size={10}
                  className="text-white/40 hidden lg:block"
                  style={{ transform: meOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                />
              </button>
              <Dropdown open={meOpen} className="right-0 top-12 w-56">
                <div style={dropCardStyle}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-azure/10 border border-azure/20 flex items-center justify-center text-sm font-bold text-azure flex-shrink-0 overflow-hidden">
                        {profile.avatar_url
                          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          : initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{profile.full_name ?? 'User'}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {profile.is_verified && <ShieldCheck size={10} className="text-emerald" />}
                          <p className="text-[11px] text-white/40 capitalize truncate">{role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-1">
                    {publicProfilePath(role, user?.id) && (
                      <Link to={publicProfilePath(role, user?.id)!} onClick={() => setMeOpen(false)} className={itemCls}>
                        <User size={13} className="text-azure" /> View Public Profile
                      </Link>
                    )}
                    {profilePath(role) && (
                      <Link to={profilePath(role)!} onClick={() => setMeOpen(false)} className={itemCls}>
                        <UserCog size={13} className="text-white/50" /> Edit Profile
                      </Link>
                    )}
                    <Link to={dashPath(role)} onClick={() => setMeOpen(false)} className={itemCls}>
                      <Zap size={13} className="text-azure" /> My Dashboard
                    </Link>
                    <Link to={settingsPath(role)} onClick={() => setMeOpen(false)} className={itemCls}>
                      <Settings size={13} /> Settings
                    </Link>
                    <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-coral hover:bg-coral/5 transition-colors w-full text-left">
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </div>
              </Dropdown>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 ml-1">
              <Link to="/auth/login" className="px-3 py-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link to="/auth/register" className="btn-primary text-sm py-1.5 px-4">
                Get started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors ml-1"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Mobile search overlay ──────────────────── */}
        <div
          className="absolute inset-0 md:hidden glass-nav flex items-center px-4 gap-3 z-10"
          style={{ opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? 'auto' : 'none', transition: 'opacity 0.2s ease' }}
        >
          <Search size={15} className="text-white/40 flex-shrink-0" />
          <input
            autoFocus
            placeholder="Search athletes, clubs, scouts…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          <button onClick={() => setSearchOpen(false)}><X size={18} className="text-white/40" /></button>
        </div>
      </div>

      {/* ── Mobile nav drawer ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden px-4 py-3 space-y-0.5"
          style={{ background: 'rgba(10,18,35,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          {navItems.map(({ label, Icon, path }) => {
            const active = isNavActive(path, location.pathname);
            return (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  color:      active ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(47,128,237,0.12)' : undefined,
                }}
              >
                <Icon size={16} style={{ color: active ? '#2F80ED' : undefined }} />
                {label}
              </Link>
            );
          })}

          {!profile ? (
            <div className="pt-3 mt-2 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              <Link to="/auth/login"
                className="flex-1 text-center py-2.5 text-sm font-medium text-white/60 rounded-xl transition-colors hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                Sign in
              </Link>
              <Link to="/auth/register"
                className="flex-1 text-center py-2.5 text-sm font-bold rounded-xl"
                style={{ background: '#B8F135', color: '#0C1A2B' }}>
                Get started
              </Link>
            </div>
          ) : (
            <div className="pt-3 mt-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              {publicProfilePath(role, user?.id) && (
                <Link to={publicProfilePath(role, user?.id)!} className={itemCls}>
                  <User size={15} className="text-azure" /> View Public Profile
                </Link>
              )}
              {profilePath(role) && (
                <Link to={profilePath(role)!} className={itemCls}>
                  <UserCog size={15} className="text-white/50" /> Edit Profile
                </Link>
              )}
              <Link to={dashPath(role)} className={itemCls}>
                <Zap size={15} className="text-azure" /> My Dashboard
              </Link>
              <button onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-coral hover:bg-coral/5 transition-all w-full text-left">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

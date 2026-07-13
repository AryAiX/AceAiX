import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Zap, LayoutDashboard, User, Video, Activity, Heart, Network,
  TrendingUp, Bot, MessageSquare, Settings, Bell, Search, Menu, X,
  LogOut, ChevronDown, ChevronLeft, ChevronRight,
  Users, ShieldCheck, BarChart3, FileText,
  Briefcase, Sun, Moon, ExternalLink, Trophy, Layers, Flag, CreditCard, DollarSign, Lock, Sliders,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { listNotifications, unreadCount as fetchUnreadCount, markNotificationRead } from '../api/notifications';
import type { Notification } from '../types';

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

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

function getNav(role: string | null, basePath: string): NavItem[] {
  if (role === 'athlete') return [
    { label: 'Dashboard',     path: `${basePath}/dashboard`,     icon: <LayoutDashboard size={18} /> },
    { label: 'Profile',       path: `${basePath}/profile`,       icon: <User size={18} /> },
    { label: 'Media',         path: `${basePath}/media`,         icon: <Video size={18} /> },
    { label: 'Performance',   path: `${basePath}/performance`,   icon: <Activity size={18} /> },
    { label: 'Medical',       path: `${basePath}/medical`,       icon: <Heart size={18} /> },
    { label: 'Network',       path: `${basePath}/network`,       icon: <Network size={18} /> },
    { label: 'Career',        path: `${basePath}/career`,        icon: <TrendingUp size={18} /> },
    { label: 'Opportunities', path: `${basePath}/opportunities`, icon: <Briefcase size={18} /> },
    { label: 'AI Recommendations', path: `${basePath}/ai`,       icon: <Bot size={18} /> },
    { label: 'Analytics',     path: `${basePath}/analytics`,     icon: <BarChart3 size={18} /> },
    { label: 'Messages',      path: `${basePath}/messages`,      icon: <MessageSquare size={18} /> },
    { label: 'Settings',      path: `${basePath}/settings`,      icon: <Settings size={18} /> },
  ];
  if (role === 'scout' || role === 'club') return [
    { label: 'Dashboard',  path: `${basePath}/dashboard`,  icon: <LayoutDashboard size={18} /> },
    { label: 'Search',     path: `${basePath}/search`,     icon: <Search size={18} /> },
    { label: 'Watchlists', path: `${basePath}/watchlists`, icon: <Users size={18} /> },
    { label: 'Analytics',  path: `${basePath}/analytics`,  icon: <BarChart3 size={18} /> },
    { label: 'Messages',   path: `${basePath}/messages`,   icon: <MessageSquare size={18} /> },
    { label: 'Settings',   path: `${basePath}/settings`,   icon: <Settings size={18} /> },
  ];
  if (role === 'medical_partner') return [
    { label: 'Dashboard', path: `${basePath}/dashboard`, icon: <LayoutDashboard size={18} /> },
    { label: 'Requests',  path: `${basePath}/requests`,  icon: <FileText size={18} /> },
    { label: 'Settings',  path: `${basePath}/settings`,  icon: <Settings size={18} /> },
  ];
  if (role === 'admin' || role === 'super_admin') return [
    { label: 'Overview',     path: `${basePath}/dashboard`,    icon: <LayoutDashboard size={18} /> },
    { label: 'Users',        path: `${basePath}/users`,        icon: <Users size={18} /> },
    { label: 'Verification', path: `${basePath}/verification`, icon: <ShieldCheck size={18} /> },
    { label: 'Sports',       path: `${basePath}/sports`,       icon: <Activity size={18} /> },
    { label: 'Leagues',      path: `${basePath}/leagues`,      icon: <Trophy size={18} /> },
    { label: 'Competitions', path: `${basePath}/competitions`, icon: <Layers size={18} /> },
    { label: 'Content',      path: `${basePath}/content`,      icon: <FileText size={18} /> },
    { label: 'AI',           path: `${basePath}/ai`,           icon: <Bot size={18} /> },
    { label: 'Moderation',   path: `${basePath}/moderation`,   icon: <Flag size={18} /> },
    { label: 'Subscriptions', path: `${basePath}/subscriptions`, icon: <CreditCard size={18} /> },
    { label: 'Finance',      path: `${basePath}/finance`,      icon: <DollarSign size={18} /> },
    { label: 'Security',     path: `${basePath}/security`,     icon: <Lock size={18} /> },
    { label: 'System',       path: `${basePath}/system`,       icon: <Sliders size={18} /> },
    { label: 'Analytics',    path: `${basePath}/analytics`,    icon: <BarChart3 size={18} /> },
  ];
  return [];
}

function getBasePath(role: string | null) {
  if (role === 'athlete') return '/athlete';
  if (role === 'scout' || role === 'club') return '/recruiter';
  if (role === 'medical_partner') return '/partner';
  if (role === 'admin' || role === 'super_admin') return '/admin';
  return '/athlete';
}

function Dropdown({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <>{children}</>;
}

export default function AppLayout() {
  const { user, profile, role, signOut, refreshProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const queryClient = useQueryClient();

  const basePath = getBasePath(role);
  const navItems = getNav(role, basePath);
  const isDemoSession = user?.email?.endsWith('@aceaix.demo') ?? false;

  useEffect(() => {
    if (isDemoSession) void refreshProfile();
    // refreshProfile is intentionally omitted; it is recreated by AuthProvider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoSession, user?.id]);

  const { data: notifications = [], isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => listNotifications(user!.id),
    enabled: !!user?.id,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', user?.id] });
    },
  });

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) markRead.mutate(n.id);
    setNotifOpen(false);
    if (n.action_url) navigate(n.action_url);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest('[data-dropdown]')) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-white/[0.09] ${collapsed && !mobile ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 bg-azure rounded-lg flex items-center justify-center flex-shrink-0 shadow-azure-sm">
          <Zap size={16} className="text-white" fill="white" />
        </div>
        {(!collapsed || mobile) && (
          <span className="font-bold text-white text-base font-display">
            AceAi<span className="text-azure">X</span>
          </span>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-muted hover:text-white transition-colors">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hidden px-2 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active ? 'nav-item-dark-active' : 'nav-item-dark'
              }`}
              title={collapsed && !mobile ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={`p-3 border-t border-white/[0.09] ${collapsed && !mobile ? 'flex justify-center' : ''}`}>
        {collapsed && !mobile ? (
          <div className="w-8 h-8 rounded-full bg-azure/15 border border-azure/25 flex items-center justify-center text-xs font-bold text-azure">
            {profile?.full_name?.charAt(0) ?? 'U'}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 bg-white/[0.04] rounded-lg p-2.5 border border-white/[0.07]">
            <div className="w-8 h-8 rounded-full bg-azure/15 border border-azure/25 flex items-center justify-center text-xs font-bold text-azure flex-shrink-0">
              {profile?.full_name?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-muted capitalize truncate">{role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0C1A2B' }}>

      {/* Subtle aurora gradient behind everything */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #2F80ED, transparent 70%)', animation: 'aurora1 18s ease-in-out infinite' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #B8F135, transparent 70%)', animation: 'aurora2 24s ease-in-out infinite' }} />
      </div>

      {/* Desktop sidebar */}
      <aside
        className="relative hidden lg:flex flex-col border-r border-white/[0.09] transition-all duration-200 z-10 flex-shrink-0"
        style={{ width: collapsed ? 64 : 240, background: 'rgba(10,20,38,0.97)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.09] lg:hidden shadow-2xl"
            style={{ background: 'rgba(10,20,38,0.98)' }}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.09]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-azure rounded-lg flex items-center justify-center">
                  <Zap size={13} className="text-white" fill="white" />
                </div>
                <span className="font-bold text-white text-sm font-display">
                  AceAi<span className="text-azure">X</span>
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <SidebarContent mobile />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden z-10">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3.5 border-b border-white/[0.09] z-20 flex-shrink-0"
          style={{ background: 'rgba(10,20,38,0.95)', backdropFilter: 'blur(16px)' }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-muted hover:text-white transition-colors">
            <Menu size={20} />
          </button>

          <div className="relative hidden sm:flex items-center flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 text-muted pointer-events-none" />
            <input
              placeholder="Search athletes, clubs..."
              className="input-field pl-9 text-sm"
            />
          </div>

          {/* Energy accent line under topbar */}
          <div className="absolute bottom-0 left-0 right-0 h-px energy-line opacity-30" />

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notifications */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/[0.07] transition-colors relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-azure rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-azure-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
              <Dropdown open={notifOpen}>
                <div className="absolute right-0 top-10 w-80 rounded-xl shadow-2xl z-50 overflow-hidden card-dark"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.09]">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                  </div>
                  {notifsLoading ? (
                    <div className="px-4 py-6 flex items-center justify-center gap-2 text-muted">
                      <div className="w-4 h-4 border-2 border-azure border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                      <span className="text-xs">Loading…</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-muted">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id}
                        className="px-4 py-3 border-b border-white/[0.06] last:border-0 cursor-pointer transition-colors"
                        style={{ background: !n.is_read ? 'rgba(47,128,237,0.08)' : 'transparent' }}
                        onClick={() => handleNotificationClick(n)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = !n.is_read ? 'rgba(47,128,237,0.08)' : 'transparent')}>
                        <p className="text-xs text-white/80 leading-relaxed">{n.title}</p>
                        {n.body && <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{n.body}</p>}
                        <p className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </Dropdown>
            </div>

            {/* User menu */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-white/[0.07] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-azure/15 border border-azure/30 flex items-center justify-center text-xs font-bold text-azure">
                  {profile?.full_name?.charAt(0) ?? 'U'}
                </div>
                <ChevronDown size={12} className="text-muted" />
              </button>
              <Dropdown open={userOpen}>
                <div className="absolute right-0 top-10 w-52 rounded-xl shadow-2xl z-50 overflow-hidden card-dark"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.09]">
                    <p className="text-sm font-semibold text-white">{profile?.full_name ?? 'User'}</p>
                    <p className="text-xs text-muted capitalize">{role?.replace('_', ' ')}</p>
                  </div>
                  <Link to={`${basePath}/settings`} onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                    <Settings size={14} /> Settings
                  </Link>
                  {role === 'athlete' && user?.id && (
                    <Link to={`/athletes/${user.id}`} onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-white/[0.05] transition-colors">
                      <ExternalLink size={14} className="text-azure" /> View Public Profile
                    </Link>
                  )}
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-coral/80 hover:text-coral hover:bg-coral/[0.06] transition-colors">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </Dropdown>
            </div>
          </div>
        </header>

        {isDemoSession && (
          <div className="px-4 lg:px-6 py-2 border-b border-amber/25 bg-amber/10 text-amber text-xs flex flex-wrap items-center gap-2">
            <span className="font-semibold">Demo session:</span>
            <span>{user?.email}</span>
            <button onClick={handleSignOut} className="ml-auto underline underline-offset-2 hover:text-white transition-colors">
              Sign out and use my own account
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-5 lg:p-7" style={{ background: '#0C1A2B' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

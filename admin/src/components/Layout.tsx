import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck, CalendarClock, Compass, Flag, Handshake, Images, LayoutDashboard, LogOut, ScrollText, ShieldCheck, Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, cx } from './ui';

export function Layout() {
  const { me, signOut } = useAuth();
  const { data: d } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 60_000 });

  const nav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/reports', label: 'Reports', icon: Flag, count: d?.open_reports, urgent: (d?.urgent_reports ?? 0) > 0 },
    { to: '/approvals', label: 'Account approval', icon: BadgeCheck, count: (d?.pending_verifications ?? 0) + (d?.unverified_pros ?? 0) },
    { to: '/content', label: 'Content', icon: Images, count: d?.content_under_review },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/youth-safety', label: 'Youth safety', icon: ShieldCheck, count: d?.minors_without_consent },
    { to: '/sponsorship', label: 'Sponsorship', icon: Handshake },
    { to: '/bookings', label: 'Coach bookings', icon: CalendarClock },
    { to: '/sport-fit', label: 'Sport Fit', icon: Compass },
    { to: '/audit', label: 'Audit log', icon: ScrollText },
  ];

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink text-slate-300 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo.png" alt="" className="h-7 w-7 rounded-md" />
          <div>
            <div className="text-sm font-semibold text-white">AceAiX</div>
            <div className="text-[11px] text-slate-400">Admin console</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                   isActive ? 'bg-ink-3 text-white' : 'hover:bg-ink-2 hover:text-white')}
            >
              <n.icon className="h-4 w-4" />
              <span className="flex-1">{n.label}</span>
              {!!n.count && (
                <span className={cx('rounded-full px-1.5 text-[11px] font-semibold',
                  n.urgent ? 'bg-red-600 text-white' : 'bg-ace text-white')}>{n.count}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-3 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar person={me} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white">{me?.full_name}</div>
              <div className="text-[11px] text-slate-400">{me?.is_super_admin ? 'Super admin' : 'Admin'}</div>
            </div>
            <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-white"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phone-width nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-ink px-3 py-2 md:hidden">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cx('whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs', isActive ? 'bg-ink-3 text-white' : 'text-slate-300')}>
              {n.label}{n.count ? ` · ${n.count}` : ''}
            </NavLink>
          ))}
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

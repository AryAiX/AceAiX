/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export const ADMIN_ACCENT = {
  azure: '#2F80ED',
  volt: '#B8F135',
  emerald: '#1FB57A',
  amber: '#F5A623',
  coral: '#EF5350',
  slate: '#9DB0C6',
};

export function formatNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString();
}

export function formatMoney(cents: number | null | undefined, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AdminPage({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">{title}</h1>
          <p className="text-sm mt-1" style={{ color: ADMIN_ACCENT.slate }}>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  sub,
  color = ADMIN_ACCENT.azure,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}18, transparent 55%)` }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-white tabular font-display">{value}</p>
          <p className="text-sm mt-1" style={{ color: ADMIN_ACCENT.slate }}>{label}</p>
          {sub && <p className="text-xs mt-2 font-medium" style={{ color }}>{sub}</p>}
        </div>
        {icon && <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>{icon}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' }) {
  const cls = {
    blue: 'badge-blue',
    green: 'badge-green',
    amber: 'badge-amber',
    red: 'badge-coral',
    slate: 'badge-muted',
  }[tone];
  return <span className={`${cls} capitalize`}>{children}</span>;
}

export function LoadingState({ label = 'Loading admin data...' }: { label?: string }) {
  return (
    <div className="card p-8 flex items-center justify-center gap-3 text-sm" style={{ color: ADMIN_ACCENT.slate }}>
      <Loader2 size={16} className="animate-spin text-azure" />
      {label}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <AlertCircle size={28} className="mx-auto mb-3 text-slate-500" />
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: ADMIN_ACCENT.slate }}>{body}</p>
    </div>
  );
}

export function DataList<T>({
  rows,
  emptyTitle,
  emptyBody,
  render,
}: {
  rows: T[];
  emptyTitle: string;
  emptyBody: string;
  render: (row: T, index: number) => React.ReactNode;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return <div className="space-y-3">{rows.map(render)}</div>;
}

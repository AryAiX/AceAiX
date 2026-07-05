import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, Bot, DollarSign, ShieldCheck, Users } from 'lucide-react';
import { aiAdminStats, financeSummary, listAuditLogs, listUsers, listVerificationRequests, platformStats } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatMoney, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['platform-stats'], queryFn: platformStats });
  const { data: aiStats } = useQuery({ queryKey: ['admin-ai-stats'], queryFn: aiAdminStats });
  const { data: finance } = useQuery({ queryKey: ['admin-finance-summary'], queryFn: financeSummary });
  const { data: audit = [] } = useQuery({ queryKey: ['admin-audit', 5], queryFn: () => listAuditLogs(5) });
  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['verification-requests', 'pending'],
    queryFn: () => listVerificationRequests('pending'),
  });
  const { data: recentUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: () => listUsers({ limit: 6 }),
  });

  const statTiles = [
    { label: 'Total Users', value: stats?.users, sub: 'all platform roles', color: '#2F80ED', icon: <Users size={17} /> },
    { label: 'Active Athletes', value: stats?.athletes, sub: 'athlete profiles', color: '#1FB57A', icon: <Activity size={17} /> },
    { label: 'Pending Reviews', value: stats?.pendingVerifications, sub: 'verification queue', color: '#F5A623', icon: <ShieldCheck size={17} /> },
    { label: 'Billing Volume', value: finance?.billingVolumeCents ?? stats?.billingVolumeCents, sub: 'ledger events', color: '#B8F135', icon: <DollarSign size={17} />, money: true },
  ];

  return (
    <AdminPage
      title="Platform Overview"
      subtitle="Live admin view backed by Supabase tables, queues, and audit events"
      action={<StatusBadge tone={(stats?.moderationOpen ?? 0) > 0 ? 'amber' : 'green'}>{(stats?.moderationOpen ?? 0) > 0 ? `${stats?.moderationOpen} moderation items` : 'No open moderation'}</StatusBadge>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statTiles.map((tile) => (
          <StatCard
            key={tile.label}
            label={tile.label}
            value={statsLoading ? '—' : tile.money ? formatMoney(tile.value) : formatNumber(tile.value)}
            sub={tile.sub}
            color={tile.color}
            icon={tile.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCard>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={18} className="text-amber" />
            <h2 className="text-base font-semibold text-ink">Pending Verifications</h2>
            <span className="badge-amber">{pending.length}</span>
          </div>
          {pendingLoading ? (
            <p className="text-xs text-slate py-4 text-center">Loading…</p>
          ) : (
            <DataList
              rows={pending}
              emptyTitle="No pending verifications"
              emptyBody="Verification requests will appear here when users or organizations submit documents."
              render={(item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-page rounded-xl border border-rim">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber/8">
                  <AlertCircle size={18} className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink capitalize">{item.type.replace('_', ' ')}</p>
                  <p className="text-xs text-slate">{item.documents.length} documents · {timeAgo(item.created_at)}</p>
                </div>
                <Link to="/admin/verification" className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">Review</Link>
              </div>
              )}
            />
          )}
        </AdminCard>

        <AdminCard>
          <div className="flex items-center gap-2 mb-5">
            <Users size={18} className="text-azure" />
            <h2 className="text-base font-semibold text-ink">Recent Signups</h2>
          </div>
          <div className="space-y-1">
            {usersLoading && <p className="text-xs text-slate py-4 text-center">Loading…</p>}
            {!usersLoading && recentUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 py-2.5 border-b border-rim last:border-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-azure/8 text-azure border border-azure/15">
                  {(user.full_name ?? '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{user.full_name ?? 'Unnamed user'}</p>
                  <p className="text-xs text-slate capitalize">
                    {user.role.replace('_', ' ')}{user.city ? ` · ${user.city}` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate flex-shrink-0">{timeAgo(user.created_at)}</p>
              </div>
            ))}
            {!usersLoading && !recentUsers.length && (
              <p className="text-xs text-slate py-4 text-center">No signups yet.</p>
            )}
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AdminCard>
        <div className="flex items-center gap-2 mb-5">
          <Bot size={18} className="text-azure" />
          <h2 className="text-base font-semibold text-ink">AI System Performance</h2>
          <StatusBadge tone={(aiStats?.sessionsToday ?? 0) > 0 ? 'green' : 'slate'}>{(aiStats?.sessionsToday ?? 0) > 0 ? 'Active today' : 'No sessions today'}</StatusBadge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Sessions Today', value: aiStats?.sessionsToday ?? 0 },
            { label: 'Messages Today', value: aiStats?.messagesToday ?? 0 },
            { label: 'Assistant Replies', value: aiStats?.assistantMessagesToday ?? 0 },
            { label: 'Tagged Media', value: aiStats?.taggedMedia ?? 0 },
          ].map(metric => (
            <div key={metric.label} className="p-4 bg-page border border-rim rounded-xl text-center">
              <p className="text-xl font-bold text-ink tabular font-display">{formatNumber(metric.value)}</p>
              <p className="text-xs text-slate mt-1">{metric.label}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex items-center gap-2 mb-5">
          <Activity size={18} className="text-emerald" />
          <h2 className="text-base font-semibold text-ink">Recent Audit Activity</h2>
        </div>
        <DataList
          rows={audit}
          emptyTitle="No audit events yet"
          emptyBody="Admin mutations will write append-only audit rows once actions are performed."
          render={(row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 border-b border-rim last:border-0 py-2.5">
              <div>
                <p className="text-sm text-white font-medium">{row.action}</p>
                <p className="text-xs text-slate">{row.table_name ?? 'system'} · {timeAgo(row.created_at)}</p>
              </div>
              <StatusBadge tone="blue">{row.record_id ? 'record' : 'event'}</StatusBadge>
            </div>
          )}
        />
      </AdminCard>
      </div>
    </AdminPage>
  );
}

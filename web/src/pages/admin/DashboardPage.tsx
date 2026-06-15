import { useQuery } from '@tanstack/react-query';
import { Users, ShieldCheck, AlertCircle, Activity } from 'lucide-react';
import { platformStats, listVerificationRequests, listUsers } from '../../api/admin';

const STAT_META = [
  { label: 'Total Users',        color: '#2F80ED', sub: 'all roles'      },
  { label: 'Active Athletes',    color: '#1FB57A', sub: 'profiles'       },
  { label: 'Organizations',      color: '#2F80ED', sub: 'clubs & orgs'   },
  { label: 'Open Opportunities', color: '#F5A623', sub: 'active listings' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['platform-stats'], queryFn: platformStats });
  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['verification-requests', 'pending'],
    queryFn: () => listVerificationRequests('pending'),
  });
  const { data: recentUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: () => listUsers({ limit: 6 }),
  });

  const statValues = [stats?.users, stats?.athletes, stats?.organizations, stats?.opportunities];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink font-display">Platform Overview</h1>
          <p className="text-sm text-slate mt-0.5">AceAiX Super Admin · AryAiX Internal</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald/8 border border-emerald/20 rounded-full px-3 py-1.5">
          <div className="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse" />
          <span className="text-xs text-emerald font-medium">All Systems Operational</span>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_META.map((s, i) => (
          <div key={s.label} className="card p-5">
            <p className="text-2xl font-bold text-ink tabular font-display">
              {statsLoading ? '—' : (statValues[i] ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-slate mt-0.5">{s.label}</p>
            <p className="text-xs mt-2 font-medium" style={{ color: s.color }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={18} className="text-amber" />
            <h2 className="text-base font-semibold text-ink">Pending Verifications</h2>
            <span className="badge-amber">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pendingLoading && <p className="text-xs text-slate py-4 text-center">Loading…</p>}
            {!pendingLoading && pending.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-page rounded-xl border border-rim">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber/8">
                  <AlertCircle size={18} className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink capitalize">{item.type.replace('_', ' ')}</p>
                  <p className="text-xs text-slate">{item.documents.length} documents · {timeAgo(item.created_at)}</p>
                </div>
                <button className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">Review</button>
              </div>
            ))}
            {!pendingLoading && !pending.length && (
              <p className="text-xs text-slate py-4 text-center">No pending verifications.</p>
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="card p-5">
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
        </div>
      </div>

      {/* AI Performance */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Activity size={18} className="text-azure" />
          <h2 className="text-base font-semibold text-ink">AI System Performance</h2>
          <span className="badge-emerald ml-auto">Healthy</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'AI Chat Sessions Today', value: '1,204' },
            { label: 'Avg Response Time',       value: '0.8s'  },
            { label: 'Clip Tags Generated',     value: '342'   },
            { label: 'Profile Analyses',        value: '89'    },
          ].map(metric => (
            <div key={metric.label} className="p-4 bg-page border border-rim rounded-xl text-center">
              <p className="text-xl font-bold text-ink tabular font-display">{metric.value}</p>
              <p className="text-xs text-slate mt-1">{metric.label}</p>
              <div className="mt-2 flex justify-center">
                <div className="w-2 h-2 bg-emerald rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

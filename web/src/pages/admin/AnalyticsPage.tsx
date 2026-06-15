import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Activity, Globe, ArrowUp } from 'lucide-react';
import { platformStats, listUsers } from '../../api/admin';
import { listAthletes } from '../../api/athletes';

export default function AdminAnalyticsPage() {
  const { data: stats } = useQuery({ queryKey: ['platform-stats'], queryFn: platformStats });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users', 'All', ''], queryFn: () => listUsers({}) });
  const { data: athletes = [] } = useQuery({ queryKey: ['athletes', {}], queryFn: () => listAthletes({}) });

  const signups30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return users.filter((u) => new Date(u.created_at).getTime() >= cutoff).length;
  }, [users]);

  const platformTiles = [
    { label: 'New Signups (30d)', value: signups30, sub: 'last 30 days' },
    { label: 'Total Users', value: stats?.users ?? 0, sub: 'all roles' },
    { label: 'Active Athletes', value: stats?.athletes ?? 0, sub: 'profiles' },
    { label: 'Pending Verifications', value: stats?.pendingVerifications ?? 0, sub: 'in queue' },
  ];

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) };
    });
  }, []);

  const monthlyData = useMemo(
    () =>
      months.map(
        (m) =>
          users.filter((u) => {
            const d = new Date(u.created_at);
            return `${d.getFullYear()}-${d.getMonth()}` === m.key;
          }).length,
      ),
    [months, users],
  );
  const maxMonthly = Math.max(...monthlyData, 1);

  const sportBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    athletes.forEach((a) => {
      const s = a.sport ?? 'Other';
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    const total = athletes.length || 1;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const otherCount = sorted.slice(4).reduce((s, [, c]) => s + c, 0);
    const rows = top.map(([sport, count]) => ({ sport, count, pct: Math.round((count / total) * 100) }));
    if (otherCount) rows.push({ sport: 'Other', count: otherCount, pct: Math.round((otherCount / total) * 100) });
    return rows;
  }, [athletes]);

  const countryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((u) => {
      const c = u.country ?? 'Unknown';
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    const total = users.length || 1;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const otherCount = sorted.slice(5).reduce((s, [, c]) => s + c, 0);
    const rows = top.map(([country, count]) => ({ country, count, pct: Math.round((count / total) * 100) }));
    if (otherCount) rows.push({ country: 'Other', count: otherCount, pct: Math.round((otherCount / total) * 100) });
    return rows;
  }, [users]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="section-title">Platform Analytics</h1>
        <p className="section-subtitle">Usage metrics, growth trends, and system performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {platformTiles.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-0.5">{s.label}</p>
            <p className="text-xs mt-2 text-emerald-400 flex items-center gap-1">
              <ArrowUp size={11} /> {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={18} className="text-blue-400" />
          <h2 className="text-base font-semibold text-white">Monthly New Signups</h2>
          <span className="badge badge-green ml-auto">Last 12 months</span>
        </div>
        <div className="flex items-end gap-2 h-36">
          {monthlyData.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-blue-600/70 rounded-t-sm" style={{ height: `${(v / maxMonthly) * 100}px` }} />
              <p className="text-xs text-slate-600">{months[i].label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sport breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">Athletes by Sport</h2>
          </div>
          <div className="space-y-4">
            {!sportBreakdown.length && <p className="text-sm text-slate-500">No athlete data yet.</p>}
            {sportBreakdown.map((s) => (
              <div key={s.sport}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-300">{s.sport}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{s.count.toLocaleString()}</span>
                    <span className="text-xs font-bold text-white">{s.pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-navy-900 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">Users by Country</h2>
          </div>
          <div className="space-y-3">
            {!countryBreakdown.length && <p className="text-sm text-slate-500">No user data yet.</p>}
            {countryBreakdown.map((row) => (
              <div key={row.country} className="flex items-center gap-3">
                <p className="text-sm text-slate-300 w-24 flex-shrink-0">{row.country}</p>
                <div className="flex-1 h-2 bg-navy-900 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${row.pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 w-12 text-right flex-shrink-0">{row.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

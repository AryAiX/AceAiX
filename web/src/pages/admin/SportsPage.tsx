import { useQuery } from '@tanstack/react-query';
import { Activity, Database } from 'lucide-react';
import { sportsOverview } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminSportsPage() {
  const { data: sports = [], isLoading } = useQuery({ queryKey: ['admin-sports'], queryFn: sportsOverview });
  const active = sports.filter((sport) => sport.status !== 'disabled').length;

  return (
    <AdminPage title="Sports" subtitle="Sports taxonomy derived from catalog rows and live athlete/opportunity data">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Sports Found" value={isLoading ? '—' : formatNumber(sports.length)} sub="catalog + app data" icon={<Activity size={17} />} />
        <StatCard label="Active Sports" value={isLoading ? '—' : formatNumber(active)} sub="available in admin data" color="#1FB57A" icon={<Database size={17} />} />
        <StatCard label="Data References" value={formatNumber(sports.reduce((sum, sport) => sum + sport.count, 0))} sub="athletes and opportunities" color="#F5A623" />
      </div>

      <AdminCard>
        <h2 className="text-base font-semibold text-white mb-4">Sports Coverage</h2>
        <DataList
          rows={sports}
          emptyTitle="No sports data yet"
          emptyBody="Sports will appear when athletes, opportunities, or sports catalog records exist in Supabase."
          render={(sport) => (
            <div key={sport.name} className="flex items-center justify-between gap-4 py-3 border-b border-rim last:border-0">
              <div>
                <p className="text-sm font-semibold text-white">{sport.name}</p>
                <p className="text-xs text-slate-500">{sport.source}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">{formatNumber(sport.count)} refs</span>
                <StatusBadge tone={sport.status === 'active' ? 'green' : 'slate'}>{sport.status ?? 'derived'}</StatusBadge>
              </div>
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Layers, Trophy } from 'lucide-react';
import { competitionsOverview } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminCompetitionsPage() {
  const { data: competitions = [], isLoading } = useQuery({ queryKey: ['admin-competitions'], queryFn: competitionsOverview });
  const countries = new Set(competitions.map((row) => row.country).filter(Boolean));

  return (
    <AdminPage title="Competitions" subtitle="Competition and league signals from catalog, match records, and organizations">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Competitions" value={isLoading ? '—' : formatNumber(competitions.length)} sub="known competition names" icon={<Trophy size={17} />} />
        <StatCard label="Countries" value={formatNumber(countries.size)} sub="with competition data" color="#1FB57A" icon={<Layers size={17} />} />
        <StatCard label="References" value={formatNumber(competitions.reduce((sum, row) => sum + row.count, 0))} sub="matches and organizations" color="#F5A623" />
      </div>

      <AdminCard>
        <h2 className="text-base font-semibold text-white mb-4">Competition Coverage</h2>
        <DataList
          rows={competitions}
          emptyTitle="No competition data yet"
          emptyBody="Competition rows will appear when match records, organizations, or competition catalog rows exist."
          render={(competition) => (
            <div key={`${competition.name}-${competition.country ?? 'global'}`} className="flex items-center justify-between gap-4 py-3 border-b border-rim last:border-0">
              <div>
                <p className="text-sm font-semibold text-white">{competition.name}</p>
                <p className="text-xs text-slate-500">{competition.country ?? 'No country'} · {competition.source}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">{formatNumber(competition.count)} refs</span>
                <StatusBadge tone={competition.status === 'active' ? 'green' : 'slate'}>{competition.status ?? 'derived'}</StatusBadge>
              </div>
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}

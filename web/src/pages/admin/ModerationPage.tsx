import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, ShieldAlert } from 'lucide-react';
import { listModerationReports, updateModerationReport } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatDate, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

function toneForSeverity(severity: string): 'red' | 'amber' | 'blue' | 'slate' {
  if (severity === 'critical' || severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'slate';
}

export default function AdminModerationPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const { data: reports = [] } = useQuery({ queryKey: ['admin-moderation', status], queryFn: () => listModerationReports(status) });
  const resolve = useMutation({
    mutationFn: (id: string) => updateModerationReport(id, { status: 'resolved', resolution: 'Resolved from admin portal' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const open = reports.filter((report) => report.status !== 'resolved').length;
  const minor = reports.filter((report) => report.is_minor_related).length;

  return (
    <AdminPage
      title="Moderation"
      subtitle="Review user and content reports from the moderation_reports table"
      action={
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field text-sm w-44">
          <option value="all">All reports</option>
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
        </select>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Reports" value={formatNumber(reports.length)} sub="matching filter" icon={<Flag size={17} />} />
        <StatCard label="Open Items" value={formatNumber(open)} sub="needs action" color="#F5A623" icon={<ShieldAlert size={17} />} />
        <StatCard label="Minor Related" value={formatNumber(minor)} sub="safeguarding" color="#EF5350" />
      </div>

      <AdminCard>
        <DataList
          rows={reports}
          emptyTitle="No moderation reports"
          emptyBody="Reports will appear here when users flag content or admins create moderation records."
          render={(report) => (
            <div key={report.id} className="flex items-start justify-between gap-4 py-4 border-b border-rim last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{report.reason}</p>
                  <StatusBadge tone={toneForSeverity(report.severity)}>{report.severity}</StatusBadge>
                  <StatusBadge tone={report.status === 'resolved' ? 'green' : 'amber'}>{report.status}</StatusBadge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {report.reported_entity_type}:{report.reported_entity_id} · {formatDate(report.created_at)}
                </p>
                {report.details && <p className="text-xs text-slate-400 mt-2">{report.details}</p>}
              </div>
              {report.status !== 'resolved' && (
                <button disabled={resolve.isPending} onClick={() => resolve.mutate(report.id)} className="btn-outline text-xs px-3 py-1.5 disabled:opacity-50">
                  Resolve
                </button>
              )}
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}

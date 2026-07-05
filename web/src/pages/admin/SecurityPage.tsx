import { useQuery } from '@tanstack/react-query';
import { Database, FileText, Shield } from 'lucide-react';
import { listAuditLogs, listDataRequests, platformStats } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatDate, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminSecurityPage() {
  const { data: stats } = useQuery({ queryKey: ['platform-stats'], queryFn: platformStats });
  const { data: audit = [] } = useQuery({ queryKey: ['admin-audit', 100], queryFn: () => listAuditLogs(100) });
  const { data: requests = [] } = useQuery({ queryKey: ['admin-data-requests'], queryFn: listDataRequests });
  const openRequests = requests.filter((request) => request.status !== 'completed').length;

  return (
    <AdminPage title="Security & Compliance" subtitle="Audit log, medical/privacy operations, and data requests from Supabase">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Audit Events" value={formatNumber(audit.length)} sub="latest rows" icon={<Shield size={17} />} />
        <StatCard label="Events (7d)" value={formatNumber(stats?.auditEvents7d)} sub="audit_logs" color="#1FB57A" />
        <StatCard label="Data Requests" value={formatNumber(requests.length)} sub="privacy queue" color="#F5A623" icon={<FileText size={17} />} />
        <StatCard label="Open Requests" value={formatNumber(openRequests)} sub="not completed" color="#EF5350" icon={<Database size={17} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard>
          <h2 className="text-base font-semibold text-white mb-4">Audit Log</h2>
          <DataList
            rows={audit}
            emptyTitle="No audit events"
            emptyBody="Admin actions will appear here once mutations write audit_logs rows."
            render={(row) => (
              <div key={row.id} className="py-3 border-b border-rim last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{row.action}</p>
                    <p className="text-xs text-slate-500">{row.table_name ?? 'system'} · {formatDate(row.created_at)}</p>
                  </div>
                  <StatusBadge tone="blue">{row.record_id ? 'record' : 'event'}</StatusBadge>
                </div>
              </div>
            )}
          />
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-white mb-4">Data Requests</h2>
          <DataList
            rows={requests}
            emptyTitle="No data requests"
            emptyBody="Export and erasure requests will appear here when admin_data_requests rows exist."
            render={(request) => (
              <div key={request.id} className="py-3 border-b border-rim last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{request.request_type}</p>
                    <p className="text-xs text-slate-500">Submitted {formatDate(request.submitted_at)}</p>
                  </div>
                  <StatusBadge tone={request.status === 'completed' ? 'green' : 'amber'}>{request.status}</StatusBadge>
                </div>
              </div>
            )}
          />
        </AdminCard>
      </div>
    </AdminPage>
  );
}

import { useQuery } from '@tanstack/react-query';
import { DollarSign, WalletCards } from 'lucide-react';
import { financeSummary } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatDate, formatMoney, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminFinancePage() {
  const { data } = useQuery({ queryKey: ['admin-finance-summary'], queryFn: financeSummary });
  const events = data?.events ?? [];

  return (
    <AdminPage title="Finance" subtitle="Billing, payout, and refund ledger backed by admin_billing_events">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Ledger Volume" value={formatMoney(data?.billingVolumeCents)} sub="all billing events" icon={<DollarSign size={17} />} />
        <StatCard label="Paid Volume" value={formatMoney(data?.paidVolumeCents)} sub="paid status" color="#1FB57A" />
        <StatCard label="Pending Volume" value={formatMoney(data?.pendingVolumeCents)} sub="pending status" color="#F5A623" icon={<WalletCards size={17} />} />
      </div>

      <AdminCard>
        <h2 className="text-base font-semibold text-white mb-4">Billing Events</h2>
        <DataList
          rows={events}
          emptyTitle="No billing events"
          emptyBody="Finance rows will appear when admin_billing_events are created by billing integrations or admin workflows."
          render={(event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 py-3 border-b border-rim last:border-0">
              <div>
                <p className="text-sm font-semibold text-white capitalize">{event.event_type.replace('_', ' ')}</p>
                <p className="text-xs text-slate-500">{event.provider_ref ?? 'No provider ref'} · {formatDate(event.occurred_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white font-semibold">{formatMoney(event.amount_cents, event.currency)}</p>
                <StatusBadge tone={event.status === 'paid' ? 'green' : event.status === 'failed' ? 'red' : 'amber'}>{event.status}</StatusBadge>
              </div>
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}

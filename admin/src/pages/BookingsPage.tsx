import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { dateTime, label, money } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, PersonCell, StatusBadge, Tabs,
  type DialogSpec,
} from '../components/ui';

export default function BookingsPage() {
  const [scope, setScope] = useState<'upcoming' | 'past' | 'cancelled' | 'all'>('upcoming');
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['bookings', scope], queryFn: () => api.bookings(scope) });

  return (
    <>
      <PageHeader
        title="Coach bookings"
        subtitle="Sessions, consultations and classes athletes booked with coaches. In-person sessions with minors need guardian consent."
        actions={<Tabs value={scope} onChange={setScope} items={[
          { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' },
          { value: 'cancelled', label: 'Cancelled' }, { value: 'all', label: 'All' },
        ]} />}
      />
      {error && <ErrorBox error={error} />}
      <Card className="overflow-x-auto">
        {isLoading ? <Loading /> : !data?.length ? <Empty title="No bookings" /> : (
          <table className="w-full min-w-[960px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className="th">When</th><th className="th">Coach</th><th className="th">Athlete</th><th className="th">Service</th><th className="th">Status</th><th className="th" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((b) => (
                <tr key={b.id}>
                  <td className="td text-sm">{dateTime(b.starts_at)}</td>
                  <td className="td"><PersonCell person={b.coach} /></td>
                  <td className="td">
                    <PersonCell person={b.athlete} />
                    {b.guardian_ok === false && <div className="mt-1"><Badge color="red">No guardian booking consent</Badge></div>}
                  </td>
                  <td className="td text-sm">
                    <div className="font-medium">{b.service.title ?? '—'}</div>
                    <div className="text-xs text-slate-500">{label(b.service.kind)} · {b.service.duration_minutes} min · {money(b.service.price, b.service.currency)}</div>
                    {b.location && <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{b.location}</div>}
                  </td>
                  <td className="td"><StatusBadge status={b.status} />{b.cancelled_by && <div className="mt-1 text-xs text-slate-500">by {b.cancelled_by}</div>}</td>
                  <td className="td text-right">
                    {b.status === 'booked' && new Date(b.starts_at) > new Date() && (
                      <Button size="sm" tone="danger" onClick={() => setDialog({
                        title: 'Cancel this session', confirm: 'Cancel session', tone: 'danger',
                        body: 'The athlete, their guardian and the coach are notified.',
                        onConfirm: async (r) => { await api.cancelBooking(b.id, r); qc.invalidateQueries({ queryKey: ['bookings'] }); },
                      })}>Cancel</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

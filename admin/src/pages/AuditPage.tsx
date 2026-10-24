import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { dateTime, label } from '../lib/format';
import { Card, Empty, ErrorBox, Loading, PageHeader, PersonCell, Tabs } from '../components/ui';

export default function AuditPage() {
  const [prefix, setPrefix] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['audit', prefix], queryFn: () => api.audit(prefix) });

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every admin action, who took it and when, with the before and after. Written by the server; it cannot be edited from here."
        actions={<Tabs value={prefix} onChange={setPrefix} items={[
          { value: '', label: 'All' }, { value: 'report.', label: 'Reports' }, { value: 'user.', label: 'Accounts' },
          { value: 'content.', label: 'Content' }, { value: 'verification.', label: 'Verification' },
          { value: 'sponsorship.', label: 'Sponsorship' }, { value: 'booking.', label: 'Bookings' },
          { value: 'sport_fit.', label: 'Sport Fit' }, { value: 'referral.', label: 'Invites' },
        ]} />}
      />
      {error && <ErrorBox error={error} />}
      <Card className="overflow-x-auto">
        {isLoading ? <Loading /> : !data?.length ? <Empty title="No actions yet" /> : (
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className="th">When</th><th className="th">Admin</th><th className="th">Action</th><th className="th">Subject</th><th className="th">Reason / note</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((a) => {
                const note = (a.new_value?.reason ?? a.new_value?.note ?? a.new_value?.decision_reason) as string | undefined;
                return (
                  <Fragment key={a.id}>
                    <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === a.id ? null : a.id)}>
                      <td className="td whitespace-nowrap text-slate-600">{dateTime(a.created_at)}</td>
                      <td className="td">{a.by ? <PersonCell person={a.by} /> : <span className="text-slate-400">system</span>}</td>
                      <td className="td"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{a.action}</code></td>
                      <td className="td">{a.subject ? <PersonCell person={a.subject} /> : <span className="text-xs text-slate-500">{label(a.table_name)}</span>}</td>
                      <td className="td max-w-xs truncate text-slate-600">{note ?? '—'}</td>
                    </tr>
                    {open === a.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 pb-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <pre className="max-h-64 overflow-auto rounded-lg bg-white p-3 text-[11px]">{JSON.stringify(a.old_value, null, 2)}</pre>
                            <pre className="max-h-64 overflow-auto rounded-lg bg-white p-3 text-[11px]">{JSON.stringify(a.new_value, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

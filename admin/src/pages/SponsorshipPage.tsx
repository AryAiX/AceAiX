import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { date, money, timeAgo } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, PersonCell, StatusBadge, Tabs,
  type DialogSpec,
} from '../components/ui';

export default function SponsorshipPage() {
  const [tab, setTab] = useState<'deals' | 'calls' | 'requests'>('deals');
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['sponsorship'], queryFn: api.sponsorship });

  const close = (kind: 'deal' | 'call' | 'request', id: string, title: string) =>
    setDialog({
      title, confirm: 'Close', tone: 'danger',
      body: 'Both sides are notified with your reason.',
      onConfirm: async (reason) => { await api.sponsorshipAction(kind, id, reason); qc.invalidateQueries({ queryKey: ['sponsorship'] }); },
    });

  return (
    <>
      <PageHeader
        title="Sponsorship"
        subtitle="Offers between sponsors and athletes, sponsors' open calls, and athletes' requests. Payments happen outside the app."
        actions={<Tabs value={tab} onChange={setTab} items={[
          { value: 'deals', label: 'Offers', count: data?.deals.length },
          { value: 'calls', label: 'Sponsor calls', count: data?.calls.length },
          { value: 'requests', label: 'Athlete requests', count: data?.requests.length },
        ]} />}
      />
      {error && <ErrorBox error={error} />}
      {isLoading ? <Loading /> : (
        <Card className="overflow-x-auto">
          {tab === 'deals' && (!data?.deals.length ? <Empty title="No offers yet" /> : (
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50"><tr><th className="th">Sponsor</th><th className="th">Athlete</th><th className="th">For</th><th className="th">Amount</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.deals.map((d) => (
                  <tr key={d.id}>
                    <td className="td"><PersonCell person={d.sponsor} sub={d.company ?? undefined} /></td>
                    <td className="td">
                      <PersonCell person={d.athlete} />
                      {d.guardian_ok === false && <div className="mt-1"><Badge color="red">No guardian sponsorship consent</Badge></div>}
                    </td>
                    <td className="td text-sm">
                      <div>{d.request_title ?? d.call_title ?? 'Direct offer'}</div>
                      <div className="text-xs text-slate-500">{d.initiated_by === 'athlete' ? 'Athlete applied' : 'Sponsor offered'} · {timeAgo(d.created_at)}</div>
                      {d.message && <div className="mt-1 line-clamp-2 max-w-xs text-xs text-slate-500">“{d.message}”</div>}
                    </td>
                    <td className="td text-sm">{money(d.amount, d.currency)}</td>
                    <td className="td"><StatusBadge status={d.status} /></td>
                    <td className="td text-right">{d.status === 'pending' && <Button size="sm" tone="danger" onClick={() => close('deal', d.id, 'Withdraw this offer')}>Withdraw</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {tab === 'calls' && (!data?.calls.length ? <Empty title="No sponsor calls" /> : (
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50"><tr><th className="th">Sponsor</th><th className="th">Call</th><th className="th">Budget</th><th className="th">Deadline</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.calls.map((c) => (
                  <tr key={c.id}>
                    <td className="td"><PersonCell person={c.sponsor} sub={c.company ?? undefined} /></td>
                    <td className="td text-sm">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-slate-500">{[c.sport, c.country].filter(Boolean).join(' · ') || 'Any sport'} · {c.slots} slots</div>
                      {c.open_to_minors && <Badge color="orange">Open to minors</Badge>}
                    </td>
                    <td className="td text-sm">{c.amount_min != null || c.amount_max != null ? `${money(c.amount_min, c.currency)} – ${c.amount_max ?? ''}` : '—'}</td>
                    <td className="td text-sm">{date(c.deadline)}</td>
                    <td className="td"><Badge color={c.is_active ? 'green' : 'slate'}>{c.is_active ? 'Active' : 'Closed'}</Badge></td>
                    <td className="td text-right">{c.is_active && <Button size="sm" tone="danger" onClick={() => close('call', c.id, 'Close this sponsor call')}>Close</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {tab === 'requests' && (!data?.requests.length ? <Empty title="No athlete requests" /> : (
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50"><tr><th className="th">Athlete</th><th className="th">Request</th><th className="th">Event</th><th className="th">Amount</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.requests.map((r) => (
                  <tr key={r.id}>
                    <td className="td"><PersonCell person={r.athlete} /></td>
                    <td className="td text-sm"><div className="font-medium">{r.title}</div>{r.pitch && <div className="line-clamp-2 max-w-xs text-xs text-slate-500">{r.pitch}</div>}</td>
                    <td className="td text-sm">{r.event_name ?? '—'}<div className="text-xs text-slate-500">{date(r.event_date)} · {r.sport ?? ''}</div></td>
                    <td className="td text-sm">{money(r.amount, r.currency)}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                    <td className="td text-right">{r.status === 'open' && <Button size="sm" tone="danger" onClick={() => close('request', r.id, `Close “${r.title}”`)}>Close</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </Card>
      )}
      <p className="mt-3 text-xs text-slate-500">Tip: an offer to a minor needs a guardian who allowed sponsorship; the app enforces this, and a red badge here means it slipped through.</p>
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

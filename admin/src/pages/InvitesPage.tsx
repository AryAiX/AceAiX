import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Coins, RotateCcw, Ban } from 'lucide-react';
import { api, type ReferralRow } from '../lib/api';
import { date, timeAgo } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, PersonCell, Tabs, type DialogSpec,
} from '../components/ui';

const STATUS: Record<ReferralRow['status'], { label: string; color: string }> = {
  qualified: { label: 'Counts', color: 'green' },
  pending: { label: 'Setting up', color: 'amber' },
  revoked: { label: 'Revoked', color: 'red' },
};

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

/**
 * Invites: who brought whom, and the tokens it earned.
 *
 * A friend counts once onboarding is done (and, for a minor, once a parent has
 * approved). Every 10 that count = 1 token. Tokens are in-app points with no
 * cash value. Revoking an invite takes back any token it completed; restoring
 * re-checks it. Every action is written to the audit log.
 */
export default function InvitesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'inviters' | 'recent'>('inviters');
  const [filter, setFilter] = useState<'all' | ReferralRow['status']>('all');
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['referrals'], queryFn: api.referrals });

  const refresh = () => qc.invalidateQueries({ queryKey: ['referrals'] });
  const revoke = (r: ReferralRow) => setDialog({
    title: 'Revoke this invite?',
    body: <>It stops counting for <b>{r.referrer?.full_name ?? 'the inviter'}</b>. A token it completed is taken back.</>,
    confirm: 'Revoke', tone: 'danger', reason: 'required',
    reasonPlaceholder: 'Saved in the audit log, e.g. “duplicate account”',
    onConfirm: async (reason) => { await api.setReferral(r.id, true, reason); await refresh(); },
  });
  const restore = (r: ReferralRow) => setDialog({
    title: 'Restore this invite?',
    body: 'It is checked again: it counts if the friend has finished setting up (and a parent approved, for a minor).',
    confirm: 'Restore', reason: 'optional',
    onConfirm: async (reason) => { await api.setReferral(r.id, false, reason || null); await refresh(); },
  });

  return (
    <>
      <PageHeader
        title="Invites"
        subtitle="Personal invite links from athletes and coaches. Every 10 friends who count earn 1 token."
        actions={<Tabs value={tab} onChange={setTab} items={[{ value: 'inviters', label: 'Top inviters' }, { value: 'recent', label: 'Recent invites' }]} />}
      />
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <Coins className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Tokens are in-app points. They have no cash value and cannot be bought, sold or transferred.</span>
      </div>
      {error && <ErrorBox error={error} />}
      {isLoading || !data ? <Loading /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Invites" value={data.invites} hint={`from ${data.inviters} people`} />
            <Stat label="Count" value={data.qualified} hint="Onboarding done" />
            <Stat label="Setting up" value={data.pending} />
            <Stat label="Revoked" value={data.revoked} />
            <Stat label="Tokens given" value={data.tokens} />
          </div>

          <ByDay days={data.by_day} />

          {tab === 'inviters' ? (
            <Card className="overflow-hidden">
              {data.top.length === 0 ? <Empty title="No invites yet" /> : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Inviter</th>
                      <th className="px-3 py-2 text-right font-medium">Count</th>
                      <th className="px-3 py-2 text-right font-medium">Setting up</th>
                      <th className="px-3 py-2 text-right font-medium">Revoked</th>
                      <th className="px-3 py-2 text-right font-medium">Tokens</th>
                      <th className="px-4 py-2 font-medium">Last invite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top.map((t) => (
                      <tr key={t.user?.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5">
                          <PersonCell person={t.user} sub={t.flagged ? (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <AlertTriangle className="h-3 w-3" /> Many sign-ups that never finish — check for fake accounts
                            </span>
                          ) : undefined} />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{t.qualified}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{t.pending}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{t.revoked}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{t.tokens}</td>
                        <td className="px-4 py-2.5 text-slate-500">{timeAgo(t.last_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 p-3">
                <Tabs value={filter} onChange={setFilter} items={[
                  { value: 'all', label: 'All' }, { value: 'qualified', label: 'Counts' },
                  { value: 'pending', label: 'Setting up' }, { value: 'revoked', label: 'Revoked' },
                ]} />
              </div>
              {(() => {
                const rows = data.recent.filter((r) => filter === 'all' || r.status === filter);
                if (!rows.length) return <Empty title="Nothing here" />;
                return (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Invited</th>
                        <th className="px-3 py-2 font-medium">By</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Joined</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-2.5"><PersonCell person={r.referred} /></td>
                          <td className="px-3 py-2.5"><PersonCell person={r.referrer} /></td>
                          <td className="px-3 py-2.5">
                            <Badge color={STATUS[r.status].color}>{STATUS[r.status].label}</Badge>
                            {r.revoked_reason && <div className="mt-1 max-w-[16rem] text-xs text-slate-500">{r.revoked_reason}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">{date(r.created_at)}</td>
                          <td className="px-4 py-2.5 text-right">
                            {r.status === 'revoked' ? (
                              <Button size="sm" tone="ghost" onClick={() => restore(r)}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                            ) : (
                              <Button size="sm" tone="ghost" onClick={() => revoke(r)}><Ban className="h-3.5 w-3.5" /> Revoke</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </Card>
          )}
        </div>
      )}
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function ByDay({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-ink">Invites per day, last 30 days</div>
      <div className="mt-4 flex h-24 items-end gap-1">
        {days.map((x) => (
          <div key={x.day} className="group flex-1" title={`${x.day} · ${x.count}`}>
            <div className="w-full rounded-t bg-amber-500/80 group-hover:bg-amber-500" style={{ height: `${(x.count / max) * 88 + (x.count ? 4 : 1)}px` }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

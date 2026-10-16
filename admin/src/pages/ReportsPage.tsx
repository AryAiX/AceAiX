import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Report, type ReportAction } from '../lib/api';
import { REASON_LABEL, label, timeAgo } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Loading, MediaStrip, PageHeader, PersonCell, StatusBadge,
  Tabs, UrgentFlag, type DialogSpec,
} from '../components/ui';

function TargetPreview({ r }: { r: Report }) {
  const t = r.target;
  if (!t) return null;
  if (t.deleted) return <p className="text-sm italic text-slate-400">The reported {r.entity_type} no longer exists.</p>;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge color="slate">{label(t.kind)}</Badge>
        {t.state && t.state !== 'visible' && <StatusBadge status={t.state} />}
        {t.is_hidden && t.kind === 'comment' && <Badge color="amber">Hidden</Badge>}
        {t.created_at && <span>posted {timeAgo(t.created_at)}</span>}
        {t.kind === 'message' && <span>· private message</span>}
      </div>
      {t.kind !== 'user' && t.author && <div className="mb-2"><PersonCell person={t.author} /></div>}
      {t.text && <p className="whitespace-pre-wrap text-sm text-ink">{t.text}</p>}
      <div className="mt-2">
        <MediaStrip
          media={t.media}
          bucket={t.kind === 'story' ? 'stories' : 'posts'}
          single={t.media_url ?? t.image_url}
          singleType={t.media_type}
          card={t.card}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'open';
  const urgent = params.get('urgent') === '1';
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogSpec | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', status, urgent],
    queryFn: () => api.reports(status, urgent),
  });

  const act = (r: Report, action: ReportAction, spec: Omit<DialogSpec, 'onConfirm'>) =>
    setDialog({
      ...spec,
      onConfirm: async (reason, days) => {
        const finalAction: ReportAction = action === 'suspend_user' && days === null ? 'ban_user' : action;
        await api.resolveReport(r.id, finalAction, reason || undefined, days ?? undefined);
        qc.invalidateQueries();
      },
    });

  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v == null) p.delete(k); else p.set(k, v);
    setParams(p);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Everything users reported from the app. Child-safety and minor-related reports are always on top."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={urgent} onChange={(e) => set('urgent', e.target.checked ? '1' : null)} />
              Urgent only
            </label>
            <Tabs
              value={status}
              onChange={(v) => set('status', v)}
              items={[
                { value: 'open', label: 'Open' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'dismissed', label: 'Dismissed' },
                { value: 'all', label: 'All' },
              ]}
            />
          </>
        }
      />

      {error && <ErrorBox error={error} />}
      {isLoading ? <Loading /> : !data?.length ? (
        <Card><Empty title="No reports here" hint={status === 'open' ? 'The queue is clear.' : undefined} /></Card>
      ) : (
        <div className="space-y-3">
          {data.map((r) => {
            const open = ['open', 'reviewing', 'escalated'].includes(r.status);
            const target = r.reported_user;
            return (
              <Card key={r.id} className={r.urgent && open ? 'border-red-300' : undefined}>
                <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.urgent && open && <UrgentFlag />}
                      <Badge color={r.reason === 'child_safety' ? 'red' : 'orange'}>{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                      <Badge color={r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'slate'}>{label(r.severity)} severity</Badge>
                      <StatusBadge status={r.status} />
                      {r.is_minor_related && <Badge color="orange">Involves a minor</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">
                      Reported {timeAgo(r.created_at)} · {label(r.entity_type)}
                      {r.duplicates > 0 && <> · <b className="text-ink">{r.duplicates + 1} reports</b> on the same {r.entity_type}</>}
                    </div>
                    {r.details && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">“{r.details}”</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Reported account</div>
                        <PersonCell person={target} sub={r.prior_reports_against_user > 0 ? `${r.prior_reports_against_user} other reports` : undefined} />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Reported by</div>
                        <PersonCell person={r.reporter} />
                      </div>
                    </div>
                    {!open && (
                      <div className="text-xs text-slate-500">
                        {label(r.action_taken)} by {r.resolved_by?.full_name ?? '—'}{r.resolution && <> — “{r.resolution}”</>}
                      </div>
                    )}
                  </div>
                  <TargetPreview r={r} />
                </div>

                {open && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                    <Button size="sm" tone="ghost" onClick={() => act(r, 'dismiss', {
                      title: 'Dismiss report', confirm: 'Dismiss', reason: 'optional', reasonLabel: 'Note',
                      body: 'Nothing broke the guidelines. Content hidden automatically by this report is restored.',
                    })}>Dismiss</Button>
                    {r.entity_type !== 'user' && (
                      <Button size="sm" tone="danger" onClick={() => act(r, 'remove_content', {
                        title: `Remove this ${r.entity_type}`, confirm: 'Remove', tone: 'danger',
                        body: 'The content is taken down for everyone. Other open reports on it are closed too.',
                      })}>Remove content</Button>
                    )}
                    {target && (
                      <>
                        <Button size="sm" onClick={() => act(r, 'warn_user', {
                          title: `Warn ${target.full_name ?? 'user'}`, confirm: 'Send warning', reason: 'optional',
                          reasonLabel: 'Message to the user', reasonPlaceholder: 'Leave empty to send the standard Community Guidelines warning',
                        })}>Warn user</Button>
                        <Button size="sm" tone="danger" onClick={() => act(r, 'suspend_user', {
                          title: `Suspend ${target.full_name ?? 'user'}`, confirm: 'Suspend', tone: 'danger', days: true,
                          body: r.entity_type !== 'user' ? 'The reported content is removed and the account is signed out.' : 'The account is hidden and signed out.',
                        })}>Suspend / ban</Button>
                      </>
                    )}
                    <div className="flex-1" />
                    {r.status !== 'escalated' && (
                      <Button size="sm" tone="ghost" onClick={() => act(r, 'escalate', {
                        title: 'Escalate', confirm: 'Escalate', reason: 'optional', reasonLabel: 'Note for the team',
                        body: 'Keeps the report open and flags it for a senior reviewer (or the authorities, for child-safety cases).',
                      })}>Escalate</Button>
                    )}
                    {target && <Link to={`/users/${target.id}`} className="text-xs font-medium text-azure hover:underline">Open account →</Link>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

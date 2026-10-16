import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText } from 'lucide-react';
import { api, signedDocumentUrl, type ExtraProfile, type VerificationRequest } from '../lib/api';
import { label, timeAgo } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Field, Loading, PageHeader, PersonCell, StatusBadge, Tabs,
  type DialogSpec,
} from '../components/ui';

function Details({ x, bio, city, email }: { x: ExtraProfile; bio: string | null; city: string | null; email: string | null }) {
  const licences = Array.isArray(x.coach?.licenses) ? (x.coach?.licenses as unknown[]).map((l) => (typeof l === 'string' ? l : (l as { name?: string }).name ?? '')).filter(Boolean) : [];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      <Field label="Email">{email ?? '—'}</Field>
      <Field label="City">{city ?? '—'}</Field>
      {x.sponsor && (
        <>
          <Field label="Company">{x.sponsor.company_name ?? '—'}</Field>
          <Field label="Industry">{x.sponsor.industry ?? '—'}</Field>
          <Field label="Website">
            {x.sponsor.website ? (
              <a href={x.sponsor.website.startsWith('http') ? x.sponsor.website : `https://${x.sponsor.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-azure hover:underline">
                {x.sponsor.website} <ExternalLink className="h-3 w-3" />
              </a>
            ) : '—'}
          </Field>
        </>
      )}
      {x.coach && (
        <>
          <Field label="Specialty">{x.coach.specialty ?? '—'}</Field>
          <Field label="Experience">{x.coach.years_experience != null ? `${x.coach.years_experience} years` : '—'}</Field>
          <Field label="Club">{x.coach.current_club ?? '—'}</Field>
          {licences.length > 0 && <Field label="Licences">{licences.join(', ')}</Field>}
        </>
      )}
      {bio && <div className="col-span-full"><Field label="Bio">{bio}</Field></div>}
    </dl>
  );
}

export default function ApprovalsPage() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['verification', status], queryFn: () => api.verificationQueue(status) });
  const done = () => qc.invalidateQueries();

  return (
    <>
      <PageHeader
        title="Account approval"
        subtitle="Verify coaches, clubs, scouts and sponsors before they can act on young athletes. Unverified sponsors cannot make offers."
        actions={<Tabs value={status} onChange={setStatus} items={[
          { value: 'pending', label: 'Waiting' }, { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' },
        ]} />}
      />
      {error && <ErrorBox error={error} />}
      {isLoading ? <Loading /> : (
        <>
          <h2 className="mb-3 text-sm font-semibold text-ink">Verification requests</h2>
          {!data?.requests.length ? <Card><Empty title="No requests" /></Card> : (
            <div className="space-y-3">
              {data.requests.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <PersonCell person={r.user} sub={`${label(r.user?.role)} · asked ${timeAgo(r.created_at)}`} />
                    <div className="flex items-center gap-2"><Badge color="blue">{label(r.type)}</Badge><StatusBadge status={r.status} /></div>
                  </div>
                  <div className="mt-4"><Details x={r} bio={r.bio} city={r.city} email={r.email} /></div>
                  {r.organization && <p className="mt-3 text-sm text-slate-600">Organization: <b>{r.organization.name}</b> ({label(r.organization.type)}, {r.organization.country ?? '—'})</p>}
                  <div className="mt-4">
                    <div className="text-xs text-slate-500">Documents</div>
                    {r.documents?.length ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {r.documents.map((d, i) => (
                          <DocumentChip key={i} doc={d} index={i} />
                        ))}
                      </div>
                    ) : <p className="mt-1 text-sm text-slate-400">None uploaded. Ask for proof with “Need more info”.</p>}
                  </div>
                  {r.decision_reason && <p className="mt-3 text-sm text-slate-600">Decision note: “{r.decision_reason}” {r.reviewed_by && <>— {r.reviewed_by.full_name}</>}</p>}
                  {(r.status === 'pending' || r.status === 'more_info') && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Button tone="success" size="sm" onClick={() => setDialog({
                        title: `Approve ${r.user?.full_name ?? ''}`, confirm: 'Approve', tone: 'success', reason: 'none',
                        body: 'The account gets the verified badge and full access for its role.',
                        onConfirm: async () => { await api.decideVerification(r.id, 'approved'); done(); },
                      })}>Approve</Button>
                      <Button size="sm" onClick={() => setDialog({
                        title: 'Ask for more information', confirm: 'Send', reasonLabel: 'What do they need to send?',
                        onConfirm: async (reason) => { await api.decideVerification(r.id, 'more_info', reason); done(); },
                      })}>Need more info</Button>
                      <Button tone="danger" size="sm" onClick={() => setDialog({
                        title: 'Reject verification', confirm: 'Reject', tone: 'danger',
                        onConfirm: async (reason) => { await api.decideVerification(r.id, 'rejected', reason); done(); },
                      })}>Reject</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {status === 'pending' && (
            <>
              <h2 className="mb-1 mt-8 text-sm font-semibold text-ink">Unverified professional accounts</h2>
              <p className="mb-3 text-sm text-slate-500">These signed up as coach, club, scout or sponsor but never asked for verification.</p>
              {!data?.unrequested.length ? <Card><Empty title="None" /></Card> : (
                <Card>
                  <div className="divide-y divide-slate-100">
                    {data.unrequested.map((u) => (
                      <div key={u.user.id} className="flex flex-wrap items-center gap-4 p-4">
                        <div className="min-w-[220px] flex-1"><PersonCell person={u.user} sub={`${label(u.user.role)} · joined ${timeAgo(u.created_at)}`} /></div>
                        <div className="min-w-[200px] flex-[2] text-sm text-slate-600">
                          {u.sponsor?.company_name ?? u.coach?.specialty ?? u.bio ?? '—'}
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button tone="success" size="sm" onClick={() => setDialog({
                            title: `Verify ${u.user.full_name ?? ''}`, confirm: 'Verify', tone: 'success', reason: 'optional', reasonLabel: 'Note (audit log)',
                            onConfirm: async (reason) => { await api.setVerified(u.user.id, true, reason); done(); },
                          })}>Verify</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

const documentClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50';

function documentLabel(doc: VerificationRequest['documents'][number], index: number): string {
  return doc.name ?? doc.kind ?? `Document ${index + 1}`;
}

async function openPrivateDoc(bucket: string, path: string) {
  try {
    window.open(await signedDocumentUrl(bucket, path), '_blank', 'noopener');
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Could not open the document');
  }
}

function DocumentChip({ doc, index }: { doc: VerificationRequest['documents'][number]; index: number }) {
  const labelText = documentLabel(doc, index);
  const body = (
    <>
      <FileText className="h-3.5 w-3.5 text-slate-500" /> {labelText}
    </>
  );
  if (typeof doc.bucket === 'string' && typeof doc.path === 'string') {
    const bucket = doc.bucket;
    const path = doc.path;
    return (
      <button type="button" className={documentClass} onClick={() => { void openPrivateDoc(bucket, path); }}>
        {body}
      </button>
    );
  }
  const href = safeHttpsUrl(doc.url);
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={documentClass}>
        {body}
      </a>
    );
  }
  return <span className={documentClass}>{body}</span>;
}

/* Document links come from what the applicant submitted. Only https links are
   followed, so a javascript: URL can never run in an admin's session. */
function safeHttpsUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  try {
    return new URL(url).protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

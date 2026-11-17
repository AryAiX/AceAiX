import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SportRequest } from '../lib/api';
import { dateTime, label, timeAgo } from '../lib/format';
import { SPORTS } from '../lib/sports';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Field, Loading, PageHeader, StatusBadge, Tabs,
  type DialogSpec,
} from '../components/ui';

type Tab = 'pending' | 'approved' | 'matched' | 'rejected';

export default function SportRequestsPage() {
  const [status, setStatus] = useState<Tab>('pending');
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['sport-requests', status],
    queryFn: () => api.sportRequests(status),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['sport-requests'] });

  return (
    <>
      <PageHeader
        title="Sport requests"
        subtitle="Athletes whose sport is not in the list type it here. The typed name is not public until you approve it."
        actions={<Tabs value={status} onChange={setStatus} items={[
          { value: 'pending', label: 'Waiting' },
          { value: 'approved', label: 'Approved' },
          { value: 'matched', label: 'Matched' },
          { value: 'rejected', label: 'Rejected' },
        ]} />}
      />
      {error && <ErrorBox error={error} />}
      {isLoading ? <Loading /> : !data?.length ? (
        <Card><Empty title={status === 'pending' ? 'No sports waiting' : 'None'} /></Card>
      ) : (
        <div className="space-y-3">
          {data.map((row) => (
            <Card key={row.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-ink">{row.requested_name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link to={`/users/${row.user_id}`} className="text-sm font-medium text-ink hover:underline">
                      {row.full_name?.trim() || 'Unnamed'}
                    </Link>
                    {row.is_minor && <Badge color="orange">Minor</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{row.email ?? '—'}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Field label="Current sport">{row.current_sport ?? '—'}</Field>
                <Field label="Asked">{timeAgo(row.created_at)}</Field>
                {row.status !== 'pending' && (
                  <>
                    <Field label="Decision">{label(row.status)}</Field>
                    <Field label="Decided sport">{row.decided_sport ?? '—'}</Field>
                    <Field label="Note">{row.admin_note ?? '—'}</Field>
                    <Field label="Reviewed">{dateTime(row.reviewed_at)}</Field>
                  </>
                )}
              </dl>
              {row.status === 'pending' && (
                <WaitingActions row={row} onDialog={setDialog} refresh={refresh} />
              )}
            </Card>
          ))}
        </div>
      )}
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function WaitingActions({
  row, onDialog, refresh,
}: {
  row: SportRequest;
  onDialog: (spec: DialogSpec) => void;
  refresh: () => Promise<void> | void;
}) {
  const [name, setName] = useState(row.requested_name);
  const [sport, setSport] = useState('');
  const [note, setNote] = useState('');
  const athlete = row.full_name?.trim() || 'This athlete';
  const published = name.trim() || row.requested_name;

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <label className="block max-w-sm">
        <span className="text-xs font-medium text-slate-600">Name to approve</span>
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          className="input mt-1 w-full"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button tone="success" size="sm" onClick={() => onDialog({
          title: `Approve “${published}”`,
          body: `${athlete}'s profile will show ${published}. That name becomes public.`,
          confirm: 'Approve',
          tone: 'success',
          reason: 'none',
          onConfirm: async () => {
            await api.reviewSportRequest(row.id, 'approve', name.trim(), null);
            await refresh();
          },
        })}>Approve</Button>
      </div>

      <label className="block max-w-sm">
        <span className="text-xs font-medium text-slate-600">Match to a listed sport</span>
        <select value={sport} onChange={(e) => setSport(e.target.value)} className="input mt-1 w-full">
          <option value="">Choose a sport</option>
          {SPORTS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <Button size="sm" disabled={!sport} onClick={() => onDialog({
        title: `Set the sport to ${sport}`,
        body: `${athlete} asked for “${row.requested_name}”. Their profile will show ${sport}.`,
        confirm: 'Match',
        reason: 'none',
        onConfirm: async () => {
          await api.reviewSportRequest(row.id, 'match', sport, null);
          await refresh();
        },
      })}>Match to a listed sport</Button>

      <label className="block max-w-md">
        <span className="text-xs font-medium text-slate-600">
          Note to the athlete <span className="text-slate-400">(optional, {note.length}/300)</span>
        </span>
        <textarea
          value={note}
          maxLength={300}
          rows={2}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          placeholder="Shown with the rejection"
          className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-slate-400"
        />
      </label>
      <Button tone="danger" size="sm" onClick={() => onDialog({
        title: `Reject “${row.requested_name}”`,
        body: note.trim()
          ? `${athlete} will see: “${note.trim()}”`
          : `${athlete} will be asked to choose a sport from the list.`,
        confirm: 'Reject',
        tone: 'danger',
        reason: 'none',
        onConfirm: async () => {
          await api.reviewSportRequest(row.id, 'reject', null, note.trim() || null);
          await refresh();
        },
      })}>Reject</Button>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Trash2 } from 'lucide-react';
import { api, type CustomCity } from '../lib/api';
import { date } from '../lib/format';
import {
  ActionDialog, Button, Card, Empty, ErrorBox, Loading, PageHeader, type DialogSpec,
} from '../components/ui';

/**
 * Cities someone typed that are not in the catalogue yet.
 *
 * They show up only for the person who added them until an admin approves
 * the name for everyone, or removes it. Both actions are written to the
 * audit log.
 */
export default function CitiesPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['custom-cities'], queryFn: api.customCities });

  const refresh = () => qc.invalidateQueries({ queryKey: ['custom-cities'] });

  const approve = async (row: CustomCity) => {
    setActionError(null);
    setBusyId(row.id);
    try {
      await api.reviewCity(row.id, true);
      await refresh();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyId(null);
    }
  };

  const remove = (row: CustomCity) => setDialog({
    title: `Remove ${row.name}?`,
    body: <>It will no longer be suggested. Profiles, clubs and games that already use this name keep it; edit or report those separately. <b>{row.full_name ?? 'The person who added it'}</b> can add it again.</>,
    confirm: 'Remove',
    tone: 'danger',
    reason: 'none',
    onConfirm: async () => { await api.reviewCity(row.id, false); await refresh(); },
  });

  return (
    <>
      <PageHeader
        title="Cities"
        subtitle="Names someone typed that are not in the catalogue yet. Approving shows the name to everyone."
      />
      {error && <ErrorBox error={error} />}
      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {isLoading || !data ? <Loading /> : (
        <Card className="overflow-hidden">
          {data.length === 0 ? <Empty title="No cities waiting" /> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">City</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium">Added by</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-ink">{row.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.country}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.full_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{date(row.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" tone="success" busy={busyId === row.id} onClick={() => approve(row)}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" tone="danger" onClick={() => remove(row)}>
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

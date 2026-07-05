import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, AlertCircle, CheckCircle, X, FileText, Clock, ExternalLink } from 'lucide-react';
import { listVerificationRequests, decideVerification } from '../../api/admin';
import type { VerificationRequest } from '../../types';
import { AdminPage, StatusBadge } from '../../components/admin/AdminPrimitives';

function docLabel(doc: Record<string, unknown>): string {
  return String(doc.name ?? doc.title ?? doc.label ?? doc.type ?? 'Document');
}

function docUrl(doc: Record<string, unknown>): string | null {
  const raw = doc.url ?? doc.href ?? doc.storage_url ?? doc.publicUrl;
  return typeof raw === 'string' && raw !== '#' && raw.startsWith('http') ? raw : null;
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function AdminVerificationPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['verification-requests', 'all'],
    queryFn: () => listVerificationRequests(),
  });

  const selected = queue.find((q) => q.id === selectedId) ?? null;

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      decideVerification(id, status, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      setSelectedId(null);
      setNotes('');
    },
  });

  const isPending = (item: VerificationRequest) => item.status === 'pending';

  return (
    <AdminPage title="Verification Queue" subtitle="Review submitted documents and write decisions back to Supabase">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue */}
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {!isLoading && !queue.length && <p className="text-sm text-slate-500">No verification requests.</p>}
          {queue.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
              className={`card cursor-pointer transition-all ${selectedId === item.id ? 'border-blue-600/50 bg-blue-600/5' : 'hover:border-slate-600'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!isPending(item) ? 'bg-blue-600/15' : 'bg-amber-500/15'}`}>
                  {!isPending(item) ? <Clock size={18} className="text-blue-400" /> : <AlertCircle size={18} className="text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white capitalize">{item.type.replace('_', ' ')}</p>
                    <StatusBadge tone={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>{item.status.replace('_', ' ')}</StatusBadge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{item.documents.length} documents · {formatDate(item.created_at)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.organization_id ? 'Organization' : 'Individual'} verification</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white capitalize">{selected.type.replace('_', ' ')}</h2>
                <p className="text-xs text-slate-400">{selected.organization_id ? 'Organization' : 'Individual'} · Submitted {formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="mb-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Submitted Documents</p>
              <div className="space-y-2">
                {selected.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-navy-800 rounded-lg">
                    <FileText size={14} className="text-slate-400 flex-shrink-0" />
                    <p className="text-sm text-slate-300 flex-1">{docLabel(doc)}</p>
                    {docUrl(doc) ? (
                      <a href={docUrl(doc) ?? undefined} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline inline-flex items-center gap-1">
                        View <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No file URL</span>
                    )}
                  </div>
                ))}
                {!selected.documents.length && <p className="text-sm text-slate-500">No documents submitted.</p>}
              </div>
            </div>

            <div className="mb-5">
              <label className="label">Review Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field resize-none text-sm" placeholder="Add notes for this verification..." />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => decide.mutate({ id: selected.id, status: 'approved' })}
                disabled={decide.isPending}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                <CheckCircle size={15} /> Approve
              </button>
              <button
                onClick={() => decide.mutate({ id: selected.id, status: 'rejected' })}
                disabled={decide.isPending}
                className="flex-1 py-2 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-sm font-semibold text-rose-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X size={15} /> Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-center h-64">
            <div>
              <ShieldCheck size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Select an item to review</p>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { listMyConsentedAthletes, createMedicalRecord } from '../../api/medical';

interface UploadRecordModalProps {
  partnerId: string;
  onClose: () => void;
  lockedAthleteId?: string;
  lockedAthleteName?: string;
  clearanceId?: string;
  invalidateQueryKey?: unknown[];
}

export default function UploadRecordModal({
  partnerId,
  onClose,
  lockedAthleteId,
  lockedAthleteName,
  clearanceId,
  invalidateQueryKey,
}: UploadRecordModalProps) {
  const queryClient = useQueryClient();
  const [selectedAthleteId, setSelectedAthleteId] = useState(lockedAthleteId ?? '');
  const [recordType, setRecordType] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: consentedAthletes = [], isLoading: athletesLoading } = useQuery({
    queryKey: ['my-consented-athletes'],
    queryFn: listMyConsentedAthletes,
    enabled: !lockedAthleteId,
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      createMedicalRecord({
        athlete_id: selectedAthleteId,
        partner_id: partnerId,
        record_type: recordType,
        title,
        summary: summary || undefined,
        file: file ?? undefined,
        clearance_id: clearanceId,
      }),
    onSuccess: () => {
      if (invalidateQueryKey) {
        queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      }
      onClose();
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Upload Medical Record</h3>
          <button onClick={onClose} className="text-slate hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate">Athlete</label>
            {lockedAthleteId ? (
              <div className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-ink">
                {lockedAthleteName ?? 'Selected athlete'}
              </div>
            ) : (
              <>
                <select
                  className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm"
                  value={selectedAthleteId}
                  onChange={(e) => setSelectedAthleteId(e.target.value)}
                >
                  <option value="">Select an athlete…</option>
                  {athletesLoading && <option disabled>Loading…</option>}
                  {consentedAthletes.map((c) => (
                    <option key={c.id} value={c.athlete_id}>
                      {c.athlete?.user?.full_name ?? 'Athlete'}
                    </option>
                  ))}
                </select>
                {!athletesLoading && consentedAthletes.length === 0 && (
                  <p className="text-xs text-slate mt-1">No athletes have granted you consent yet.</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-xs text-slate">Record Type</label>
            <input
              className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm"
              placeholder="e.g. Lab Result, Imaging, Clearance Letter"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate">Title</label>
            <input
              className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate">Summary (optional)</label>
            <textarea
              className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate">File (optional)</label>
            <input
              type="file"
              className="w-full mt-1 text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button className="text-sm text-slate px-3 py-1.5" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50"
            disabled={!selectedAthleteId || !recordType || !title || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, CheckCircle, Clock, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getMyMedicalPartner,
  listPartnerClearances,
  listMyConsentedAthletes,
  createClearanceRequest,
  updateClearanceStatus,
} from '../../api/medical';
import UploadRecordModal from '../../components/partner/UploadRecordModal';
import type { ClearanceStatus } from '../../types';

const REQUEST_TYPES = ['Physical Assessment', 'Medical Clearance', 'Blood Test', 'Cardiac Screening', 'MRI / Imaging', 'Drug Test'];

const ACTIVE_STATUS_META: Record<Exclude<ClearanceStatus, 'cleared'>, { label: string; icon: React.ReactNode; badgeClass: string; iconBg: string }> = {
  pending:     { label: 'Pending',    icon: <Clock size={18} className="text-amber" />,       badgeClass: 'badge-amber', iconBg: 'rgba(245,166,35,0.08)' },
  restricted:  { label: 'Restricted', icon: <Clock size={18} className="text-azure" />,        badgeClass: 'badge-azure', iconBg: 'rgba(47,128,237,0.08)' },
  not_cleared: { label: 'Not Cleared', icon: <AlertCircle size={18} className="text-red-400" />, badgeClass: 'text-red-400', iconBg: 'rgba(235,87,87,0.08)' },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

export default function PartnerRequestsPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();

  const [showNew, setShowNew] = useState(false);
  const [newAthleteId, setNewAthleteId] = useState('');
  const [newType, setNewType] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [uploadTarget, setUploadTarget] = useState<null | { lockedAthleteId?: string; lockedAthleteName?: string; clearanceId?: string }>(null);

  const { data: partner, isLoading: partnerLoading, isError: partnerError } = useQuery({
    queryKey: ['my-medical-partner', userId],
    queryFn: () => getMyMedicalPartner(userId!),
    enabled: !!userId,
  });
  const partnerId = partner?.id;

  const { data: clearances = [], isLoading: clearancesLoading, isError: clearancesError } = useQuery({
    queryKey: ['partner-clearances', partnerId],
    queryFn: () => listPartnerClearances(partnerId!),
    enabled: !!partnerId,
  });
  const isLoading = partnerLoading || clearancesLoading;

  const { data: consentedAthletes = [], isLoading: athletesLoading } = useQuery({
    queryKey: ['my-consented-athletes'],
    queryFn: listMyConsentedAthletes,
    enabled: showNew,
  });

  const createRequestMutation = useMutation({
    mutationFn: () =>
      createClearanceRequest({
        athlete_id: newAthleteId,
        partner_id: partnerId!,
        request_type: newType,
        notes: newNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-clearances', partnerId] });
      setShowNew(false);
      setNewAthleteId('');
      setNewType('');
      setNewNotes('');
    },
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClearanceStatus }) => updateClearanceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-clearances', partnerId] });
    },
  });

  const active = clearances.filter((c) => c.status !== 'cleared');
  const completed = clearances.filter((c) => c.status === 'cleared');

  if (partnerError || clearancesError) {
    return (
      <div className="max-w-4xl">
        <div className="card p-4 border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          Something went wrong loading your requests. Please refresh the page or try again shortly.
        </div>
      </div>
    );
  }

  if (!partnerLoading && !partner) {
    return (
      <div className="max-w-4xl">
        <div className="card p-6 text-center text-sm text-slate">
          No medical partner profile is linked to your account yet. Please contact support to complete setup.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink font-display">Verification Requests</h1>
          <p className="text-sm text-slate mt-0.5">Manage athlete medical assessments and uploads</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary text-sm">
          <Plus size={14} /> New Request
        </button>
      </div>

      {showNew && (
        <div className="card p-5 border border-azure/40">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-ink">Create Verification Request</h2>
            <button onClick={() => setShowNew(false)} className="text-slate hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate">Athlete</label>
              <select
                className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm"
                value={newAthleteId}
                onChange={(e) => setNewAthleteId(e.target.value)}
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
            </div>
            <div>
              <label className="text-xs text-slate">Assessment Type</label>
              <select
                className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="">Select type...</option>
                {REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate">Notes</label>
            <textarea
              rows={2}
              className="w-full mt-1 p-2 rounded-lg border border-white/10 bg-transparent text-sm resize-none"
              placeholder="Any specific requirements or context..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              className="btn-primary text-sm disabled:opacity-50"
              disabled={!newAthleteId || !newType || createRequestMutation.isPending}
              onClick={() => createRequestMutation.mutate()}
            >
              {createRequestMutation.isPending ? 'Creating…' : 'Create Request'}
            </button>
            <button onClick={() => setShowNew(false)} className="text-sm text-slate px-3 py-1.5">Cancel</button>
          </div>
          {createRequestMutation.isError && (
            <p className="text-xs text-red-400 mt-2">Something went wrong creating the request. Please try again.</p>
          )}
        </div>
      )}

      <div
        className="card p-5 border-dashed border-white/[0.15] hover:border-azure/50 transition-colors cursor-pointer text-center"
        onClick={() => setUploadTarget({})}
      >
        <Upload size={28} className="text-slate mx-auto mb-3" />
        <p className="text-sm font-medium text-ink mb-1">Upload Medical Records</p>
        <p className="text-xs text-slate">PDF, JPG, PNG — up to 20MB per file</p>
        <button className="btn-primary mt-4 text-sm" onClick={(e) => { e.stopPropagation(); setUploadTarget({}); }}>
          Browse Files
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate">Active Requests</p>
        {isLoading && <p className="text-xs text-slate py-2">Loading…</p>}
        {!isLoading && !active.length && <p className="text-xs text-slate py-2">No active requests.</p>}
        {active.map((req) => {
          const meta = ACTIVE_STATUS_META[req.status as Exclude<ClearanceStatus, 'cleared'>];
          return (
            <div key={req.id} className="flex items-center gap-4 p-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] rounded-xl transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.iconBg }}>
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{req.athlete?.user?.full_name ?? 'Athlete'}</p>
                <p className="text-xs text-slate">{req.request_type ?? 'Medical Clearance'} · Requested {formatDate(req.created_at)}</p>
              </div>
              <span className={`${meta.badgeClass} text-xs capitalize`}>{meta.label}</span>
              <button
                className="btn-primary text-xs py-1.5 px-3 ml-2 flex-shrink-0"
                onClick={() => setUploadTarget({
                  lockedAthleteId: req.athlete_id,
                  lockedAthleteName: req.athlete?.user?.full_name ?? 'Athlete',
                  clearanceId: req.id,
                })}
              >
                <Upload size={12} /> Upload
              </button>
              <select
                className="text-xs p-1.5 rounded-lg border border-white/10 bg-transparent flex-shrink-0"
                value=""
                disabled={decisionMutation.isPending}
                onChange={(e) => {
                  const status = e.target.value as ClearanceStatus;
                  if (status) decisionMutation.mutate({ id: req.id, status });
                }}
              >
                <option value="">Update status…</option>
                <option value="cleared">Clear</option>
                <option value="restricted">Restrict</option>
                <option value="not_cleared">Not Cleared</option>
              </select>
            </div>
          );
        })}

        <p className="text-sm font-medium text-slate mt-6">Completed</p>
        {!isLoading && !completed.length && <p className="text-xs text-slate py-2">No completed clearances.</p>}
        {completed.map((req) => (
          <div key={req.id} className="flex items-center gap-4 p-4 bg-white/[0.04] border border-white/[0.09] rounded-xl opacity-70">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(31,181,122,0.08)' }}>
              <CheckCircle size={18} className="text-emerald" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{req.athlete?.user?.full_name ?? 'Athlete'}</p>
              <p className="text-xs text-slate">{req.request_type ?? 'Medical Clearance'} · Issued {formatDate(req.created_at)}</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald text-xs">
              <ShieldCheck size={13} /> Verified
            </div>
            <span className="badge-emerald text-xs">cleared</span>
          </div>
        ))}
      </div>

      {uploadTarget && partnerId && (
        <UploadRecordModal
          partnerId={partnerId}
          onClose={() => setUploadTarget(null)}
          lockedAthleteId={uploadTarget.lockedAthleteId}
          lockedAthleteName={uploadTarget.lockedAthleteName}
          clearanceId={uploadTarget.clearanceId}
        />
      )}
    </div>
  );
}

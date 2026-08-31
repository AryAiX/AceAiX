import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, FileText, TrendingUp, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyMedicalPartner, listPartnerClearances } from '../../api/medical';
import UploadRecordModal from '../../components/partner/UploadRecordModal';
import type { ClearanceStatus, VerificationStatus } from '../../types';

const STATUS_STYLE: Record<ClearanceStatus, { bg: string; icon: React.ReactNode; badgeClass: string }> = {
  cleared:     { bg: 'rgba(31,181,122,0.08)',  icon: <CheckCircle size={18} className="text-emerald" />,  badgeClass: 'badge-emerald' },
  restricted:  { bg: 'rgba(47,128,237,0.08)',  icon: <Clock size={18} className="text-azure" />,          badgeClass: 'badge-azure'   },
  not_cleared: { bg: 'rgba(235,87,87,0.08)',  icon: <AlertCircle size={18} className="text-red-400" />,    badgeClass: 'text-red-400'   },
  pending:     { bg: 'rgba(245,166,35,0.08)',  icon: <AlertCircle size={18} className="text-amber" />,    badgeClass: 'badge-amber'   },
};

const ACCREDITATION_BADGE: Record<VerificationStatus, { wrapClass: string; textClass: string; icon: React.ReactNode; label: string }> = {
  approved:  { wrapClass: 'bg-emerald/8 border-emerald/20',   textClass: 'text-emerald',   icon: <ShieldCheck size={13} className="text-emerald" />,  label: 'Verified Partner' },
  pending:   { wrapClass: 'bg-amber/8 border-amber/20',       textClass: 'text-amber',     icon: <Clock size={13} className="text-amber" />,          label: 'Verification Pending' },
  more_info: { wrapClass: 'bg-amber/8 border-amber/20',       textClass: 'text-amber',     icon: <Clock size={13} className="text-amber" />,          label: 'Verification Pending' },
  rejected:  { wrapClass: 'bg-red-500/8 border-red-500/20',   textClass: 'text-red-400',   icon: <AlertCircle size={13} className="text-red-400" />,  label: 'Not Verified' },
  expired:   { wrapClass: 'bg-red-500/8 border-red-500/20',   textClass: 'text-red-400',   icon: <AlertCircle size={13} className="text-red-400" />,  label: 'Verification Expired' },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

export default function PartnerDashboard() {
  const { profile } = useAuth();
  const userId = profile?.id;

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
  const hasError = partnerError || clearancesError;
  const isUnlinkedPartner = !partnerLoading && !partnerError && !partner;

  const [showUploadModal, setShowUploadModal] = useState(false);

  const clinicName = partner?.name ?? profile?.full_name ?? 'Medical Partner';
  const accreditationBadge = ACCREDITATION_BADGE[partner?.accreditation_status ?? 'pending'];

  const pendingCount = clearances.filter((c) => c.status === 'pending').length;
  const clearedCount = clearances.filter((c) => c.status === 'cleared').length;
  const activeAthletes = new Set(clearances.map((c) => c.athlete_id)).size;

  const statItems = [
    { label: 'Pending Requests', value: pendingCount,        icon: <Clock size={18} />,      color: '#F5A623', bg: 'rgba(245,166,35,0.08)' },
    { label: 'Cleared',          value: clearedCount,        icon: <CheckCircle size={18} />, color: '#1FB57A', bg: 'rgba(31,181,122,0.08)' },
    { label: 'Active Athletes',  value: activeAthletes,      icon: <FileText size={18} />,    color: '#2F80ED', bg: 'rgba(47,128,237,0.08)' },
    { label: 'Total Records',    value: clearances.length,   icon: <TrendingUp size={18} />,  color: '#2F80ED', bg: 'rgba(47,128,237,0.08)' },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink font-display">Medical Partner Dashboard</h1>
          <p className="text-sm text-slate mt-0.5">{clinicName} · Verified Partner</p>
        </div>
        <div className={`flex items-center gap-2 border rounded-full px-3 py-1.5 ${accreditationBadge.wrapClass}`}>
          {accreditationBadge.icon}
          <span className={`text-xs font-semibold ${accreditationBadge.textClass}`}>{accreditationBadge.label}</span>
        </div>
      </div>

      {hasError && (
        <div className="card p-4 border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          Something went wrong loading your dashboard. Please refresh the page or try again shortly.
        </div>
      )}

      {!hasError && isUnlinkedPartner && (
        <div className="card p-6 text-center text-sm text-slate">
          No medical partner profile is linked to your account yet. Please contact support to complete setup.
        </div>
      )}

      {!hasError && !isUnlinkedPartner && (
      <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map(s => (
          <div key={s.label} className="card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-ink tabular font-display">{s.value}</p>
            <p className="text-sm text-slate mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Requests */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">Issued Clearances</h2>
          <button className="btn-primary text-sm" onClick={() => setShowUploadModal(true)}>
            <Plus size={14} /> Upload Record
          </button>
        </div>
        <div className="space-y-3">
          {isLoading && <p className="text-xs text-slate py-4 text-center">Loading…</p>}
          {!isLoading && clearances.map(req => {
            const st = STATUS_STYLE[req.status];
            return (
              <div key={req.id} className="flex items-center gap-4 p-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: st.bg }}>
                  {st.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{req.athlete?.user?.full_name ?? 'Athlete'}</p>
                  <p className="text-xs text-slate">Medical Clearance · Issued {formatDate(req.created_at)}</p>
                </div>
                <span className={`${st.badgeClass} text-xs capitalize`}>{req.status.replace('_', ' ')}</span>
                {req.status !== 'cleared' && (
                  <button
                    className="btn-primary text-xs py-1.5 px-3 ml-2 flex-shrink-0 opacity-50 cursor-not-allowed"
                    disabled
                    title="Clearance decisions are managed from the Requests page"
                  >
                    Process
                  </button>
                )}
              </div>
            );
          })}
          {!isLoading && !clearances.length && (
            <p className="text-xs text-slate py-4 text-center">No clearances issued yet.</p>
          )}
        </div>
      </div>
      </>
      )}

      {showUploadModal && partnerId && (
        <UploadRecordModal
          partnerId={partnerId}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}

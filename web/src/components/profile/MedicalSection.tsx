import { Lock, Stethoscope, ShieldCheck, Link } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import SectionCard from './SectionCard';
import StatusChip from '../ui/StatusChip';
import type { MedicalClearance, MedicalRecord } from '../../types';

interface MedicalSectionProps {
  isGranted: boolean;
  isOwner?: boolean;
  clearance?: MedicalClearance | null;
  records?: MedicalRecord[];
}

const CHIP_STATUS: Record<string, 'cleared' | 'pending' | 'restricted' | 'not-cleared'> = {
  cleared: 'cleared',
  pending: 'pending',
  restricted: 'restricted',
  not_cleared: 'not-cleared',
};

const CLEARANCE_LABEL: Record<string, string> = {
  cleared: 'Full Clearance',
  pending: 'Clearance Pending',
  restricted: 'Restricted Clearance',
  not_cleared: 'Not Cleared',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function MedicalSection({ isGranted, isOwner, clearance, records = [] }: MedicalSectionProps) {
  const status = clearance?.status ?? 'pending';
  const chipStatus = CHIP_STATUS[status] ?? 'pending';
  const issued = fmtDate(clearance?.effective_from);
  const validUntil = fmtDate(clearance?.effective_to);
  const provenance = records.find(r => r.is_verified) ?? records[0];

  return (
    <SectionCard title="Medical Intelligence" icon={<Stethoscope size={15} />} isOwner={isOwner}>
      {/* Always-visible clearance strip */}
      <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 mb-4 ${status === 'cleared' ? 'border-emerald/20 bg-emerald/[0.06]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
        <ShieldCheck size={16} className={`flex-shrink-0 ${status === 'cleared' ? 'text-emerald' : 'text-muted'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{CLEARANCE_LABEL[status] ?? 'Clearance'}</p>
          <p className="text-xs text-muted">
            {clearance
              ? [clearance.issued_by, issued && `Issued ${issued}`, validUntil && `Valid until ${validUntil}`].filter(Boolean).join(' · ') || 'On file'
              : 'No clearance record on file'}
          </p>
        </div>
        <StatusChip status={chipStatus} />
      </div>

      {isGranted || isOwner ? (
        <div className="space-y-3">
          {[
            { label: 'Records on File', value: records.length > 0 ? `${records.length} verified record${records.length === 1 ? '' : 's'} from accredited partners.` : 'No medical records on file yet.' },
            { label: 'Latest Assessment', value: provenance ? `${provenance.title ?? provenance.record_type}${provenance.summary ? ` — ${provenance.summary}` : ''}` : 'No assessments recorded.' },
            { label: 'Provenance', value: provenance?.hash ? `Tamper-evident hash verified: ${provenance.hash.slice(0, 28)}…` : 'No provenance hash available.' },
          ].map(item => (
            <div key={item.label} className="border border-white/[0.06] rounded-xl px-4 py-3 bg-white/[0.02]">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-sm text-slate-300">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-white/[0.06] rounded-xl bg-white/[0.02]">
          <Lock size={24} className="text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">Restricted Access</p>
          <p className="text-xs text-muted mb-4">Full medical records require athlete consent. Sign in to request access.</p>
          <RouterLink to="/auth/register"
            className="inline-flex items-center gap-2 btn-outline px-5 py-2 text-xs">
            <Link size={12} /> Request Medical Access
          </RouterLink>
        </div>
      )}
    </SectionCard>
  );
}

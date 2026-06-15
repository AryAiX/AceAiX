import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

type Status = 'cleared' | 'pending' | 'restricted' | 'not-cleared';

const CONFIG: Record<Status, { label: string; icon: React.ReactNode; cls: string }> = {
  cleared:     { label: 'Cleared',      icon: <CheckCircle  size={12} />, cls: 'chip-cleared' },
  pending:     { label: 'Pending',      icon: <Clock        size={12} />, cls: 'chip-pending' },
  restricted:  { label: 'Restricted',   icon: <AlertCircle  size={12} />, cls: 'chip-restricted' },
  'not-cleared': { label: 'Not Cleared', icon: <XCircle     size={12} />, cls: 'chip-not-cleared' },
};

interface StatusChipProps {
  status: Status;
  label?: string;
}

export default function StatusChip({ status, label }: StatusChipProps) {
  const { label: defaultLabel, icon, cls } = CONFIG[status];
  return (
    <span className={cls}>
      {icon}
      {label ?? defaultLabel}
    </span>
  );
}

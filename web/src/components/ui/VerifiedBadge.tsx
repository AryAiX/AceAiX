import { ShieldCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  animated?: boolean;
  dark?: boolean;
}

const SIZE_CONFIG = {
  sm: { icon: 14, px: 'px-2.5', py: 'py-1',   text: 'text-xs' },
  md: { icon: 18, px: 'px-3',   py: 'py-1.5',  text: 'text-xs' },
  lg: { icon: 24, px: 'px-4',   py: 'py-2',    text: 'text-sm' },
};

export default function VerifiedBadge({
  size = 'md',
  label,
  animated = true,
  dark = false,
}: VerifiedBadgeProps) {
  const config     = SIZE_CONFIG[size];
  const bgColor    = dark ? 'rgba(255,255,255,0.1)' : 'rgba(31,181,122,0.1)';
  const textColor  = dark ? 'rgba(255,255,255,0.9)' : '#1FB57A';
  const borderColor = dark ? 'rgba(255,255,255,0.15)' : 'rgba(31,181,122,0.2)';

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${config.px} ${config.py} rounded-full font-semibold border ${config.text}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor,
        animation: animated ? 'stampIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
      }}
    >
      <ShieldCheck size={config.icon} color={textColor} />
      {label && label}
    </div>
  );
}

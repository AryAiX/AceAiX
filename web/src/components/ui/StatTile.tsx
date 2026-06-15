import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatTileProps {
  value: number | string;
  label: string;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'azure' | 'emerald' | 'amber' | 'volt';
  dark?: boolean;
}

const ACCENT_COLORS: Record<string, string> = {
  azure:   '#2F80ED',
  emerald: '#1FB57A',
  amber:   '#F5A623',
  volt:    '#B8F135',
};
const ACCENT_BG: Record<string, string> = {
  azure:   'rgba(47,128,237,0.10)',
  emerald: 'rgba(31,181,122,0.10)',
  amber:   'rgba(245,166,35,0.10)',
  volt:    'rgba(184,241,53,0.10)',
};

function useCountUp(target: number, active: boolean) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!active) return;
    const steps = 40;
    let step = 0;
    const inc = target / steps;
    const id = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(inc * step), target));
      if (step >= steps) clearInterval(id);
    }, 900 / steps);
    return () => clearInterval(id);
  }, [active, target]);
  return current;
}

export default function StatTile({
  value,
  label,
  icon: Icon,
  trend,
  trendValue,
  accent = 'azure',
}: StatTileProps) {
  const ref   = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10);
  const isNumeric    = typeof value === 'number' && !isNaN(numericValue);
  const counted      = useCountUp(numericValue, isNumeric && visible);

  const accentColor = ACCENT_COLORS[accent];
  const accentBg    = ACCENT_BG[accent];
  const bgColor     = 'rgba(22,39,59,0.6)';
  const borderColor = 'rgba(255,255,255,0.08)';
  const labelColor  = 'rgba(255,255,255,0.55)';

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-2xl p-4"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 0.45s cubic-bezier(0.19,1,0.22,1), transform 0.45s cubic-bezier(0.19,1,0.22,1)',
      }}
    >
      {Icon && (
        <div className="mb-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: accentBg }}>
          <Icon size={16} color={accentColor} />
        </div>
      )}
      <div
        className="font-bold leading-none mb-1 tabular"
        style={{ fontSize: 24, fontFamily: "'Clash Display', sans-serif", color: accentColor }}
      >
        {isNumeric && visible ? counted.toLocaleString() : value}
      </div>
      <div className="text-xs font-medium mb-2" style={{ color: labelColor }}>{label}</div>
      {trend && trendValue && (
        <div
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: trend === 'up' ? '#1FB57A' : trend === 'down' ? '#EF5350' : labelColor }}
        >
          {trend === 'up' ? <TrendingUp size={11} /> : trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
          {trendValue}
        </div>
      )}
    </div>
  );
}

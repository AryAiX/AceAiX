import React, { useState, useEffect } from 'react';

export interface SeasonStat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  max: number;
  raw: number;
}

export default function StatTileCard({ stat, delay }: { stat: SeasonStat; delay: number }) {
  const [vis, setVis] = useState(false);
  const [barW, setBarW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { setVis(true); setTimeout(() => setBarW((stat.raw / stat.max) * 100), 100); }, delay);
    return () => clearTimeout(t);
  }, [delay, stat.raw, stat.max]);

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5"
      style={{
        background: `${stat.color}08`,
        border: `1px solid ${stat.color}20`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 20px ${stat.color}0C`,
      }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}28` }}>
          <stat.icon size={14} style={{ color: stat.color }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${stat.color}80` }}>
          of {stat.max}
        </span>
      </div>
      <div>
        <p className="text-2xl font-display font-bold tabular leading-none" style={{ color: stat.color }}>{stat.value}</p>
        <p className="text-[11px] text-white/35 mt-0.5 uppercase tracking-wider">{stat.label}</p>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full"
          style={{
            width: `${barW}%`,
            background: stat.color,
            boxShadow: `0 0 6px ${stat.color}60`,
            transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1) 0.2s',
          }} />
      </div>
    </div>
  );
}

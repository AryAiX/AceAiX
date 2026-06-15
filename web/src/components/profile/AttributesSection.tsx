import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Plus, Zap } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface AttributesSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

const ATTR_COLORS: Record<string, string> = {
  Pace:      '#B8F135',
  Shooting:  '#2F80ED',
  Passing:   '#1FB57A',
  Dribbling: '#F5A623',
  Defending: '#7C8DA6',
  Physical:  '#EF5350',
};

/* Hexagon radar drawn with SVG */
function RadarChart({ attrs }: { attrs: AthleteProfileData['attributes'] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setDrawn(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const n = attrs.length;

  function polarPoint(angle: number, radius: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const levels = [0.25, 0.5, 0.75, 1];
  const axes = attrs.map((a, i) => ({ ...a, angle: (360 / n) * i }));

  const dataPoints = axes.map(a => {
    const pct = (drawn ? a.value : 0) / 100;
    return polarPoint(a.angle, r * pct);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg ref={ref} viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Grid rings */}
      {levels.map(lvl => {
        const pts = axes.map(a => polarPoint(a.angle, r * lvl));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
        return <path key={lvl} d={path} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />;
      })}
      {/* Axis lines */}
      {axes.map(a => {
        const end = polarPoint(a.angle, r);
        return <line key={a.label} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />;
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="rgba(47,128,237,0.18)" stroke="#2F80ED" strokeWidth={2}
        style={{ transition: 'all 1.2s cubic-bezier(0.19,1,0.22,1)' }} />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#2F80ED"
          style={{ transition: `all 1.2s cubic-bezier(0.19,1,0.22,1) ${i * 0.05}s` }} />
      ))}
      {/* Labels */}
      {axes.map(a => {
        const pos = polarPoint(a.angle, r + 18);
        return (
          <text key={a.label} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            fill="#7C8DA6" fontSize={10} fontWeight={600}>{a.label}</text>
        );
      })}
    </svg>
  );
}

function SkillBar({ attr, index }: { attr: AthleteProfileData['attributes'][0]; index: number }) {
  const [endorsed, setEndorsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const color = ATTR_COLORS[attr.label] ?? '#2F80ED';

  useEffect(() => {
    const el = ref.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      el.style.transition = `opacity 0.45s ease ${index * 0.06}s, transform 0.45s cubic-bezier(0.19,1,0.22,1) ${index * 0.06}s`;
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
      setTimeout(() => {
        bar.style.transition = `width 1.1s cubic-bezier(0.19,1,0.22,1) ${index * 0.06}s`;
        bar.style.width = `${attr.value}%`;
      }, 80);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [attr.value, index]);

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{attr.label}</span>
          <span className="font-display font-bold text-sm tabular" style={{ color }}>{attr.value}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{attr.endorsements + (endorsed ? 1 : 0)}</span>
          <button onClick={() => setEndorsed(e => !e)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${endorsed ? 'border-azure/40 bg-azure/15 text-azure' : 'border-white/15 bg-white/[0.04] text-muted hover:border-azure/30 hover:text-azure'}`}>
            <Plus size={9} className={endorsed ? 'rotate-45' : ''} style={{ transition: 'transform 0.2s' }} />
            {endorsed ? 'Endorsed' : 'Endorse'}
          </button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div ref={barRef} className="h-full rounded-full" style={{ width: 0, background: color, boxShadow: `0 0 8px ${color}60` }} />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-muted">Top endorser:</span>
        <span className="text-[10px] text-white/60">{attr.topEndorser}</span>
        {attr.topEndorserVerified && <ShieldCheck size={9} className="text-emerald" />}
      </div>
    </div>
  );
}

export default function AttributesSection({ athlete, isOwner }: AttributesSectionProps) {
  return (
    <SectionCard title="Attributes &amp; Skills" icon={<Zap size={15} />} isOwner={isOwner}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex justify-center">
          <RadarChart attrs={athlete.attributes} />
        </div>
        <div className="space-y-3">
          {athlete.attributes.map((attr, i) => (
            <SkillBar key={attr.label} attr={attr} index={i} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

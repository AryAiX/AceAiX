import { useEffect, useRef, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface PerformanceSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

const RATING_COLOR = (r: number) =>
  r >= 8.5 ? '#B8F135' : r >= 7 ? '#2F80ED' : r >= 6 ? '#F5A623' : '#EF5350';

const RESULT_COLOR = (res: string) =>
  res.endsWith('W') ? 'text-emerald' : res.endsWith('D') ? 'text-amber' : 'text-coral';

/* SVG line/area chart — no recharts */
function TrajectoryChart({ data }: { data: AthleteProfileData['trajectory'] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setAnimate(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const W = 560, H = 160, padL = 32, padR = 12, padT = 12, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const actualPts = data.filter(d => d.goals !== undefined);
  const forecastPts = data.filter(d => d.forecast !== undefined);
  const maxVal = Math.max(...data.map(d => Math.max(d.goals ?? 0, d.forecast ?? 0))) + 4;

  function xPos(i: number, total: number) { return padL + (i / (total - 1)) * chartW; }
  function yPos(v: number) { return padT + chartH - (v / maxVal) * chartH; }

  const totalLabels = data.length;
  const actualPath = actualPts.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i, totalLabels).toFixed(1)},${yPos(d.goals!).toFixed(1)}`).join(' ');
  const actualArea = actualPath + ` L${xPos(actualPts.length - 1, totalLabels).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

  const forecastStartIdx = data.findIndex(d => d.forecast !== undefined);
  const forecastPath = forecastPts.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(forecastStartIdx + i, totalLabels).toFixed(1)},${yPos(d.forecast!).toFixed(1)}`).join(' ');

  // Animate stroke-dasharray
  const pathRef = useRef<SVGPathElement>(null);
  const forecastRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (!animate) return;
    [pathRef, forecastRef].forEach(r => {
      const el = r.current;
      if (!el) return;
      const len = el.getTotalLength?.() ?? 400;
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      el.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.19,1,0.22,1) 0.1s';
      requestAnimationFrame(() => { el.style.strokeDashoffset = '0'; });
    });
  }, [animate]);

  const yTicks = [0, Math.round(maxVal * 0.5), maxVal];

  return (
    <div className="overflow-x-auto">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: H }}>
        <defs>
          <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8F135" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#B8F135" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Grid */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={padL} y1={yPos(v)} x2={W - padR} y2={yPos(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={padL - 4} y={yPos(v)} textAnchor="end" dominantBaseline="middle" fill="#7C8DA6" fontSize={9}>{v}</text>
          </g>
        ))}
        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={d.season} x={xPos(i, totalLabels)} y={H - 6} textAnchor="middle" fill="#7C8DA6" fontSize={9}>{d.season}</text>
        ))}
        {/* "Now" line */}
        {forecastStartIdx > 0 && (
          <line x1={xPos(forecastStartIdx, totalLabels)} y1={padT} x2={xPos(forecastStartIdx, totalLabels)} y2={padT + chartH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 3" />
        )}
        {/* Actual area */}
        <path d={actualArea} fill="url(#tGrad)" />
        {/* Actual line */}
        <path ref={pathRef} d={actualPath} fill="none" stroke="#B8F135" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Forecast dashed line */}
        <path ref={forecastRef} d={forecastPath} fill="none" stroke="#2F80ED" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
        {/* Dots */}
        {actualPts.map((d, i) => (
          <circle key={i} cx={xPos(i, totalLabels)} cy={yPos(d.goals!)} r={3.5} fill="#B8F135" />
        ))}
        {forecastPts.map((d, i) => (
          <circle key={i} cx={xPos(forecastStartIdx + i, totalLabels)} cy={yPos(d.forecast!)} r={3} fill="#2F80ED" />
        ))}
      </svg>
    </div>
  );
}

export default function PerformanceSection({ athlete, isOwner }: PerformanceSectionProps) {
  return (
    <SectionCard title="Performance" icon={<BarChart3 size={15} />} isOwner={isOwner}>
      <div className="space-y-6">
        {/* Recent matches */}
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Recent Matches</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date', 'Opponent', 'Competition', 'Result', 'Min', 'G', 'A', 'Rating'].map(h => (
                    <th key={h} className="pb-2 text-left font-semibold text-muted pr-3 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {athlete.recentMatches.map((m, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 pr-3 text-muted">{m.date}</td>
                    <td className="py-2 pr-3 text-white font-medium">{m.opponent}</td>
                    <td className="py-2 pr-3 text-muted">{m.competition}</td>
                    <td className={`py-2 pr-3 font-bold ${RESULT_COLOR(m.result)}`}>{m.result}</td>
                    <td className="py-2 pr-3 text-muted">{m.minutes}'</td>
                    <td className="py-2 pr-3 font-bold text-volt">{m.goals}</td>
                    <td className="py-2 pr-3 font-bold text-azure">{m.assists}</td>
                    <td className="py-2 font-display font-bold tabular" style={{ color: RATING_COLOR(m.rating) }}>
                      {m.rating.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trajectory chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-volt" />
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Career Trajectory + AI Projection</p>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1 text-[10px] text-muted"><span className="w-4 h-0.5 bg-volt inline-block rounded" /> Actual</span>
              <span className="flex items-center gap-1 text-[10px] text-muted"><span className="w-4 h-0.5 bg-azure inline-block rounded border-dashed" style={{ borderTop: '2px dashed #2F80ED', background: 'none' }} /> AI Forecast</span>
            </div>
          </div>
          <TrajectoryChart data={athlete.trajectory} />
          <p className="text-[10px] text-muted mt-2">AI projection based on form trend, age curve, and competition level.</p>
        </div>
      </div>
    </SectionCard>
  );
}

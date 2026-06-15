import { useEffect, useRef } from 'react';
import { GraduationCap, Award } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface AcademySectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

function AcademyEntry({ entry, index }: { entry: AthleteProfileData['academy'][0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.45s cubic-bezier(0.19,1,0.22,1) ${index * 0.08}s, transform 0.45s cubic-bezier(0.19,1,0.22,1) ${index * 0.08}s`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, { threshold: 0.1 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [index]);

  return (
    <div ref={ref} className="flex gap-4 border border-white/[0.06] rounded-2xl p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-azure/10 border border-azure/20 flex items-center justify-center flex-shrink-0">
        <GraduationCap size={16} className="text-azure" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-white text-sm">{entry.name}</p>
            <p className="text-xs text-muted mt-0.5">{entry.location} · {entry.years}</p>
          </div>
          {entry.scholarship && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber border border-amber/25 bg-amber/10 px-2 py-0.5 rounded-full flex-shrink-0">
              <Award size={9} /> Scholarship
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{entry.description}</p>
      </div>
    </div>
  );
}

export default function AcademySection({ athlete, isOwner }: AcademySectionProps) {
  return (
    <SectionCard title="Academy &amp; Development" icon={<GraduationCap size={15} />} isOwner={isOwner}>
      <div className="space-y-4">
        {athlete.academy.map((entry, i) => (
          <AcademyEntry key={entry.name} entry={entry} index={i} />
        ))}
      </div>
    </SectionCard>
  );
}

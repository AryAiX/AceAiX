import { useEffect, useRef } from 'react';
import { Trophy, Star, Flag } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface HonorsSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

const TYPE_CONFIG = {
  team:       { icon: Trophy, color: '#F5A623', bg: 'bg-amber/10 border-amber/20' },
  individual: { icon: Star,   color: '#B8F135', bg: 'bg-volt/10 border-volt/20'  },
  national:   { icon: Flag,   color: '#2F80ED', bg: 'bg-azure/10 border-azure/20' },
};

function HonorItem({ honor, index }: { honor: AthleteProfileData['honors'][0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'scale(0.9)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.45s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.07}s, transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.07}s`;
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      }, { threshold: 0.1 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [index]);

  const cfg = TYPE_CONFIG[honor.type];
  const Icon = cfg.icon;
  return (
    <div ref={ref} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${cfg.bg}`}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}18` }}>
        <Icon size={14} style={{ color: cfg.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{honor.title}</p>
        <p className="text-xs text-muted truncate">{honor.org} · {honor.year}</p>
      </div>
    </div>
  );
}

export default function HonorsSection({ athlete, isOwner }: HonorsSectionProps) {
  return (
    <SectionCard title="Honors &amp; Awards" icon={<Trophy size={15} />} isOwner={isOwner}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {athlete.honors.map((honor, i) => (
          <HonorItem key={honor.title} honor={honor} index={i} />
        ))}
      </div>
    </SectionCard>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Shirt, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface ClubCareerSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

function CareerEntry({ spell, index }: { spell: AthleteProfileData['career'][0]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const ref = useRef<HTMLDivElement>(null);
  const isCurrent = spell.to === 'Present';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-16px)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.5s cubic-bezier(0.19,1,0.22,1) ${index * 0.08}s, transform 0.5s cubic-bezier(0.19,1,0.22,1) ${index * 0.08}s`;
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      }, { threshold: 0.1 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [index]);

  return (
    <div ref={ref} className="relative pl-12">
      {index < 2 && <div className="absolute left-4 top-10 bottom-0 w-px bg-white/[0.06]" />}
      <div className="absolute left-0 top-0 w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold"
        style={{ background: `${spell.clubColor}18`, borderColor: `${spell.clubColor}30`, color: spell.clubColor }}>
        {spell.clubInitials}
      </div>
      <div className="border border-white/[0.06] rounded-2xl p-4 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm">{spell.club}</p>
              {isCurrent && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald border border-emerald/25 bg-emerald/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-emerald animate-pulse" />Current
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">{spell.role} · {spell.from} – {spell.to}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="font-display font-bold text-volt text-lg tabular">{spell.goals}</span>
              <span className="text-muted text-xs"> G</span>
              <span className="mx-1 text-muted">·</span>
              <span className="font-display font-bold text-azure text-lg tabular">{spell.assists}</span>
              <span className="text-muted text-xs"> A</span>
            </div>
            {open ? <ChevronUp size={14} className="text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-muted flex-shrink-0" />}
          </div>
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">{spell.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1"><Shirt size={10} /> {spell.appearances} appearances</span>
            </div>
            {spell.honors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {spell.honors.map(h => (
                  <span key={h} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-volt/10 border border-volt/20 text-volt font-semibold">
                    <Trophy size={9} /> {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClubCareerSection({ athlete, isOwner }: ClubCareerSectionProps) {
  return (
    <SectionCard title="Club Career" icon={<Shirt size={15} />} isOwner={isOwner}>
      <div className="space-y-4">
        {athlete.career.map((spell, i) => (
          <CareerEntry key={spell.club + spell.from} spell={spell} index={i} />
        ))}
      </div>
    </SectionCard>
  );
}

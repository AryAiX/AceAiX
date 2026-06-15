import { useEffect, useRef } from 'react';
import { ShieldCheck, BadgeCheck, Clock } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface CertificationsSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

function CertItem({ cert, index }: { cert: AthleteProfileData['certifications'][0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.4s ease ${index * 0.06}s, transform 0.4s cubic-bezier(0.19,1,0.22,1) ${index * 0.06}s`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, { threshold: 0.1 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [index]);

  return (
    <div ref={ref} className="flex items-center gap-3 border border-white/[0.06] rounded-xl px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cert.verified ? 'bg-emerald/10 border border-emerald/20' : 'bg-white/[0.05] border border-white/10'}`}>
        {cert.verified ? <ShieldCheck size={14} className="text-emerald" /> : <BadgeCheck size={14} className="text-muted" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{cert.title}</p>
          {cert.verified && <span className="text-[9px] font-bold text-emerald border border-emerald/20 bg-emerald/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Verified</span>}
        </div>
        <p className="text-xs text-muted mt-0.5">{cert.issuer} · {cert.date}</p>
      </div>
      {cert.expiry && (
        <div className="flex items-center gap-1 text-[10px] text-muted flex-shrink-0">
          <Clock size={10} /> Exp. {cert.expiry}
        </div>
      )}
    </div>
  );
}

export default function CertificationsSection({ athlete, isOwner }: CertificationsSectionProps) {
  return (
    <SectionCard title="Certifications &amp; Licenses" icon={<BadgeCheck size={15} />} isOwner={isOwner}>
      <div className="space-y-3">
        {athlete.certifications.map((cert, i) => (
          <CertItem key={cert.title} cert={cert} index={i} />
        ))}
      </div>
    </SectionCard>
  );
}

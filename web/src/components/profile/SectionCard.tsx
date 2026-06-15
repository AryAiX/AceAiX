import { Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef, type ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  expandable?: boolean;
  defaultExpanded?: boolean;
  isOwner?: boolean;
  onEdit?: () => void;
  delay?: number;
  className?: string;
  noPad?: boolean;
}

export default function SectionCard({
  title, icon, children, expandable, defaultExpanded = true,
  isOwner, onEdit, delay = 0, className = '', noPad = false,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.style.transition = `opacity 0.6s cubic-bezier(0.19,1,0.22,1) ${delay}s, transform 0.6s cubic-bezier(0.19,1,0.22,1) ${delay}s`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, { threshold: 0.05 });
      obs.observe(el);
    });
    return () => cancelAnimationFrame(raf);
  }, [delay]);

  return (
    <div ref={ref} className={`card-glass overflow-hidden ${className}`}>
      <div className={`flex items-center justify-between ${noPad ? 'px-5 pt-5' : 'px-5 pt-5 pb-1'}`}>
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-muted">{icon}</span>}
          <h2 className="font-display font-bold text-white text-base">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <button onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors">
              <Pencil size={13} />
            </button>
          )}
          {expandable && (
            <button onClick={() => setExpanded(e => !e)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className={noPad ? '' : 'px-5 pb-5 pt-3'}>{children}</div>
      )}
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
  glowColor?: 'azure' | 'volt' | 'emerald' | 'none';
}

export default function GlassPanel({
  children,
  className = '',
  animate = false,
  delay = 0,
  glowColor = 'none',
}: GlassPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (!animate || !ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [animate]);

  const glow = {
    azure:   '0 0 40px rgba(47,128,237,0.12)',
    volt:    '0 0 40px rgba(184,241,53,0.10)',
    emerald: '0 0 40px rgba(31,181,122,0.10)',
    none:    undefined,
  }[glowColor];

  return (
    <div
      ref={ref}
      className={`card-glass ${className}`}
      style={{
        boxShadow: glow,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s cubic-bezier(0.19,1,0.22,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

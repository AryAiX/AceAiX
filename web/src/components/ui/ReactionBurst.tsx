import React, { useState, useCallback, useRef } from 'react';

interface Particle { id: number; x: number; y: number; angle: number; }

interface ReactionBurstProps {
  onReact?: () => void;
  children: React.ReactNode;
  count?: number;
}

export default function ReactionBurst({ onReact, children, count }: ReactionBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [, setLiked] = useState(false);
  const [, setLikeCount] = useState(count ?? 0);
  const [showHeart, setShowHeart] = useState(false);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burst = useCallback((e: React.MouseEvent) => {
    setLiked(true);
    setLikeCount(c => c + 1);
    onReact?.();

    setShowHeart(true);
    if (heartTimer.current) clearTimeout(heartTimer.current);
    heartTimer.current = setTimeout(() => setShowHeart(false), 700);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newParticles: Particle[] = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      x, y,
      angle: (i / 10) * 360,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id))), 650);
  }, [onReact]);

  return (
    <div className="relative inline-flex" onDoubleClick={burst}>
      {children}

      {/* Particles */}
      {particles.map(p => {
        const dx = Math.cos((p.angle * Math.PI) / 180) * 36;
        const dy = Math.sin((p.angle * Math.PI) / 180) * 36;
        return (
          <div
            key={p.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: 8,
              height: 8,
              background: p.angle % 60 < 30 ? '#B8F135' : '#2F80ED',
              boxShadow: `0 0 6px ${p.angle % 60 < 30 ? '#B8F135' : '#2F80ED'}`,
              animation: 'particleBurst 0.6s ease-out forwards',
              ['--dx' as string]: `${dx}px`,
              ['--dy' as string]: `${dy}px`,
            }}
          />
        );
      })}

      {/* Heart pop */}
      {showHeart && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ animation: 'heartPop 0.7s ease-out forwards' }}
        >
          <span style={{ fontSize: 56, filter: 'drop-shadow(0 0 10px #B8F135)' }}>⚡</span>
        </div>
      )}
    </div>
  );
}

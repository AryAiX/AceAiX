import { useEffect, useState } from 'react';

interface ScoreRingProps {
  /* ── value modes ──────────────────────────────────────── */
  score?: number;        // 0–10  (original mode)
  value?: number;        // 0–max (percentage / arbitrary mode)
  max?: number;          // default 100 when value is used
  /* ── appearance ─────────────────────────────────────── */
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;     // inside-ring sub-label
  animated?: boolean;
  dark?: boolean;
  isTopTier?: boolean;   // volt accent for #1 ring
  color?: string;        // override stroke color
}

export default function ScoreRing({
  score,
  value,
  max = 100,
  size = 88,
  strokeWidth = 7,
  label,
  sublabel,
  animated = true,
  isTopTier = false,
}: ScoreRingProps) {
  const [mounted, setMounted] = useState(false);
  const radius       = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  /* normalise to a 0–1 fill fraction */
  let fraction = 0;
  let displayText = '';
  if (score !== undefined) {
    fraction    = Math.min(Math.max(score, 0), 10) / 10;
    displayText = Math.min(Math.max(score, 0), 10).toFixed(1);
  } else if (value !== undefined) {
    fraction    = Math.min(Math.max(value, 0), max) / max;
    displayText = `${Math.round(fraction * 100)}%`;
  }

  const offset       = circumference * (1 - fraction);
  const animOffset   = animated && mounted ? offset : circumference;

  const trackColor  = 'rgba(255,255,255,0.08)';

  /* glow shadow behind fill arc */
  const glowColor = isTopTier
    ? 'rgba(184,241,53,0.45)'
    : 'rgba(47,128,237,0.40)';

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  /* text sizing */
  const valueFontSize  = size * 0.24;
  const sublabelSize   = size * 0.12;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>

        {/* ── outer glow ring (decorative) ───────────────── */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            opacity: mounted ? (isTopTier ? 0.35 : 0.20) : 0,
            boxShadow: `0 0 ${size * 0.25}px ${glowColor}`,
            transition: 'opacity 0.8s ease 0.6s',
            borderRadius: '50%',
          }}
        />

        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)', display: 'block', position: 'relative', zIndex: 1 }}
        >
          <defs>
            {/* gradient along the arc */}
            <linearGradient id={`ring-grad-${size}-${isTopTier ? 'v' : 'a'}`} x1="0" y1="0" x2="1" y2="1">
              {isTopTier ? (
                <>
                  <stop offset="0%"   stopColor="#D4FF72" />
                  <stop offset="100%" stopColor="#B8F135" />
                </>
              ) : (
                <>
                  <stop offset="0%"   stopColor="#60AAFF" />
                  <stop offset="100%" stopColor="#2F80ED" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />

          {/* fill arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={`url(#ring-grad-${size}-${isTopTier ? 'v' : 'a'})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animOffset}
            style={{
              transition: animated
                ? 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.2s'
                : 'none',
              filter: `drop-shadow(0 0 4px ${glowColor})`,
            }}
          />
        </svg>

        {/* ── centre text ─────────────────────────────────── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-0"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'scale(1)' : 'scale(0.7)',
            transition: 'opacity 0.35s ease 0.5s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.5s',
          }}
        >
          <span
            className="font-bold leading-none tabular"
            style={{
              fontSize: valueFontSize,
              color: isTopTier ? '#B8F135' : '#F4F8FC',
              fontFamily: "'Clash Display', sans-serif",
              letterSpacing: '-0.03em',
            }}
          >
            {displayText}
          </span>
          {sublabel && (
            <span
              className="leading-none mt-0.5 text-center font-medium"
              style={{
                fontSize: sublabelSize,
                color: 'rgba(255,255,255,0.40)',
                fontFamily: 'Inter, sans-serif',
                maxWidth: size * 0.65,
              }}
            >
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span
          className="text-[11px] font-semibold text-center uppercase tracking-wide"
          style={{ color: isTopTier ? '#B8F135' : 'rgba(255,255,255,0.50)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

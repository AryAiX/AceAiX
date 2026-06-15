interface StoryRingProps {
  image: string;
  name: string;
  isLive?: boolean;
  isVolt?: boolean;
  size?: number;
  onClick?: () => void;
}

export default function StoryRing({
  image,
  name,
  isLive = false,
  isVolt = false,
  size = 72,
  onClick,
}: StoryRingProps) {
  const ringColor = isVolt ? '#B8F135' : isLive ? '#EF5350' : '#2F80ED';
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;

  return (
    <button
      className="flex flex-col items-center gap-2 flex-shrink-0 select-none"
      onClick={onClick}
      style={{ transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * 0.1}
            style={{
              filter: `drop-shadow(0 0 4px ${ringColor}80)`,
              animation: isLive ? undefined : 'storyRing 3s linear infinite',
            }}
          />
        </svg>
        <div
          className="absolute rounded-full overflow-hidden border-2 border-[#0C1A2B]"
          style={{ inset: 4 }}
        >
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
        {isLive && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-coral text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            LIVE
          </div>
        )}
      </div>
      <span className="text-xs text-muted/80 max-w-[64px] truncate text-center">{name}</span>
    </button>
  );
}

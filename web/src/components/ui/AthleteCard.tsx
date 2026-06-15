import VerifiedBadge from './VerifiedBadge';

interface AthleteCardProps {
  name: string;
  position: string;
  club: string;
  nationality?: string;
  score: number;
  photoUrl: string;
  verified?: boolean;
  status?: 'cleared' | 'pending' | 'not_cleared';
  tags?: string[];
  onClick?: () => void;
}

const STATUS_CONFIG = {
  cleared:     { dot: '#1FB57A', text: '#1FB57A', label: 'Cleared'     },
  pending:     { dot: '#F5A623', text: '#F5A623', label: 'Pending'     },
  not_cleared: { dot: '#EF5350', text: '#EF5350', label: 'Not Cleared' },
};

export default function AthleteCard({
  name, position, club, nationality, score,
  photoUrl, verified = false, status = 'pending', tags = [], onClick,
}: AthleteCardProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div
      className="card overflow-hidden flex flex-col cursor-pointer"
      onClick={onClick}
      style={{ transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Photo */}
      <div className="relative overflow-hidden" style={{ background: '#0A1628' }}>
        <img src={photoUrl} alt={name} className="w-full h-48 object-cover" />
        {/* Cinematic gradient overlay */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0C1A2B]/70 to-transparent" />

        {/* AI Score chip — top left */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-azure rounded-lg px-2 py-1">
          <span className="text-white font-bold" style={{ fontSize: 11, fontFamily: "'Clash Display',sans-serif" }}>
            {score.toFixed(1)} AI
          </span>
        </div>

        {/* Verified badge — top right */}
        {verified && (
          <div className="absolute top-3 right-3">
            <VerifiedBadge size="sm" animated={false} />
          </div>
        )}

        {/* Status chip */}
        {status && (
          <div
            className="absolute flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
            style={{ top: verified ? '2.5rem' : '0.75rem', right: '0.75rem', color: statusConfig.text }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusConfig.dot }} />
            {statusConfig.label}
          </div>
        )}

        {/* Name + position over gradient */}
        <div className="absolute bottom-3 left-4 text-white">
          <h3 className="font-semibold leading-tight" style={{ fontSize: 16, fontFamily: "'Clash Display',sans-serif" }}>
            {name}
          </h3>
          <p className="text-white/70" style={{ fontSize: 12 }}>
            {position} · {club}{nationality ? ` · ${nationality}` : ''}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="rounded-full text-xs px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3">
          <button
            className="px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors hover:border-azure hover:text-azure"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.50)' }}
          >
            Follow
          </button>
          <a
            href="#"
            onClick={e => { e.preventDefault(); onClick?.(); }}
            className="text-xs font-semibold hover:underline"
            style={{ color: '#2F80ED' }}
          >
            View Profile →
          </a>
        </div>
      </div>
    </div>
  );
}

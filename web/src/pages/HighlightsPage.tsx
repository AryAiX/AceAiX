import PublicHeader from '../components/PublicHeader';
import { Play, Clock, Eye, ShieldCheck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPublicHighlights, type PublicHighlight } from '../api/portfolio';

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function HighlightsPage() {
  const { data: clips = [], isLoading } = useQuery({
    queryKey: ['public-highlights', 12],
    queryFn: () => listPublicHighlights(12),
  });

  const featured: PublicHighlight | undefined = clips[0];

  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />

      <div className="border-b border-slate-700/50 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 py-14 text-center">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">AI-Tagged Clips</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Athlete Highlights</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Every clip is AI-analyzed for key attributes. Tags, performance metrics, and verified provenance — all in one place.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card-hover p-0 overflow-hidden animate-pulse">
                <div className="w-full h-44 bg-navy-700" />
                <div className="p-4">
                  <div className="h-4 w-40 bg-navy-700 rounded mb-2" />
                  <div className="h-3 w-28 bg-navy-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">No public highlights available yet.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-blue-400" />
                  <p className="text-sm font-semibold text-white">Featured Clip</p>
                </div>
                <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
                  <img src={featured.thumbnail_url ?? featured.storage_url} alt={featured.title} className="w-full h-80 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/40 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link to="/auth/register" className="w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center transition-all group-hover:scale-110">
                      <Play size={24} className="text-white ml-1" fill="white" />
                    </Link>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex gap-2 mb-2">
                      {featured.ai_tags.map((t) => (
                        <span key={t} className="bg-blue-600/30 border border-blue-600/40 text-blue-300 text-xs px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{featured.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      {featured.athlete?.user?.full_name && <span>{featured.athlete.user.full_name}</span>}
                      {formatDuration(featured.duration_seconds) && <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(featured.duration_seconds)}</span>}
                      <span className="flex items-center gap-1"><Eye size={12} /> {formatViews(featured.views_count)} views</span>
                      {featured.athlete?.user?.is_verified && <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck size={12} /> Verified</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {clips.slice(1).map((clip) => (
                <Link to="/auth/register" key={clip.id} className="card-hover group p-0 overflow-hidden block">
                  <div className="relative">
                    <img src={clip.thumbnail_url ?? clip.storage_url} alt={clip.title} className="w-full h-44 object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-navy-900/40">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                        <Play size={16} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    {formatDuration(clip.duration_seconds) && (
                      <div className="absolute bottom-2 right-2 bg-navy-900/80 text-xs text-white px-2 py-0.5 rounded">{formatDuration(clip.duration_seconds)}</div>
                    )}
                    {clip.athlete?.user?.is_verified && (
                      <div className="absolute top-2 left-2 bg-emerald-500/20 border border-emerald-500/40 p-1 rounded">
                        <ShieldCheck size={10} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{clip.title}</h3>
                    <p className="text-xs text-slate-400 mb-3">{clip.athlete?.user?.full_name ?? 'Athlete'}{clip.athlete?.position ? ` · ${clip.athlete.position}` : ''}</p>
                    <div className="flex flex-wrap gap-1">
                      {clip.ai_tags.map((t) => (
                        <span key={t} className="badge badge-slate text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 text-center">
          <p className="text-slate-400 mb-4">Upload your own highlights and get instant AI analysis with automatic performance tagging.</p>
          <Link to="/auth/register" className="btn-primary">Upload Your Highlights</Link>
        </div>
      </div>
    </div>
  );
}

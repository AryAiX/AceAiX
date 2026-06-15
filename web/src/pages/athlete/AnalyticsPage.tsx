import { useQuery } from '@tanstack/react-query';
import { BarChart3, MapPin, Eye, Star, Loader2 } from 'lucide-react';
import { useMyAthlete } from '../../hooks/useAthlete';
import { weeklyViews, profileViewCount, listProfileViews } from '../../api/analytics';

interface TopLocation { city: string; country: string; pct: number }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export default function AthleteAnalyticsPage() {
  const { data: athlete } = useMyAthlete();
  const athleteId = athlete?.id;

  const { data: weekly = [], isLoading: weeklyLoading } = useQuery({
    queryKey: ['weekly-views', athleteId],
    queryFn: () => weeklyViews(athleteId!, 7),
    enabled: !!athleteId,
  });
  const { data: viewCount = 0 } = useQuery({
    queryKey: ['analytics-view-count', athleteId],
    queryFn: () => profileViewCount(athleteId!),
    enabled: !!athleteId,
  });
  const { data: recentViews = [] } = useQuery({
    queryKey: ['analytics-recent-views', athleteId],
    queryFn: () => listProfileViews(athleteId!, 6),
    enabled: !!athleteId,
  });

  const weekTotal = weekly.reduce((s, d) => s + d.count, 0);
  const verifiedViewers = recentViews.filter(v => v.viewer_verified).length;
  const uniqueViewers = new Set(recentViews.map(v => v.viewer_name ?? v.viewer_org ?? v.id)).size;
  const maxViews = Math.max(...weekly.map(d => d.count), 1);

  const topLocations = ((athlete?.analytics as { topLocations?: TopLocation[] } | undefined)?.topLocations ?? []);

  const stats = [
    { label: 'Profile Views (total)', value: viewCount.toLocaleString(), change: 'all time', positive: true },
    { label: 'Views This Week', value: String(weekTotal), change: 'last 7 days', positive: true },
    { label: 'Verified Viewers', value: String(verifiedViewers), change: 'recent', positive: true },
    { label: 'Unique Viewers', value: String(uniqueViewers), change: 'recent', positive: true },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="section-title">Analytics</h1>
        <p className="section-subtitle">How scouts and clubs are engaging with your profile</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-slate-400 mt-0.5">{s.label}</p>
            <p className={`text-xs mt-2 ${s.positive ? 'text-emerald-400' : 'text-slate-500'}`}>{s.change}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-blue-400" />
          <h2 className="text-base font-semibold text-white">Profile Views — Last 7 Days</h2>
        </div>
        {weeklyLoading ? (
          <div className="flex items-center justify-center h-36">
            <Loader2 size={20} className="text-blue-400 animate-spin" />
          </div>
        ) : weekTotal === 0 ? (
          <div className="flex items-center justify-center h-36 text-sm text-slate-500">No profile views in the last 7 days.</div>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {weekly.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <p className="text-xs text-slate-500">{d.count}</p>
                <div
                  className="w-full bg-blue-600/80 rounded-t-md transition-all"
                  style={{ height: `${(d.count / maxViews) * 100}px` }}
                />
                <p className="text-xs text-slate-500">{d.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Locations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <MapPin size={18} className="text-blue-400" />
          <h2 className="text-base font-semibold text-white">Scout Locations</h2>
          <span className="text-xs text-slate-500 ml-auto">Where scouts viewing you are based</span>
        </div>
        {topLocations.length === 0 ? (
          <p className="text-sm text-slate-500">No location data yet.</p>
        ) : (
          <div className="space-y-4">
            {topLocations.map((loc) => (
              <div key={loc.city}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-300">{loc.city}, {loc.country}</span>
                  <span className="text-xs font-bold text-white">{loc.pct}%</span>
                </div>
                <div className="h-2 bg-navy-900 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${loc.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent views */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Eye size={18} className="text-blue-400" />
          <h2 className="text-base font-semibold text-white">Recent Profile Views</h2>
        </div>
        {recentViews.length === 0 ? (
          <p className="text-sm text-slate-500">No profile views yet.</p>
        ) : (
          <div className="space-y-3">
            {recentViews.map((view) => (
              <div key={view.id} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Eye size={13} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {[view.viewer_role, view.viewer_org].filter(Boolean).join(' · ') || view.viewer_name || 'Scout'}
                  </p>
                </div>
                {view.viewer_verified && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                <p className="text-xs text-slate-500 flex-shrink-0">{timeAgo(view.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { BarChart3, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { listAthletes } from '../../api/athletes';
import { listWatchlists } from '../../api/watchlists';
import { listConversations } from '../../api/messaging';

interface AnStat { label: string; value: string; change: string; positive: boolean; }
interface TopAthlete { name: string; position: string; views: number; score: number; image: string; }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RecruiterAnalyticsPage() {
  const { user } = useAuth();

  const { data: allAthletes = [] } = useQuery({
    queryKey: ['all-athletes'],
    queryFn: () => listAthletes({}),
  });
  const { data: topRaw = [] } = useQuery({
    queryKey: ['top-athletes', 5],
    queryFn: () => listAthletes({ limit: 5 }),
  });
  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists', user?.id],
    queryFn: () => listWatchlists(user!.id),
    enabled: !!user,
  });
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => listConversations(user!.id),
    enabled: !!user,
  });

  const totalWatchlistAthletes = watchlists.reduce((s, w) => s + (w.athletes?.length ?? 0), 0);
  const avgScore = allAthletes.length
    ? allAthletes.reduce((s, a) => s + (a.visibility_score ?? 0), 0) / allAthletes.length / 10
    : 0;

  const STATS: AnStat[] = [
    { label: 'Athletes Available', value: allAthletes.length.toLocaleString(), change: 'indexed',                 positive: true },
    { label: 'Athletes Contacted', value: conversations.length.toString(),     change: 'conversations',           positive: true },
    { label: 'Watchlist Athletes', value: totalWatchlistAthletes.toString(),   change: `${watchlists.length} lists`, positive: true },
    { label: 'Avg AI Score',       value: avgScore.toFixed(1),                 change: 'all athletes',            positive: true },
  ];

  const TOP_ATHLETES: TopAthlete[] = topRaw.map((a) => ({
    name: a.user?.full_name ?? 'Unnamed athlete',
    position: a.position ?? a.position_primary ?? '—',
    views: a.followers_count ?? 0,
    score: Math.round((a.visibility_score ?? 0) / 10 * 10) / 10,
    image: a.user?.avatar_url ?? '',
  }));

  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toDateString();
    return {
      label: DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1],
      value: conversations.filter((c) => new Date(c.last_message_at ?? c.created_at).toDateString() === key).length,
    };
  });
  const maxActivity = Math.max(1, ...weeklyActivity.map((d) => d.value));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="section-title">Recruitment Analytics</h1>
        <p className="section-subtitle">Track your scouting activity and pipeline performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-slate-400 mt-0.5">{s.label}</p>
            <p className={`text-xs mt-2 flex items-center gap-1 ${s.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {s.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {s.change}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-blue-400" />
          <h2 className="text-base font-semibold text-white">Conversation Activity — Last 7 Days</h2>
        </div>
        <div className="flex items-end gap-3 h-32">
          {weeklyActivity.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500">{d.value}</p>
              <div className="w-full bg-blue-600/80 rounded-t-md" style={{ height: `${(d.value / maxActivity) * 100}px` }} />
              <p className="text-xs text-slate-500">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top viewed */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Star size={18} className="text-amber-400" />
          <h2 className="text-base font-semibold text-white">Most Viewed Athletes</h2>
        </div>
        <div className="space-y-3">
          {TOP_ATHLETES.map((a, i) => (
            <div key={a.name} className="flex items-center gap-4 p-3 bg-navy-800 rounded-xl">
              <span className="text-sm font-bold text-slate-500 w-5">#{i + 1}</span>
              <img src={a.image} alt={a.name} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{a.name}</p>
                <p className="text-xs text-slate-400">{a.position}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{a.score}</p>
                <p className="text-xs text-slate-500">AI Score</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-400">{a.views}</p>
                <p className="text-xs text-slate-500">followers</p>
              </div>
            </div>
          ))}
          {TOP_ATHLETES.length === 0 && (
            <p className="text-slate-500 text-sm py-6 text-center">No athletes yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

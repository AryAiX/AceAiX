import { useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import { ShieldCheck, Search, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAthletes } from '../api/athletes';

const SPORTS = ['All', 'Football', 'Athletics', 'Basketball', 'Swimming', 'Tennis', 'Boxing'];

function ageFromBirthDate(birth: string | null): number | null {
  if (!birth) return null;
  const diff = Date.now() - new Date(birth).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function AthletesPage() {
  const [sport, setSport] = useState('All');
  const [query, setQuery] = useState('');

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['athletes', { sport, q: query }],
    queryFn: () => listAthletes({ sport, q: query }),
  });

  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />

      {/* Hero */}
      <div className="border-b border-slate-700/50 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Verified Talent</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Browse Top Athletes</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Explore verified professional and semi-professional athletes across the MENA region. Every profile backed by AI scoring and certified medical records.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search athletes by name..."
              className="input-field pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sport === s ? 'bg-blue-600 text-white' : 'bg-navy-700 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-6">{athletes.length} athletes</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card-hover animate-pulse">
                <div className="h-44 bg-navy-700 rounded-lg mb-4" />
                <div className="h-4 w-32 bg-navy-700 rounded mb-2" />
                <div className="h-3 w-24 bg-navy-700 rounded mb-4" />
                <div className="h-9 bg-navy-700 rounded" />
              </div>
            ))}
          </div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">No athletes found. Try a different sport or search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {athletes.map((athlete) => {
              const name = athlete.user?.full_name ?? 'Athlete';
              const age = ageFromBirthDate(athlete.birth_date);
              const score = +(athlete.visibility_score / 10).toFixed(1);
              return (
                <div key={athlete.id} className="card-hover group">
                  <div className="relative mb-4">
                    <img src={athlete.user?.avatar_url ?? undefined} alt={name} className="w-full h-44 object-cover rounded-lg" />
                    <div className="absolute top-2 right-2 bg-navy-900/80 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-white">{score}</span>
                    </div>
                    {athlete.user?.is_verified && (
                      <div className="absolute top-2 left-2 bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 rounded-lg flex items-center gap-1">
                        <ShieldCheck size={10} className="text-emerald-400" />
                        <span className="text-xs text-emerald-400 font-medium">Verified</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{name}</h3>
                  <p className="text-sm text-slate-400 mb-1">{athlete.position ?? athlete.position_primary} · {athlete.sport}</p>
                  <p className="text-xs text-slate-500 mb-4">{athlete.current_club} · {athlete.nationality}{age != null ? ` · Age ${age}` : ''}</p>
                  <Link to={`/athletes/${athlete.id}`} className="btn-primary w-full justify-center text-sm">
                    View Profile
                    <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-slate-400 mb-4">Join AceAiX to unlock full profiles, contact athletes, and use AI-powered discovery.</p>
          <Link to="/auth/register" className="btn-primary">Get Started Free</Link>
        </div>
      </div>
    </div>
  );
}

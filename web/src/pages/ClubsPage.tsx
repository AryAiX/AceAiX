import PublicHeader from '../components/PublicHeader';
import { ShieldCheck, Users, Trophy, Globe, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listOrganizations } from '../api/organizations';

export default function ClubsPage() {
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['organizations', { type: 'club' }],
    queryFn: () => listOrganizations({ type: 'club' }),
  });

  const countries = new Set(clubs.map((c) => c.country).filter(Boolean));
  const verifiedCount = clubs.filter((c) => c.is_verified).length;
  const totalFollowers = clubs.reduce((sum, c) => sum + (c.followers_count ?? 0), 0);
  const stats = [
    { value: String(clubs.length), label: 'Clubs Registered' },
    { value: String(countries.size), label: 'Countries' },
    { value: totalFollowers.toLocaleString(), label: 'Total Followers' },
    { value: String(verifiedCount), label: 'Verified Clubs' },
  ];

  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />

      <div className="border-b border-slate-700/50 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Club Network</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Clubs & Organizations</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Connect with top football clubs, federations, and academies across the Middle East and North Africa — all verified on the AceAiX platform.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card-hover overflow-hidden p-0 animate-pulse">
                <div className="w-full h-40 bg-navy-700" />
                <div className="p-5">
                  <div className="h-4 w-32 bg-navy-700 rounded mb-3" />
                  <div className="h-3 w-24 bg-navy-700 rounded mb-4" />
                  <div className="h-9 bg-navy-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16 mb-12">
            <p className="text-slate-400">No clubs registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {clubs.map((club) => (
              <div key={club.id} className="card-hover group overflow-hidden p-0">
                <img src={club.cover_url ?? club.logo_url ?? undefined} alt={club.name} className="w-full h-40 object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-white">{club.name}</h3>
                    {club.is_verified && <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-sm text-slate-400 mb-1">{club.league}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                    <Globe size={11} />
                    <span>{club.country}</span>
                    {club.founded_year && (
                      <>
                        <span className="mx-1">·</span>
                        <span>Est. {club.founded_year}</span>
                      </>
                    )}
                    <span className="mx-1">·</span>
                    <Users size={11} />
                    <span>{(club.followers_count ?? 0).toLocaleString()} followers</span>
                  </div>
                  <Link to={`/clubs/${club.id}`} className="btn-secondary w-full justify-center text-sm">
                    View Club
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card text-center py-12">
          <Trophy size={40} className="text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Register Your Club</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">Join AceAiX to discover verified talent, manage recruitment pipelines, and connect with athletes across the region. Free for clubs to get started.</p>
          <Link to="/auth/register" className="btn-primary">Register Your Club</Link>
        </div>
      </div>
    </div>
  );
}

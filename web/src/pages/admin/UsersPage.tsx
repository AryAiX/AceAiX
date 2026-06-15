import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, MoreVertical, Clock } from 'lucide-react';
import { listUsers } from '../../api/admin';

const ROLE_BADGE: Record<string, string> = {
  athlete: 'badge-blue',
  scout: 'badge-amber',
  club: 'badge-green',
  medical_partner: 'badge-green',
  admin: 'badge-rose',
};

const TIER_BADGE: Record<string, string> = {
  free: 'badge-slate',
  pro: 'badge-blue',
  elite: 'badge-amber',
  enterprise: 'badge-green',
};

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', role, query],
    queryFn: () => listUsers({ role, q: query || undefined }),
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="section-title">User Management</h1>
        <p className="section-subtitle">Browse, search, and manage all platform users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." className="input-field pl-8 text-sm" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field text-sm sm:w-48">
          <option>All</option>
          <option value="athlete">Athletes</option>
          <option value="scout">Scouts</option>
          <option value="club">Clubs</option>
          <option value="medical_partner">Medical Partners</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">User</th>
              <th className="table-header hidden md:table-cell">Role</th>
              <th className="table-header hidden lg:table-cell">Joined</th>
              <th className="table-header">Tier</th>
              <th className="table-header">Verified</th>
              <th className="table-header w-10"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-700/30 hover:bg-navy-800/50 transition-colors">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {(user.full_name ?? '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.full_name ?? 'Unnamed user'}</p>
                      <p className="text-xs text-slate-500">{[user.city, user.country].filter(Boolean).join(', ') || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell hidden md:table-cell">
                  <span className={`badge ${ROLE_BADGE[user.role] ?? 'badge-slate'} text-xs capitalize`}>{user.role.replace('_', ' ')}</span>
                </td>
                <td className="table-cell hidden lg:table-cell text-xs text-slate-400">{formatDate(user.created_at)}</td>
                <td className="table-cell">
                  <span className={`badge text-xs capitalize ${TIER_BADGE[user.subscription_tier] ?? 'badge-slate'}`}>{user.subscription_tier}</span>
                </td>
                <td className="table-cell">
                  {user.is_verified
                    ? <ShieldCheck size={15} className="text-emerald-400" />
                    : <Clock size={15} className="text-slate-500" />}
                </td>
                <td className="table-cell">
                  <button className="text-slate-400 hover:text-white transition-colors">
                    <MoreVertical size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !users.length && (
              <tr><td colSpan={6} className="table-cell text-center text-sm text-slate-500 py-8">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">{isLoading ? 'Loading…' : `${users.length} users shown`}</p>
    </div>
  );
}

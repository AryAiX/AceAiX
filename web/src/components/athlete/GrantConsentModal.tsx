import { useState } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { searchUsers } from '../../api/network';
import { grantConsent } from '../../api/medical';
import type { UserProfile } from '../../types';

export default function GrantConsentModal({ athleteId, currentUserId, onClose, onGranted, alreadyGrantedIds = [] }: {
  athleteId: string; currentUserId: string; onClose: () => void; onGranted: () => void; alreadyGrantedIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const found = await searchUsers(q.trim(), currentUserId, 8, ['medical_partner', 'coach', 'club', 'guardian']);
      setResults(found.filter(u => !alreadyGrantedIds.includes(u.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleGrant(userId: string) {
    setGranting(userId);
    setError('');
    try {
      await grantConsent(athleteId, userId);
      onGranted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to grant access.');
      setGranting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,26,43,0.85)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease both' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: '#16273B', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(47,128,237,0.14)', border: '1px solid rgba(47,128,237,0.25)' }}>
              <UserPlus size={14} className="text-azure" />
            </div>
            <h3 className="text-sm font-bold text-white">Grant Medical Access</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/08 transition-colors"><X size={13} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={query} onChange={e => runSearch(e.target.value)} className="input-field pl-9" placeholder="Search by name…" autoFocus />
          </div>
          {searching && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-azure" /></div>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-white/30 text-center py-3">No matches found.</p>
          )}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {results.map(u => (
              <button key={u.id} onClick={() => handleGrant(u.id)} disabled={granting === u.id}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-white/05 disabled:opacity-50">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0 overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : (u.full_name?.[0] ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{u.full_name ?? 'Unknown'}</p>
                  <p className="text-[10px] text-white/35 capitalize">{u.role}</p>
                </div>
                {granting === u.id ? <Loader2 size={14} className="animate-spin text-azure" /> : <UserPlus size={14} className="text-azure/60" />}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-coral">{error}</p>}
        </div>
      </div>
    </div>
  );
}

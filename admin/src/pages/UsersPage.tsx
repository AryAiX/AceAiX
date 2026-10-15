import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { date, label, timeAgo } from '../lib/format';
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, PersonCell, Tabs } from '../components/ui';

const ROLES = ['all', 'athlete', 'coach', 'club', 'scout', 'sponsor', 'guardian', 'federation', 'medical_partner', 'admin', 'super_admin'];

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const role = params.get('role') ?? 'all';
  const query = params.get('q') ?? '';
  const [q, setQ] = useState(query);
  const [page, setPage] = useState(0);
  const nav = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', query, role, status, page],
    queryFn: () => api.users(query, role, status, page * 50),
  });

  const set = (k: string, v: string) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p); setPage(0); };

  return (
    <>
      <PageHeader title="Users" subtitle="Find any account, then open it to warn, suspend, ban, verify or change its role." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }} className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, country or user id" className="input w-72 pl-8" />
        </form>
        <select value={role} onChange={(e) => set('role', e.target.value)} className="input">
          {ROLES.map((r) => <option key={r} value={r}>{r === 'all' ? 'All roles' : label(r)}</option>)}
        </select>
        <Tabs value={status} onChange={(v) => set('status', v)} items={[
          { value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' },
          { value: 'unverified', label: 'Unverified' }, { value: 'minors', label: 'Minors' }, { value: 'reported', label: 'Reported' },
        ]} />
      </div>

      {error && <ErrorBox error={error} />}
      <Card className="overflow-x-auto">
        {isLoading ? <Loading /> : !data?.rows.length ? <Empty title="No users match" /> : (
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className="th">User</th><th className="th">Email</th><th className="th">Location</th><th className="th">Status</th><th className="th">Reports</th><th className="th">Joined</th><th className="th">Last active</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((u) => (
                <tr key={u.id} onClick={() => nav(`/users/${u.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="td"><PersonCell person={{ ...u }} link={false} /></td>
                  <td className="td text-slate-600">{u.email ?? '—'}</td>
                  <td className="td text-slate-600">{[u.city, u.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {u.is_suspended ? <Badge color="red">{u.suspended_until ? `Suspended to ${date(u.suspended_until)}` : 'Banned'}</Badge> : <Badge color="green">Active</Badge>}
                      {u.warning_count > 0 && <Badge color="amber">{u.warning_count} warnings</Badge>}
                      {u.is_minor && !u.is_discoverable && <Badge color="slate">Hidden</Badge>}
                    </div>
                  </td>
                  <td className="td">{u.open_reports > 0 ? <Badge color="red">{u.open_reports} open</Badge> : <span className="text-slate-400">{u.reports_against || '—'}</span>}</td>
                  <td className="td text-slate-600">{date(u.created_at)}</td>
                  <td className="td text-slate-600">{timeAgo(u.last_active_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {data && data.total > 50 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-slate-500">
          {page * 50 + 1}–{Math.min(data.total, (page + 1) * 50)} of {data.total}
          <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button size="sm" disabled={(page + 1) * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, dateTime, label, REASON_LABEL, timeAgo } from '../lib/format';
import {
  ActionDialog, Avatar, Badge, Button, Card, Empty, ErrorBox, Field, Loading, MediaStrip, PersonCell, StatusBadge,
  type DialogSpec,
} from '../components/ui';

const ASSIGNABLE_ROLES = ['athlete', 'coach', 'club', 'scout', 'sponsor', 'guardian', 'federation', 'medical_partner', 'org_admin', 'admin'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

export default function UserDetailPage() {
  const { id = '' } = useParams();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [role, setRole] = useState('');
  const { data: u, isLoading, error } = useQuery({ queryKey: ['user', id], queryFn: () => api.user(id) });
  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <Loading />;
  if (error || !u) return <ErrorBox error={error ?? 'Not found'} />;
  const p = u.profile;
  const self = me?.id === p.id;

  return (
    <>
      <Link to="/users" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink"><ArrowLeft className="h-4 w-4" /> Users</Link>

      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar person={p} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-ink">{p.full_name ?? 'Unnamed'}</h1>
              {p.is_verified && <BadgeCheck className="h-5 w-5 text-azure" />}
              <Badge color="blue">{label(p.role)}</Badge>
              {p.is_minor && <Badge color="orange">Minor · {label(p.age_band)}</Badge>}
              {p.is_suspended && <Badge color="red">{p.suspended_until ? `Suspended until ${date(p.suspended_until)}` : 'Banned'}</Badge>}
              {p.warning_count > 0 && <Badge color="amber">{p.warning_count} warnings</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{u.email ?? 'no email'}{u.phone ? ` · ${u.phone}` : ''} · joined {date(p.created_at)} · last active {timeAgo(p.last_active_at)}</p>
            {p.bio && <p className="mt-2 max-w-2xl text-sm text-slate-700">{p.bio}</p>}
            {p.is_suspended && (
              <p className="mt-2 text-sm text-red-700">Reason: {p.suspended_reason ?? '—'} {u.suspended_by && <>· by {u.suspended_by.full_name} {timeAgo(p.suspended_at)}</>}</p>
            )}
          </div>
          {!self && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setDialog({
                title: 'Send a warning', confirm: 'Send warning', reasonLabel: 'Message to the user',
                reasonPlaceholder: 'Explain which guideline was broken',
                onConfirm: async (r) => { await api.warnUser(p.id, r); refresh(); },
              })}>Warn</Button>
              {p.is_verified ? (
                <Button size="sm" onClick={() => setDialog({
                  title: 'Remove verified badge', confirm: 'Unverify', tone: 'danger', reason: 'required', reasonLabel: 'Reason (audit log)',
                  onConfirm: async (r) => { await api.setVerified(p.id, false, r); refresh(); },
                })}>Unverify</Button>
              ) : (
                <Button size="sm" tone="success" onClick={() => setDialog({
                  title: 'Verify this account', confirm: 'Verify', tone: 'success', reason: 'optional', reasonLabel: 'Note (audit log)',
                  onConfirm: async (r) => { await api.setVerified(p.id, true, r); refresh(); },
                })}>Verify</Button>
              )}
              {p.is_suspended ? (
                <Button size="sm" tone="success" onClick={() => setDialog({
                  title: 'Reinstate account', confirm: 'Reinstate', tone: 'success', reason: 'optional', reasonLabel: 'Message to the user',
                  onConfirm: async (r) => { await api.setSuspension(p.id, false, r); refresh(); },
                })}>Reinstate</Button>
              ) : (
                <Button size="sm" tone="danger" onClick={() => setDialog({
                  title: `Suspend ${p.full_name ?? 'account'}`, confirm: 'Suspend', tone: 'danger', days: true,
                  body: 'The profile and everything it posted disappear for other users, and the account is signed out.',
                  onConfirm: async (r, days) => { await api.setSuspension(p.id, true, r, days); refresh(); },
                })}>Suspend / ban</Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Activity">
            <dl className="grid grid-cols-3 gap-4 sm:grid-cols-5">
              {Object.entries(u.stats).map(([k, v]) => <Field key={k} label={label(k)}>{v}</Field>)}
            </dl>
          </Section>

          {(u.athlete || u.coach || u.sponsor) && (
            <Section title="Profile">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {u.athlete && (<>
                  <Field label="Sport">{u.athlete.sport ?? '—'}</Field>
                  <Field label="Position">{u.athlete.position ?? '—'}</Field>
                  <Field label="Level">{label(u.athlete.level)}</Field>
                  <Field label="Club">{u.athlete.club ?? '—'}</Field>
                  <Field label="Talent Score">{u.athlete.talent_score ?? '—'} {u.athlete.tier && <span className="text-slate-400">({u.athlete.tier})</span>}</Field>
                  <Field label="Date of birth">{u.date_of_birth ? date(u.date_of_birth) : '—'}</Field>
                </>)}
                {u.coach && (<>
                  <Field label="Specialty">{u.coach.specialty ?? '—'}</Field>
                  <Field label="Experience">{u.coach.years_experience ?? '—'} years</Field>
                  <Field label="Club">{u.coach.current_club ?? '—'}</Field>
                </>)}
                {u.sponsor && (<>
                  <Field label="Company">{u.sponsor.company_name ?? '—'}</Field>
                  <Field label="Industry">{u.sponsor.industry ?? '—'}</Field>
                  <Field label="Website">{u.sponsor.website ?? '—'}</Field>
                </>)}
              </dl>
            </Section>
          )}

          <Section title="Recent posts">
            {!u.recent_posts.length ? <Empty title="No posts" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {u.recent_posts.map((post) => (
                  <div key={post.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500"><span>{timeAgo(post.created_at)}</span><StatusBadge status={post.state} /></div>
                    {post.text && <p className="line-clamp-3 text-sm">{post.text}</p>}
                    <div className="mt-2"><MediaStrip media={post.media} /></div>
                  </div>
                ))}
              </div>
            )}
            <Link to={`/content?kind=post`} className="mt-3 inline-block text-xs text-azure hover:underline">Moderate in Content →</Link>
          </Section>

          <Section title="Reports against this account">
            {!u.reports_against.length ? <Empty title="None" /> : (
              <ul className="divide-y divide-slate-100">
                {u.reports_against.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <Badge color={r.reason === 'child_safety' ? 'red' : 'orange'}>{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                    <span className="text-slate-600">{label(r.entity_type)}</span>
                    <StatusBadge status={r.status} />
                    {r.action_taken && <span className="text-xs text-slate-500">→ {label(r.action_taken)}</span>}
                    <span className="ml-auto text-xs text-slate-400">{timeAgo(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          {p.is_minor && (
            <Section title="Guardian consent">
              {!u.guardian_consents.length ? (
                <p className="text-sm text-red-600">No guardian consent on file. The profile stays hidden from discovery.</p>
              ) : u.guardian_consents.map((g) => (
                <div key={g.id} className="mb-3 rounded-lg border border-slate-200 p-3 text-sm last:mb-0">
                  <div className="flex items-center justify-between"><b>{g.guardian_name ?? g.guardian?.full_name ?? 'Guardian'}</b><StatusBadge status={g.status} /></div>
                  <div className="text-xs text-slate-500">{label(g.relationship)} · {g.guardian_email ?? '—'}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(['discovery', 'messaging', 'media', 'assessments', 'sponsorship', 'bookings'] as const).map((s) => (
                      <Badge key={s} color={g[`allow_${s}`] ? 'green' : 'slate'}>{label(s)}</Badge>
                    ))}
                  </div>
                  {g.granted_at && <div className="mt-2 text-xs text-slate-400">Granted {dateTime(g.granted_at)}</div>}
                </div>
              ))}
            </Section>
          )}

          {u.wards.length > 0 && (
            <Section title="Guardian of">
              <div className="space-y-2">{u.wards.map((w) => <PersonCell key={w.id} person={w} />)}</div>
            </Section>
          )}

          <Section title="Verification">
            {!u.verification_requests.length ? <p className="text-sm text-slate-500">Never requested.</p> : (
              <ul className="space-y-2 text-sm">
                {u.verification_requests.map((v) => (
                  <li key={v.id} className="flex items-center gap-2"><StatusBadge status={v.status} /><span>{label(v.type)}</span><span className="ml-auto text-xs text-slate-400">{date(v.created_at)}</span></li>
                ))}
              </ul>
            )}
          </Section>

          {me?.is_super_admin && !self && p.role !== 'super_admin' && (
            <Section title="Role (super admin)">
              <div className="flex gap-2">
                <select value={role || p.role} onChange={(e) => setRole(e.target.value)} className="input flex-1">
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
                </select>
                <Button size="sm" disabled={!role || role === p.role} onClick={() => setDialog({
                  title: `Change role to ${label(role)}`, confirm: 'Change role', reason: 'none',
                  body: role === 'admin' ? 'This person will be able to moderate every account and read reported messages.' : undefined,
                  onConfirm: async () => { await api.setRole(p.id, role); setRole(''); refresh(); },
                })}>Save</Button>
              </div>
            </Section>
          )}

          <Section title="Admin history">
            {!u.history.length ? <p className="text-sm text-slate-500">No admin actions yet.</p> : (
              <ul className="space-y-2.5 text-sm">
                {u.history.map((h) => (
                  <li key={h.id}>
                    <div className="font-medium">{label(h.action.replace('.', ' '))}</div>
                    <div className="text-xs text-slate-500">{h.by?.full_name ?? 'system'} · {dateTime(h.created_at)}</div>
                    {h.note && <div className="text-xs text-slate-600">“{h.note}”</div>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { label, REASON_LABEL } from '../lib/format';
import { Card, ErrorBox, Loading, PageHeader, cx } from '../components/ui';

function Tile({ label: l, value, hint, to, alert }: { label: string; value: number; hint?: string; to?: string; alert?: boolean }) {
  const body = (
    <Card className={cx('h-full p-4 transition', to && 'hover:border-slate-300', alert && value > 0 && 'border-red-200 bg-red-50/40')}>
      <div className="text-xs font-medium text-slate-500">{l}</div>
      <div className={cx('mt-1 text-2xl font-semibold tabular-nums', alert && value > 0 ? 'text-red-600' : 'text-ink')}>{value.toLocaleString()}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  const { data: d, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  if (isLoading) return <Loading />;
  if (error || !d) return <ErrorBox error={error ?? 'No data'} />;

  const max = Math.max(1, ...d.signups_by_day.map((x) => x.count));
  const delta = d.signups_7d - d.signups_prev_7d;
  const roles = Object.entries(d.roles).filter(([r]) => r !== 'admin' && r !== 'super_admin').sort((a, b) => b[1] - a[1]);
  const reasons = Object.entries(d.reports_by_reason).sort((a, b) => b[1] - a[1]);
  const roleMax = Math.max(1, ...roles.map(([, n]) => n));

  const todo = [
    { n: d.urgent_reports, text: 'urgent reports (child safety / minors)', to: '/reports?urgent=1', red: true },
    { n: d.open_reports - d.urgent_reports, text: 'other open reports', to: '/reports' },
    { n: d.content_under_review, text: 'posts hidden and waiting for review', to: '/content?state=under_review' },
    { n: d.pending_verifications, text: 'verification requests', to: '/approvals' },
    { n: d.unverified_pros, text: 'unverified coaches / clubs / sponsors', to: '/approvals' },
    { n: d.minors_without_consent, text: 'minors without guardian consent', to: '/youth-safety?filter=no_consent' },
  ].filter((t) => t.n > 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What needs attention, and how the network is growing." />

      <Card className="mb-6 p-5">
        <div className="text-sm font-semibold text-ink">Needs action</div>
        {todo.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing waiting. All queues are clear.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {todo.map((t) => (
              <li key={t.text}>
                <Link to={t.to} className="flex items-center gap-3 py-2.5 text-sm hover:text-ace">
                  <span className={cx('w-10 rounded-md py-0.5 text-center font-semibold tabular-nums', t.red ? 'bg-red-600 text-white' : 'bg-ace-soft text-ace')}>{t.n}</span>
                  <span className="flex-1">{t.text}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Users" value={d.users_total} hint={`${d.active_7d} active this week`} to="/users" />
        <Tile label="Sign-ups, 7 days" value={d.signups_7d} hint={`${delta >= 0 ? '+' : ''}${delta} vs previous week`} />
        <Tile label="Minors" value={d.minors} hint={`${d.pending_consents} consents pending`} to="/youth-safety" />
        <Tile label="Suspended" value={d.suspended} to="/users?status=suspended" />
        <Tile label="Open reports" value={d.open_reports} to="/reports" alert />
        <Tile label="Posts, 7 days" value={d.posts_7d} hint={`${d.stories_live} stories live`} to="/content" />
        <Tile label="Sponsor offers pending" value={d.deals_pending} to="/sponsorship" />
        <Tile label="Upcoming coach sessions" value={d.bookings_upcoming} to="/bookings" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-ink">Sign-ups, last 30 days</div>
          <div className="mt-4 flex h-40 items-end gap-1">
            {d.signups_by_day.map((x) => (
              <div key={x.day} className="group relative flex-1">
                <div className="w-full rounded-t bg-ace/80 group-hover:bg-ace" style={{ height: `${(x.count / max) * 150 + (x.count ? 4 : 1)}px` }} />
                <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {x.day.slice(5)} · {x.count}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>{d.signups_by_day[0]?.day.slice(5)}</span><span>today</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-ink">Users by role</div>
          <div className="mt-4 space-y-2.5">
            {roles.map(([r, n]) => (
              <div key={r}>
                <div className="flex justify-between text-xs"><span className="text-slate-600">{label(r)}</span><span className="tabular-nums text-ink">{n}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-azure" style={{ width: `${(n / roleMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="text-sm font-semibold text-ink">Reports by reason, last 30 days</div>
        {reasons.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No reports.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {reasons.map(([r, n]) => (
              <span key={r} className={cx('rounded-lg px-3 py-1.5 text-sm', r === 'child_safety' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700')}>
                {REASON_LABEL[r] ?? r} <b className="ml-1 tabular-nums">{n}</b>
              </span>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

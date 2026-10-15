import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { label, timeAgo } from '../lib/format';
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader, PersonCell, StatusBadge, Tabs } from '../components/ui';

const SCOPES = ['discovery', 'messaging', 'media', 'assessments', 'sponsorship', 'bookings'] as const;

export default function YouthSafetyPage() {
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  const [tab, setTab] = useState<'minors' | 'contacts'>('minors');
  const minors = useQuery({ queryKey: ['minors', filter], queryFn: () => api.minors(filter), enabled: tab === 'minors' });
  const contacts = useQuery({ queryKey: ['minor-contacts'], queryFn: api.minorContacts, enabled: tab === 'contacts' });

  return (
    <>
      <PageHeader
        title="Youth safety"
        subtitle="Every under-18 account, the guardian consent behind it, and which adults are messaging minors."
        actions={<Tabs value={tab} onChange={setTab} items={[{ value: 'minors', label: 'Minors & consent' }, { value: 'contacts', label: 'Adult ↔ minor messages' }]} />}
      />

      {tab === 'minors' && (
        <>
          <div className="mb-4">
            <Tabs value={filter} onChange={(v) => setParams({ filter: v })} items={[
              { value: 'all', label: 'All minors' }, { value: 'no_consent', label: 'No consent' },
              { value: 'pending', label: 'Pending' }, { value: 'granted', label: 'Granted' }, { value: 'revoked', label: 'Revoked' },
            ]} />
          </div>
          {minors.error && <ErrorBox error={minors.error} />}
          <Card className="overflow-x-auto">
            {minors.isLoading ? <Loading /> : !minors.data?.length ? <Empty title="No minors in this view" /> : (
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr><th className="th">Minor</th><th className="th">Consent</th><th className="th">Guardian</th><th className="th">Scopes allowed</th><th className="th">Exposure</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {minors.data.map((m) => (
                    <tr key={m.user.id}>
                      <td className="td"><PersonCell person={m.user} sub={`${label(m.user.age_band)} · joined ${timeAgo(m.created_at)}`} /></td>
                      <td className="td">
                        <StatusBadge status={m.consent_state} />
                        {!m.is_discoverable && <div className="mt-1 text-xs text-slate-500">Hidden from discovery</div>}
                      </td>
                      <td className="td text-sm">
                        {m.consent ? (
                          <>
                            <div>{m.consent.guardian_name ?? m.consent.guardian?.full_name ?? '—'}</div>
                            <div className="text-xs text-slate-500">{m.consent.guardian_email} · {label(m.consent.relationship)}</div>
                            {m.consent_state === 'pending' && <div className="text-xs text-slate-400">{m.consent.delivery_count ?? 0} e-mails sent</div>}
                          </>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="td">
                        {m.consent?.status === 'granted' ? (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {SCOPES.map((s) => <Badge key={s} color={m.consent?.[`allow_${s}`] ? 'green' : 'slate'}>{label(s)}</Badge>)}
                          </div>
                        ) : <span className="text-xs text-slate-400">None</span>}
                      </td>
                      <td className="td text-xs text-slate-600">
                        <div>{m.adult_conversations} chats with adults</div>
                        <div>{m.deals} sponsor deals · {m.bookings} bookings</div>
                        {m.open_reports > 0 && <Badge color="red">{m.open_reports} open reports</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {tab === 'contacts' && (
        <>
          <p className="mb-4 max-w-3xl text-sm text-slate-600">
            Conversations between an adult and a minor. Only counts and timing are shown here; message text is visible
            only when someone reports a message. Look for unverified adults, one-sided volume, or a guardian who is not linked.
          </p>
          {contacts.error && <ErrorBox error={contacts.error} />}
          <Card className="overflow-x-auto">
            {contacts.isLoading ? <Loading /> : !contacts.data?.length ? <Empty title="No adult ↔ minor conversations" /> : (
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr><th className="th">Adult</th><th className="th">Minor</th><th className="th">Messages</th><th className="th">Signals</th><th className="th">Last message</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.data.map((c) => {
                    const oneSided = c.messages_from_adult >= 5 && c.messages_from_minor <= c.messages_from_adult / 4;
                    return (
                      <tr key={c.conversation_id} className={c.reports > 0 || (!c.adult_verified && !c.is_guardian) ? 'bg-red-50/40' : undefined}>
                        <td className="td"><PersonCell person={c.adult} /></td>
                        <td className="td"><PersonCell person={c.minor} /></td>
                        <td className="td text-sm">{c.messages} <span className="text-xs text-slate-500">({c.messages_from_adult} adult / {c.messages_from_minor} minor)</span></td>
                        <td className="td">
                          <div className="flex flex-wrap gap-1">
                            {c.is_guardian && <Badge color="green">Guardian</Badge>}
                            {!c.adult_verified && !c.is_guardian && <Badge color="red">Adult unverified</Badge>}
                            {oneSided && <Badge color="amber">One-sided</Badge>}
                            {c.reports > 0 && <Badge color="red">{c.reports} reported</Badge>}
                          </div>
                        </td>
                        <td className="td text-sm text-slate-600">{timeAgo(c.last_message_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
          <p className="mt-3 text-xs text-slate-500">To act on an adult, open their account (<Link to="/users" className="text-azure">Users</Link>) and warn, suspend or ban.</p>
        </>
      )}
    </>
  );
}

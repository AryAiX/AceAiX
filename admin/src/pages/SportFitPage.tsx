import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, EyeOff, RotateCcw, Save } from 'lucide-react';
import { api, SF_DIMENSIONS, type SfDimension, type SportFitSport } from '../lib/api';
import { date, label } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, ErrorBox, Loading, PageHeader, Tabs, cx, type DialogSpec,
} from '../components/ui';

const SPORT_LABEL: Record<string, string> = {
  football: 'Football', basketball: 'Basketball', volleyball: 'Volleyball', handball: 'Handball',
  cricket: 'Cricket', padel: 'Padel', esports: 'Esports', tennis: 'Tennis', martialArts: 'Martial arts',
  chess: 'Chess', swimming: 'Swimming', athletics: 'Athletics', other: 'Other',
};
const DIM_LABEL: Record<string, string> = {
  drive: 'Drive', composure: 'Composure', focus: 'Focus', resilience: 'Bounce-back', boldness: 'Boldness',
  discipline: 'Routine', reading: 'Game reading', speed: 'Reactions', team: 'Team (0 solo → 100 team)',
};
const QUALITY_LABEL: Record<string, string> = {
  ok: 'Scored', too_fast: 'Too fast (< 45 s)', check_failed: 'Missed attention check', straight_line: 'Same answer everywhere',
};

function Stat({ label: l, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-slate-500">{l}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export default function SportFitPage() {
  const [tab, setTab] = useState<'usage' | 'matrix'>('usage');
  const { data, isLoading, error } = useQuery({ queryKey: ['sport-fit'], queryFn: api.sportFit });

  return (
    <>
      <PageHeader
        title="Sport Fit"
        subtitle="How the mindset questionnaire is used, and the sport matrix it is scored against."
        actions={<Tabs value={tab} onChange={setTab} items={[{ value: 'usage', label: 'Usage' }, { value: 'matrix', label: 'Sport matrix' }]} />}
      />
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Players' answers and results are private. This page shows totals and averages only, and any group smaller than five
          is shown as “fewer than 5”.
        </span>
      </div>
      {error && <ErrorBox error={error} />}
      {isLoading || !data ? <Loading /> : tab === 'usage' ? <Usage data={data} /> : <Matrix sports={data.sports} />}
    </>
  );
}

function Usage({ data }: { data: NonNullable<Awaited<ReturnType<typeof api.sportFit>>> }) {
  const unusable = data.submissions - (data.quality.ok ?? 0);
  const max = Math.max(1, ...data.by_day.map((d) => d.count));
  const topMax = Math.max(1, ...data.top_sports.map((t) => t.count ?? 0));
  const reviewed = data.sports.filter((s) => s.reviewed_by).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Players with a result" value={data.players} hint={`${data.players_minor} of them minors`} />
        <Stat label="Results, last 30 days" value={data.last_30d} />
        <Stat label="Used Game Intelligence too" value={data.with_game_intelligence} />
        <Stat label="Minors waiting for a parent" value={data.pending_consents} hint="Guardian has not ticked “Sport Fit”" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-ink">Results per day, last 30 days</div>
          <div className="mt-4 flex h-32 items-end gap-1">
            {data.by_day.map((x) => (
              <div key={x.day} className="group relative flex-1" title={`${x.day} · ${x.count}`}>
                <div className="w-full rounded-t bg-cyan-500/80 group-hover:bg-cyan-500" style={{ height: `${(x.count / max) * 120 + (x.count ? 4 : 1)}px` }} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-ink">Answer quality</div>
          <p className="mt-1 text-xs text-slate-500">{data.submissions} submissions · {unusable} not scored</p>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(QUALITY_LABEL).map(([k, l]) => (
              <li key={k} className="flex justify-between">
                <span className={k === 'ok' ? 'text-ink' : 'text-slate-600'}>{l}</span>
                <span className="tabular-nums">{data.quality[k] ?? 0}</span>
              </li>
            ))}
          </ul>
          {data.submissions >= 20 && unusable / data.submissions > 0.3 && (
            <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
              More than 30% of answers are not usable. The statements may be too long or unclear.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold text-ink">Most common best fit</div>
          {data.top_sports.length === 0 ? <p className="mt-2 text-sm text-slate-500">No results yet.</p> : (
            <div className="mt-4 space-y-2.5">
              {data.top_sports.map((t) => (
                <div key={t.sport}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700">{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    <span className="tabular-nums text-ink">{t.hidden ? 'fewer than 5' : t.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className={cx('h-1.5 rounded-full', t.hidden ? 'bg-slate-300' : 'bg-cyan-500')}
                         style={{ width: `${t.hidden ? 4 : ((t.count ?? 0) / topMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-ink">Average mindset by age group</div>
          {data.by_age_band.length === 0 ? <p className="mt-2 text-sm text-slate-500">No results yet.</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500">
                  <th className="py-1 pr-2 font-medium">Group</th>
                  {['drive', 'composure', 'focus', 'resilience', 'boldness', 'discipline', 'team'].map((d) => (
                    <th key={d} className="px-1 py-1 text-right font-medium">{DIM_LABEL[d].split(' ')[0]}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.by_age_band.map((b) => (
                    <tr key={b.band} className="border-t border-slate-100">
                      <td className="py-1.5 pr-2 text-slate-700">{label(b.band)} <span className="text-xs text-slate-400">({b.hidden ? '<5' : b.count})</span></td>
                      {['drive', 'composure', 'focus', 'resilience', 'boldness', 'discipline', 'team'].map((d) => (
                        <td key={d} className="px-1 py-1.5 text-right tabular-nums">{b.hidden ? '—' : b.dimensions?.[d] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-ink">Before launch</div>
          <Badge color={reviewed === data.sports.length ? 'green' : 'amber'}>{reviewed} of {data.sports.length} sports reviewed</Badge>
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>A sports psychologist reviews the 22 statements and their six translations.</li>
          <li>The same reviewer checks every row of the sport matrix and is recorded on it (Sport matrix tab).</li>
          <li>Pilot with 300+ players: consistency per dimension and test–retest after 4–6 weeks (docs/32 §6).</li>
        </ul>
      </Card>
    </div>
  );
}

function Matrix({ sports }: { sports: SportFitSport[] }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SportFitSport>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => { setDrafts(Object.fromEntries(sports.map((s) => [s.sport, s]))); }, [sports]);

  const dirty = (s: SportFitSport) => {
    const d = drafts[s.sport];
    return !!d && (JSON.stringify(d.weights) !== JSON.stringify(s.weights) || d.team_target !== s.team_target || d.active !== s.active);
  };
  const setWeight = (sport: string, dim: SfDimension, value: number) =>
    setDrafts((all) => ({ ...all, [sport]: { ...all[sport], weights: { ...all[sport].weights, [dim]: value } } }));

  const save = async (sport: string) => {
    const d = drafts[sport];
    setSaving(sport); setErr(null);
    try {
      await api.updateSportFitSport(sport, d.weights, d.team_target, d.active);
      await qc.invalidateQueries({ queryKey: ['sport-fit'] });
    } catch (e) { setErr(e); }
    setSaving(null);
  };

  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm text-slate-600">
        How much each sport asks of each dimension: 0 does not matter, 3 is central. Team target: 0 alone, 0.5 with a partner,
        1 a team. Fit = 25% team match + 75% weighted mindset. Changes apply to new results only; editing a row clears its
        review mark.
      </p>
      {err != null && <ErrorBox error={err} />}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th sticky left-0 z-10 bg-slate-50">Sport</th>
              {SF_DIMENSIONS.map((d) => <th key={d} className="th px-1 text-center normal-case tracking-normal">{DIM_LABEL[d]}</th>)}
              <th className="th text-center">Team target</th>
              <th className="th">Review</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sports.map((s) => {
              const d = drafts[s.sport] ?? s;
              return (
                <tr key={s.sport} className={cx(!d.active && 'opacity-50')}>
                  <td className="td sticky left-0 z-10 bg-white shadow-[1px_0_0_#e2e8f0]">
                    <div className="font-medium text-ink">{SPORT_LABEL[s.sport] ?? s.sport}</div>
                    <label className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <input type="checkbox" checked={d.active}
                        onChange={(e) => setDrafts((all) => ({ ...all, [s.sport]: { ...all[s.sport], active: e.target.checked } }))} />
                      Ranked
                    </label>
                  </td>
                  {SF_DIMENSIONS.map((dim) => (
                    <td key={dim} className="td px-1 text-center">
                      <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
                        {[0, 1, 2, 3].map((n) => (
                          <button key={n} onClick={() => setWeight(s.sport, dim, n)}
                            className={cx('h-7 w-5 text-xs tabular-nums',
                              d.weights[dim] === n ? 'bg-ink text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
                            aria-label={`${DIM_LABEL[dim]} ${n}`}>{n}</button>
                        ))}
                      </div>
                    </td>
                  ))}
                  <td className="td text-center">
                    <select value={String(d.team_target)} className="input h-8"
                      onChange={(e) => setDrafts((all) => ({ ...all, [s.sport]: { ...all[s.sport], team_target: Number(e.target.value) } }))}>
                      {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td className="td">
                    {s.reviewed_by ? (
                      <button onClick={() => setDialog({
                        title: `Clear the review on ${SPORT_LABEL[s.sport]}`, confirm: 'Clear', reason: 'none',
                        body: `Reviewed by ${s.reviewed_by}. Clear it if the row needs another look.`,
                        onConfirm: async () => { await api.reviewSportFitSport(s.sport, null); await qc.invalidateQueries({ queryKey: ['sport-fit'] }); },
                      })}>
                        <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-left text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200" title={s.reviewed_by}>
                          <BadgeCheck className="h-3 w-3 shrink-0" /><span className="truncate">{s.reviewed_by}</span>
                        </span>
                      </button>
                    ) : (
                      <Button size="sm" disabled={dirty(s)} onClick={() => setDialog({
                        title: `Mark ${SPORT_LABEL[s.sport]} reviewed`, confirm: 'Mark reviewed', tone: 'success',
                        reasonLabel: 'Reviewer', reasonPlaceholder: 'Name and role, e.g. Dr. A. Rahman, sports psychologist',
                        onConfirm: async (r) => { await api.reviewSportFitSport(s.sport, r); await qc.invalidateQueries({ queryKey: ['sport-fit'] }); },
                      })}>Mark reviewed</Button>
                    )}
                    <div className="mt-1 text-[11px] text-slate-400">Edited {date(s.updated_at)}</div>
                  </td>
                  <td className="td text-right">
                    {dirty(s) && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" tone="ghost" onClick={() => setDrafts((all) => ({ ...all, [s.sport]: s }))} title="Undo">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" tone="primary" busy={saving === s.sport} onClick={() => save(s.sport)}>
                          <Save className="h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

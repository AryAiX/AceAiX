import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Flag, Heart, MessageCircle, Search } from 'lucide-react';
import { api, type ContentItem } from '../lib/api';
import { label, timeAgo } from '../lib/format';
import {
  ActionDialog, Badge, Button, Card, Empty, ErrorBox, Loading, MediaStrip, PageHeader, PersonCell, StatusBadge, Tabs,
  type DialogSpec,
} from '../components/ui';

type Kind = 'post' | 'reel' | 'story' | 'clip' | 'comment';

export default function ContentPage() {
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') ?? 'post') as Kind;
  const state = params.get('state') ?? 'all';
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [minors, setMinors] = useState(false);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['content', kind, state, query, minors],
    queryFn: () => api.content(kind, state, query, minors),
  });

  const set = (k: string, v: string) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p); };
  const stateOptions =
    kind === 'post' || kind === 'reel'
      ? [{ value: 'all', label: 'All' }, { value: 'visible', label: 'Visible' }, { value: 'under_review', label: 'Under review' }, { value: 'removed', label: 'Removed' }]
      : kind === 'story'
        ? [{ value: 'all', label: 'All' }, { value: 'visible', label: 'Live' }]
        : [{ value: 'all', label: 'All' }, { value: 'visible', label: 'Visible' }, { value: 'hidden', label: 'Hidden' }];

  const moderate = (c: ContentItem, action: 'remove' | 'restore' | 'hide') => {
    const what = c.kind === 'clip' ? 'highlight clip' : c.kind;
    setDialog({
      title: action === 'remove' ? `Remove ${what}` : action === 'hide' ? `Hide ${what}` : `Restore ${what}`,
      confirm: label(action),
      tone: action === 'restore' ? 'success' : 'danger',
      reason: action === 'remove' ? 'required' : 'optional',
      body: action === 'remove'
        ? (c.kind === 'story' || c.kind === 'clip' ? 'This deletes it permanently. The author is notified with your reason.' : 'Taken down for everyone. The author is notified with your reason.')
        : action === 'hide' ? 'Hidden from everyone while you look into it.' : 'Visible again for everyone it was shared with.',
      onConfirm: async (reason) => {
        await api.moderateContent(c.kind, c.id, action, reason || undefined);
        qc.invalidateQueries();
      },
    });
  };

  return (
    <>
      <PageHeader title="Content" subtitle="Posts, reels, stories, profile highlight clips and comments, including what is hidden from users." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={kind} onChange={(v) => { const p = new URLSearchParams(); p.set('kind', v); setParams(p); }} items={[
          { value: 'post', label: 'Posts' }, { value: 'reel', label: 'Reels' }, { value: 'story', label: 'Stories' },
          { value: 'clip', label: 'Highlight clips' }, { value: 'comment', label: 'Comments' },
        ]} />
        <Tabs value={state} onChange={(v) => set('state', v)} items={stateOptions} />
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Text or author" className="input w-56 pl-8" />
          </div>
        </form>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={minors} onChange={(e) => setMinors(e.target.checked)} /> By minors only
        </label>
      </div>

      {error && <ErrorBox error={error} />}
      {isLoading ? <Loading /> : !data?.length ? <Card><Empty title="Nothing here" /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const removed = c.state === 'removed' || (c.kind !== 'post' && c.state === 'hidden');
            return (
              <Card key={c.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <PersonCell person={c.author} sub={`${timeAgo(c.created_at)}${c.audience ? ` · ${label(c.audience)}` : ''}`} />
                  <StatusBadge status={c.state} />
                </div>
                {c.text && <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-ink">{c.text}</p>}
                <div className="mt-3">
                  <MediaStrip
                    media={c.media}
                    bucket={c.kind === 'story' ? 'stories' : 'posts'}
                    single={c.media_url ?? c.image_url}
                    singleType={c.kind === 'clip' ? 'video' : c.media_type}
                    poster={c.thumbnail_url}
                    card={c.card}
                  />
                </div>
                {c.removed_reason && <p className="mt-2 text-xs text-red-600">Removed: {c.removed_reason}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  {c.like_count != null && <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{c.like_count}</span>}
                  {c.comment_count != null && <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{c.comment_count}</span>}
                  {c.view_count != null && <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{c.view_count}</span>}
                  {!!c.open_reports && <Badge color="red"><Flag className="h-3 w-3" />{c.open_reports} open reports</Badge>}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {c.kind === 'post' && c.state === 'visible' && <Button size="sm" onClick={() => moderate(c, 'hide')}>Hide for review</Button>}
                  {!removed && c.state !== 'expired' && <Button size="sm" tone="danger" onClick={() => moderate(c, 'remove')}>Remove</Button>}
                  {(removed || c.state === 'under_review') && c.kind !== 'story' && <Button size="sm" tone="success" onClick={() => moderate(c, 'restore')}>Restore</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ActionDialog spec={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

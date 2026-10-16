import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Loader2, ShieldAlert, X } from 'lucide-react';
import type { MediaItem, Person } from '../lib/api';
import { avatarUrl, label, signedMediaUrl } from '../lib/format';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ── Buttons ──────────────────────────────────────────────────────────────────
type Tone = 'primary' | 'danger' | 'neutral' | 'ghost' | 'success';
const TONES: Record<Tone, string> = {
  primary: 'bg-ink text-white hover:bg-ink-3',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  neutral: 'bg-white text-ink border border-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

export function Button({
  tone = 'neutral', size = 'md', busy, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'sm' | 'md'; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        TONES[tone],
        className,
      )}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ── Badges ───────────────────────────────────────────────────────────────────
const BADGE: Record<string, string> = {
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-azure-soft text-azure ring-blue-200',
  orange: 'bg-ace-soft text-ace ring-orange-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({ color = 'slate', children }: { color?: keyof typeof BADGE | string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', BADGE[color] ?? BADGE.slate)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    ({
      open: 'amber', pending: 'amber', more_info: 'violet', reviewing: 'blue', escalated: 'red',
      resolved: 'green', approved: 'green', granted: 'green', accepted: 'green', booked: 'green', visible: 'green', live: 'blue',
      dismissed: 'slate', rejected: 'red', revoked: 'red', removed: 'red', declined: 'slate', withdrawn: 'slate',
      cancelled: 'slate', expired: 'slate', hidden: 'amber', under_review: 'amber', none: 'red', closed: 'slate', funded: 'green',
    } as Record<string, string>)[status] ?? 'slate';
  return <Badge color={color}>{label(status)}</Badge>;
}

// ── Layout pieces ────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white', className)}>{children}</div>;
}

export function Tabs<T extends string>({
  value, onChange, items,
}: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === it.value ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink',
          )}
        >
          {it.label}
          {it.count != null && <span className="ml-1.5 text-xs text-slate-400">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error instanceof Error ? error.message : String(error)}</span>
    </div>
  );
}

export function Field({ label: l, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{l}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

// ── People ───────────────────────────────────────────────────────────────────
export function Avatar({ person, size = 32 }: { person: Pick<Person, 'full_name' | 'avatar_url'> | null; size?: number }) {
  const src = avatarUrl(person?.avatar_url);
  const initials = (person?.full_name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return src ? (
    <img src={src} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600" style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

export function PersonCell({ person, sub, link = true }: { person: Person | null; sub?: ReactNode; link?: boolean }) {
  if (!person) return <span className="text-sm text-slate-400">Deleted account</span>;
  const name = (
    <span className="inline-flex items-center gap-1 font-medium text-ink">
      {person.full_name ?? 'Unnamed'}
      {person.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-azure" />}
    </span>
  );
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar person={person} />
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {link ? <Link to={`/users/${person.id}`} className="hover:underline">{name}</Link> : name}
          {person.is_minor && <Badge color="orange">Minor</Badge>}
          {person.is_suspended && <Badge color="red">Suspended</Badge>}
        </div>
        <div className="truncate text-xs text-slate-500">{sub ?? label(person.role)}</div>
      </div>
    </div>
  );
}

// ── Media preview ────────────────────────────────────────────────────────────
function SignedMedia({ bucket, path, type, poster }: { bucket: 'posts' | 'stories'; path: string; type: string; poster?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [posterSrc, setPosterSrc] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    signedMediaUrl(bucket, path).then((u) => live && setSrc(u));
    if (poster) signedMediaUrl(bucket, poster).then((u) => live && setPosterSrc(u ?? undefined));
    return () => { live = false; };
  }, [bucket, path, poster]);
  if (!src) return <div className="aspect-[9/16] w-full animate-pulse rounded-lg bg-slate-100" />;
  return type === 'video' || /\.(mp4|mov|webm)$/i.test(path) ? (
    <video src={src} poster={posterSrc} controls preload="metadata" className="aspect-[9/16] w-full rounded-lg bg-black object-contain" />
  ) : (
    <img src={src} alt="" className="aspect-[9/16] w-full rounded-lg bg-slate-100 object-cover" />
  );
}

export function MediaStrip({
  media, bucket = 'posts', single, singleType, poster, card,
}: {
  media?: MediaItem[];
  bucket?: 'posts' | 'stories';
  single?: string | null;
  singleType?: string | null;
  poster?: string | null;
  card?: Record<string, unknown>;
}) {
  const items: MediaItem[] = media?.length
    ? media
    : single
      ? [{ url: single, type: singleType === 'photo' ? 'photo' : singleType ?? 'video', thumbnail: poster ?? undefined }]
      : [];
  if (!items.length && card && Object.keys(card).length) {
    return (
      <div className="flex aspect-[9/16] w-32 flex-col justify-end rounded-lg bg-gradient-to-br from-ace to-violet-600 p-3 text-white">
        {'stat' in card && <div className="text-2xl font-bold">{String(card.stat)}</div>}
        {'text' in card && <div className="text-xs">{String(card.text)}</div>}
      </div>
    );
  }
  if (!items.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {items.slice(0, 4).map((m) => (
        <div key={m.url} className="w-32 shrink-0">
          <SignedMedia bucket={bucket} path={m.url} type={m.type} poster={m.thumbnail} />
        </div>
      ))}
    </div>
  );
}

// ── Action dialog: every destructive action asks for a reason ────────────────
export interface DialogSpec {
  title: string;
  body?: ReactNode;
  confirm: string;
  tone?: Tone;
  reason?: 'required' | 'optional' | 'none';
  reasonLabel?: string;
  reasonPlaceholder?: string;
  days?: boolean;
  onConfirm: (reason: string, days: number | null) => Promise<unknown>;
}

export function ActionDialog({ spec, onClose }: { spec: DialogSpec | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<string>('7');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { setReason(''); setDays('7'); setErr(null); setBusy(false); }, [spec]);
  if (!spec) return null;
  const mode = spec.reason ?? 'required';
  const blocked = mode === 'required' && !reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">{spec.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        {spec.body && <div className="mt-2 text-sm text-slate-600">{spec.body}</div>}
        {spec.days && (
          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-600">Duration</span>
            <select value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="ban">Permanent ban</option>
            </select>
          </label>
        )}
        {mode !== 'none' && (
          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-600">
              {spec.reasonLabel ?? 'Reason'} {mode === 'optional' && <span className="text-slate-400">(optional)</span>}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={spec.reasonPlaceholder ?? 'Shown to the user and saved in the audit log'}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
        )}
        {err != null && <div className="mt-3"><ErrorBox error={err} /></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>Cancel</Button>
          <Button
            tone={spec.tone ?? 'primary'}
            busy={busy}
            disabled={blocked}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await spec.onConfirm(reason.trim(), spec.days ? (days === 'ban' ? null : Number(days)) : null);
                onClose();
              } catch (e) {
                setErr(e);
                setBusy(false);
              }
            }}
          >
            {spec.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UrgentFlag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      <ShieldAlert className="h-3 w-3" /> Urgent
    </span>
  );
}

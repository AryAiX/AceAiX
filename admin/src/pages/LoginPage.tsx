import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Button, ErrorBox } from '../components/ui';

export default function LoginPage() {
  const { signIn, denied } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  return (
    <div className="flex min-h-full items-center justify-center bg-ink p-4">
      <form
        className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try { await signIn(email.trim(), password); } catch (x) { setErr(x); } finally { setBusy(false); }
        }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg" />
          <div>
            <div className="font-semibold text-ink">AceAiX Admin</div>
            <div className="text-xs text-slate-500">Staff only</div>
          </div>
        </div>
        <label className="mt-6 block">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <input className="input mt-1 w-full" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-slate-600">Password</span>
          <input className="input mt-1 w-full" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {denied && <div className="mt-4"><ErrorBox error="This account is not an AceAiX admin." /></div>}
        {err != null && <div className="mt-4"><ErrorBox error={err} /></div>}
        <Button tone="primary" busy={busy} className="mt-5 w-full" type="submit">Sign in</Button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const SAFETY_EMAIL = 'safety@aceaix.com';

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-navy-800 flex items-center justify-center px-4 bg-grid">
      <section className="card w-full max-w-lg space-y-5" aria-live="polite">
        <ShieldAlert size={42} className="text-coral" aria-hidden="true" />
        {children}
      </section>
    </main>
  );
}

export function AgeReviewPage() {
  const { signOut } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');

  async function requestReview() {
    setRequesting(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('request_underage_age_appeal', {
      p_user: null,
    });
    setRequesting(false);
    if (requestError || data?.ok !== true) {
      setError(requestError?.message ?? 'We could not request an age review.');
      return;
    }
    setRequested(true);
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-white">Age review required</h1>
      <p className="text-slate-300">
        AceAiX is available only to people aged 13 or older. This account is paused while its
        age is reviewed, so the rest of the app is unavailable.
      </p>
      <p className="text-slate-400">
        {requested
          ? 'Your review request was recorded. We will preserve the account while our safety team checks it.'
          : 'If the birth date was entered incorrectly, request a review. A linked parent or guardian can also request one.'}
      </p>
      {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      <button
        type="button"
        className="btn-primary justify-center"
        onClick={requestReview}
        disabled={requesting || requested}
      >
        {requested ? 'Review requested' : requesting ? 'Requesting…' : 'Request an age review'}
      </button>
      <a className="text-sm text-blue-400 hover:underline" href={`mailto:${SAFETY_EMAIL}`}>
        Need help? Email {SAFETY_EMAIL}
      </a>
      <button type="button" className="btn-outline justify-center" onClick={() => void signOut()}>
        Sign out
      </button>
    </PageShell>
  );
}

export function SuspendedAccountPage() {
  const { signOut } = useAuth();
  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-white">Account paused</h1>
      <p className="text-slate-300">
        This account is currently unavailable. The rest of the app remains locked while our
        safety team reviews it.
      </p>
      <a className="text-sm text-blue-400 hover:underline" href={`mailto:${SAFETY_EMAIL}`}>
        Contact {SAFETY_EMAIL}
      </a>
      <button type="button" className="btn-outline justify-center" onClick={() => void signOut()}>
        Sign out
      </button>
    </PageShell>
  );
}

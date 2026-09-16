import PublicHeader from '../../components/PublicHeader';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { COMPANY } from '@legal';

/**
 * Requesting account deletion without installing anything.
 *
 * Google Play requires this page to exist and to be reachable from outside the
 * app — the in-app flow on its own is not enough, because somebody who has
 * already deleted the app still has an account. Apple accepts the in-app flow,
 * but a public page costs nothing and answers the same question.
 *
 * The page is deliberately specific about what goes and what stays. "We delete
 * your data" is not an answer a reviewer or a parent can check.
 */

const REMOVED = [
  'Your profile, photo, biography and every athlete detail on it.',
  'Your posts, comments, likes and saved items.',
  'Your clips and photos, including the files themselves in storage.',
  'Your match records, endorsements you received, and your Talent Score with its history.',
  'Your messages, and your side of every conversation.',
  'Your follows, blocks, notifications, streak and achievements.',
  'Guardian consent records held for your account.',
];

const KEPT = [
  'Anonymous, aggregated counts that cannot be traced back to you — for example how many athletes play a sport.',
  'Records we are legally required to keep, such as a report about a safety incident, held only as long as the law requires.',
  'Server security logs, which age out on their own schedule.',
];

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <PublicHeader />

      <main className="mx-auto max-w-3xl px-6 py-16 text-slate-300">
        <div className="mb-8 flex items-center gap-3">
          <Trash2 className="h-7 w-7 text-orange-500" />
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Delete your AceAiX account
          </h1>
        </div>

        <p className="text-lg leading-relaxed">
          You can delete your account and everything on it at any time. There are two ways to do
          it, and both end in the same place.
        </p>

        {/* ── In the app ── */}
        <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">In the app — immediate</h2>
          </div>
          <p className="leading-relaxed">
            Open AceAiX and go to <strong className="text-white">You → Settings → Delete
            account</strong>. You will be asked to confirm, and the account is gone when you do.
            Nothing is queued and nothing waits for us to act.
          </p>
        </section>

        {/* ── By email ── */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">
              By email — if you no longer have the app
            </h2>
          </div>
          <p className="leading-relaxed">
            Write to{' '}
            <a
              className="text-orange-400 underline underline-offset-2 hover:text-orange-300"
              href={`mailto:${COMPANY.privacyEmail}?subject=Delete%20my%20AceAiX%20account`}
            >
              {COMPANY.privacyEmail}
            </a>{' '}
            from the email address on the account, with the subject{' '}
            <strong className="text-white">Delete my AceAiX account</strong>.
          </p>
          <p className="mt-3 leading-relaxed">
            We reply within <strong className="text-white">3 working days</strong> to confirm the
            request came from you, and the account is deleted within{' '}
            <strong className="text-white">30 days</strong> of that confirmation. If the account
            belongs to someone under 18, a parent or guardian can make the request instead, from
            the address on file for them.
          </p>
        </section>

        {/* ── What goes ── */}
        <h2 className="mt-14 mb-4 text-2xl font-bold text-white">What is deleted</h2>
        <ul className="space-y-2 pl-5">
          {REMOVED.map((line) => (
            <li key={line} className="list-disc leading-relaxed marker:text-orange-500">
              {line}
            </li>
          ))}
        </ul>

        <h2 className="mt-12 mb-4 text-2xl font-bold text-white">What is kept, and why</h2>
        <ul className="space-y-2 pl-5">
          {KEPT.map((line) => (
            <li key={line} className="list-disc leading-relaxed marker:text-orange-500">
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-12 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
          <p className="leading-relaxed">
            Deletion cannot be undone, and we cannot restore an account afterwards. If you would
            rather step back without losing anything, you can turn off discovery in{' '}
            <strong className="text-white">Settings → Privacy</strong> — your profile stops
            appearing in searches and stays otherwise intact.
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Questions about any of this go to{' '}
          <a
            className="text-orange-400 underline underline-offset-2 hover:text-orange-300"
            href={`mailto:${COMPANY.privacyEmail}`}
          >
            {COMPANY.privacyEmail}
          </a>
          . Our <Link className="text-orange-400 underline underline-offset-2" to="/privacy">
            Privacy Policy
          </Link>{' '}
          explains what we hold while the account is open.
        </p>
      </main>
    </div>
  );
}

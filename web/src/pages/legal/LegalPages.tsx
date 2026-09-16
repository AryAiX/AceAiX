import PublicHeader from '../../components/PublicHeader';
import LegalDocument from '../../components/LegalDocument';
import {
  CHILD_SAFETY_MD,
  COMPANY,
  GUIDELINES_MD,
  LAST_UPDATED_LABEL,
  PRIVACY_MD,
  TERMS_MD,
} from '@legal';

/**
 * The published legal surface.
 *
 * Every one of these renders the exact text the app ships, imported from
 * `mobile/lib/legal/`. Google Play's Child Safety Standards declaration and
 * Apple's guideline 1.2 both want a public URL, and both reviewers compare the
 * page against what the app shows. There is one copy, so they always match.
 */

function Page({ markdown }: { markdown: string }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <PublicHeader />
      <LegalDocument markdown={markdown} />
      <footer className="mx-auto max-w-3xl px-6 pb-20 text-sm text-slate-500">
        <p>
          Last updated {LAST_UPDATED_LABEL}. Published by {COMPANY.legalName}, {COMPANY.address}.
        </p>
      </footer>
    </div>
  );
}

export function TermsPage() {
  return <Page markdown={TERMS_MD} />;
}

export function PrivacyPage() {
  return <Page markdown={PRIVACY_MD} />;
}

export function GuidelinesPage() {
  return <Page markdown={GUIDELINES_MD} />;
}

export function ChildSafetyPage() {
  return <Page markdown={CHILD_SAFETY_MD} />;
}

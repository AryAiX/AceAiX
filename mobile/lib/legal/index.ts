/**
 * The published legal surface.
 *
 * The four documents live here as plain strings rather than remote HTML for
 * two reasons: a store reviewer must be able to read them with no network,
 * and the version shipped in a build can never silently disagree with what
 * the app actually does.
 *
 * The markup understood by `components/settings/LegalDocument.tsx` is a
 * deliberate subset: `#`/`##`/`###` headings, blank-line separated
 * paragraphs, `-` bullets, `**bold**` and `[text](url)`. Nothing else.
 */

export { TERMS_MD } from './terms';
export { PRIVACY_MD } from './privacy';
export { GUIDELINES_MD } from './guidelines';
export { CHILD_SAFETY_MD } from './childSafety';

/** ISO date the four documents were last changed. */
export const LAST_UPDATED = '2026-09-04';

/** The same date, written the way it is shown on every document. */
export const LAST_UPDATED_LABEL = '4 September 2026';

export const COMPANY = {
  legalName: 'AryAiX',
  product: 'AceAiX',
  address: 'Dilan Tower, Al Jadaf, Dubai, United Arab Emirates',
  tradeLicence: '1610838',
  website: 'https://aceaix.com',
  supportEmail: 'support@aceaix.com',
  privacyEmail: 'privacy@aceaix.com',
  safetyEmail: 'safety@aceaix.com',
  minimumAge: 13,
} as const;

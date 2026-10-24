import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

/**
 * The guardian consent page, as data.
 *
 * The edge function is the source of truth. These helpers only decide which
 * screen a response belongs on, then the page renders that. The request uses
 * the app's public key and never the visitor's session.
 */

export const CONSENT_SCOPES = [
  'allow_discovery',
  'allow_messaging',
  'allow_media',
  'allow_assessments',
  'allow_sponsorship',
  'allow_bookings',
  'allow_mindset',
] as const;

export type ConsentScope = (typeof CONSENT_SCOPES)[number];
export type ConsentOptions = Record<ConsentScope, boolean>;

export type ConsentScreen =
  | { screen: 'invalid' }
  | { screen: 'expired' }
  | { screen: 'answered' }
  | { screen: 'pending'; childName: string | null; options: ConsentOptions }
  | { screen: 'approved' }
  | { screen: 'declined' }
  | { screen: 'error' };

const UNTICKED: ConsentOptions = {
  allow_discovery: false,
  allow_messaging: false,
  allow_media: false,
  allow_assessments: false,
  allow_sponsorship: false,
  allow_bookings: false,
  allow_mindset: false,
};

function record(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function childName(body: Record<string, unknown> | null): string | null {
  const name = body?.child_name;
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed ? trimmed : null;
}

/** Only JSON true is a ticked box. A missing options object leaves them all off. */
function options(body: Record<string, unknown> | null): ConsentOptions {
  const raw = body?.options;
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!source) return { ...UNTICKED };
  return {
    allow_discovery: source.allow_discovery === true,
    allow_messaging: source.allow_messaging === true,
    allow_media: source.allow_media === true,
    allow_assessments: source.allow_assessments === true,
    allow_sponsorship: source.allow_sponsorship === true,
    allow_bookings: source.allow_bookings === true,
    allow_mindset: source.allow_mindset === true,
  };
}

/**
 * GET ?format=json.
 * 400 and 404 are a bad link, 410 is expired, anything other than 200 is a
 * failure the parent can retry. 200 follows `state`.
 */
export function screenFromConsentGet(status: number, body: unknown): ConsentScreen {
  if (status === 400 || status === 404) return { screen: 'invalid' };
  if (status === 410) return { screen: 'expired' };
  if (status !== 200) return { screen: 'error' };

  const data = record(body);
  const state = data?.state;
  if (state === 'pending') {
    return { screen: 'pending', childName: childName(data), options: options(data) };
  }
  if (state === 'answered') return { screen: 'answered' };
  if (state === 'expired') return { screen: 'expired' };
  if (state === 'invalid') return { screen: 'invalid' };
  return { screen: 'error' };
}

/**
 * POST { token, decision, allow_* }.
 * A 5xx is a failed write the parent can retry, even when `state` is invalid.
 * granted and revoked are the two success screens.
 */
export function screenFromConsentPost(status: number, body: unknown): ConsentScreen {
  if (status >= 500) return { screen: 'error' };

  const data = record(body);
  const state = data?.state;
  if (status === 200 && data?.ok === true && state === 'granted') return { screen: 'approved' };
  if (status === 200 && data?.ok === true && state === 'revoked') return { screen: 'declined' };
  if (status === 410 || state === 'expired') return { screen: 'expired' };
  if (status === 400 || status === 404 || state === 'invalid') return { screen: 'invalid' };
  return { screen: 'error' };
}

function consentUrl(token: string): string {
  return `${SUPABASE_URL}/functions/v1/guardian-consent?token=${encodeURIComponent(token)}&format=json`;
}

function publicKeyHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchConsentPage(token: string): Promise<ConsentScreen> {
  try {
    const res = await fetch(consentUrl(token), { method: 'GET', headers: publicKeyHeaders() });
    return screenFromConsentGet(res.status, await readJson(res));
  } catch {
    return { screen: 'error' };
  }
}

export async function submitConsentDecision(
  token: string,
  decision: 'approve' | 'decline',
  choices: ConsentOptions,
): Promise<ConsentScreen> {
  try {
    const res = await fetch(consentUrl(token), {
      method: 'POST',
      headers: publicKeyHeaders(),
      body: JSON.stringify({ token, decision, ...choices }),
    });
    return screenFromConsentPost(res.status, await readJson(res));
  } catch {
    return { screen: 'error' };
  }
}

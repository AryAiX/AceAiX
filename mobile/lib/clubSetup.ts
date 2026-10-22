import type { ClubBasicsInput, ClubPage, ClubPageUpdate, ClubSocials, ClubSport } from '@/lib/api.club';
import { cleanList, isValidEmail, isValidFoundedYear, isValidPhone, type ClubType } from '@/lib/club';

/**
 * Setting up and editing a club page (1014/01): the draft the wizard and the
 * edit screen share, the patches each step sends, and the small parsers
 * (a pasted map link, a year). Pure — no React, no network — so it is tested
 * on its own.
 */

// ── Steps ────────────────────────────────────────────────────────────────────

export const SETUP_STEPS = ['basics', 'where', 'sports', 'contact', 'branding', 'verify', 'done'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** The socials a club is asked for. Others already on the page are kept. */
export const SETUP_SOCIALS = ['instagram', 'x', 'facebook', 'youtube', 'tiktok'] as const;
export type SetupSocial = (typeof SETUP_SOCIALS)[number];

export const LIMITS = {
  name: 120,
  nameLocal: 255,
  ceo: 150,
  city: 100,
  address: 300,
  branchLabel: 80,
  branches: 15,
  category: 30,
  categories: 20,
  facility: 60,
  facilities: 20,
  description: 300,
  aboutStory: 5000,
  mission: 600,
  philosophy: 1500,
  league: 150,
  social: 200,
  licence: 80,
  personName: 120,
  personTitle: 120,
} as const;

// ── The draft ────────────────────────────────────────────────────────────────

export interface BranchDraft {
  /** Local only: a stable React key for the row. */
  key: string;
  label: string;
  city: string;
  address: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ClubDraft {
  type: ClubType;
  name: string;
  name_local: string;
  /** Text while typing; checked with `parseFoundedYear`. */
  founded_year: string;
  ceo_name: string;

  country: string | null;
  city: string;
  address: string;
  /** What they pasted: a map link or "lat, lng". */
  pin: string;
  branches: BranchDraft[];

  sports: ClubSport[];

  contact_email: string;
  contact_phone: string;
  website: string;
  socials: ClubSocials;
  facilities: string[];
  description: string;

  logo_url: string | null;
  cover_url: string | null;

  about_story: string;
  mission: string;
  philosophy: string;
  league: string;
}

export interface VerificationDraft {
  contact_person_name: string;
  contact_person_title: string;
  license_number: string;
  /** A fresh upload in this session (a private storage path, never a URL). */
  document_path: string | null;
  /** The page already has a licence on file. */
  has_document: boolean;
  accept_terms: boolean;
}

let branchSeq = 0;
export function newBranch(country: string | null = null): BranchDraft {
  branchSeq += 1;
  return {
    key: `b${Date.now().toString(36)}${branchSeq}`,
    label: '',
    city: '',
    address: '',
    country,
    latitude: null,
    longitude: null,
  };
}

export function emptyDraft(): ClubDraft {
  return {
    type: 'club',
    name: '',
    name_local: '',
    founded_year: '',
    ceo_name: '',
    country: null,
    city: '',
    address: '',
    pin: '',
    branches: [],
    sports: [],
    contact_email: '',
    contact_phone: '',
    website: '',
    socials: {},
    facilities: [],
    description: '',
    logo_url: null,
    cover_url: null,
    about_story: '',
    mission: '',
    philosophy: '',
    league: '',
  };
}

export function emptyVerification(): VerificationDraft {
  return {
    contact_person_name: '',
    contact_person_title: '',
    license_number: '',
    document_path: null,
    has_document: false,
    accept_terms: false,
  };
}

/** The signed-in account, as far as "who's filling this in" needs it. */
export interface AccountName {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

/** full_name, or first and last when full_name is empty. */
export function accountContactName(account: AccountName | null | undefined): string {
  const full = account?.full_name?.trim() ?? '';
  if (full) return full.slice(0, LIMITS.personName);
  return [account?.first_name, account?.last_name]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, LIMITS.personName);
}

/**
 * Puts the account name on a blank "Your name". A name already on the draft
 * — saved on the page, or typed — is left as it is. Call this once, when the
 * draft is first built: calling it again would fill the field back in after
 * the person clears it to retype.
 */
export function withAccountContactName(
  draft: VerificationDraft,
  account: AccountName | null | undefined,
): VerificationDraft {
  if (draft.contact_person_name.trim()) return draft;
  const name = accountContactName(account);
  if (!name) return draft;
  return { ...draft, contact_person_name: name };
}

export function draftFromPage(page: ClubPage): ClubDraft {
  const o = page.organization;
  return {
    type: o.type === 'academy' ? 'academy' : 'club',
    name: o.name ?? '',
    name_local: o.name_local ?? '',
    founded_year: o.founded_year ? String(o.founded_year) : '',
    ceo_name: o.ceo_name ?? '',
    country: o.country,
    city: o.city ?? '',
    address: o.address ?? '',
    pin: o.latitude != null && o.longitude != null ? formatPin(o.latitude, o.longitude) : '',
    branches: page.locations
      .filter((l) => !l.is_primary)
      .map((l) => ({
        key: l.id,
        label: l.label ?? '',
        city: l.city ?? '',
        address: l.address ?? '',
        country: l.country,
        latitude: l.latitude,
        longitude: l.longitude,
      })),
    sports: page.sports.map((s) => ({ sport: s.sport, categories: [...s.categories] })),
    contact_email: o.contact_email ?? '',
    contact_phone: o.contact_phone ?? '',
    website: o.website ?? '',
    socials: { ...(o.socials ?? {}) },
    facilities: [...(o.facilities ?? [])],
    description: o.description ?? '',
    logo_url: o.logo_url,
    cover_url: o.cover_url,
    about_story: o.about_story ?? '',
    mission: o.mission ?? '',
    philosophy: o.philosophy ?? '',
    league: o.league ?? '',
  };
}

export function verificationFromPage(page: ClubPage): VerificationDraft {
  const v = page.verification;
  return {
    contact_person_name: v?.contact_person_name ?? '',
    contact_person_title: v?.contact_person_title ?? '',
    license_number: v?.license_number ?? '',
    document_path: null,
    has_document: v?.has_document ?? false,
    accept_terms: false,
  };
}

/** Where a person who closed the wizard halfway picks up again. */
export function firstIncompleteStep(page: ClubPage): SetupStep {
  const o = page.organization;
  if (!o.name || !o.founded_year || !o.ceo_name) return 'basics';
  if (!o.country || !o.city) return 'where';
  if (page.sports.length === 0) return 'sports';
  const socials = Object.values(o.socials ?? {}).some((v) => !!v);
  if (!o.contact_email && !o.contact_phone && !o.website && !o.description && !socials) return 'contact';
  if (!o.logo_url && !o.cover_url) return 'branding';
  if (!page.verification?.terms_accepted) return 'verify';
  return 'done';
}

// ── Checks ───────────────────────────────────────────────────────────────────

const trimOrNull = (value: string): string | null => {
  const v = value.trim();
  return v ? v : null;
};

/** "1998" → 1998; anything else → null. */
export function parseFoundedYear(text: string, now = new Date()): number | null {
  const v = text.trim();
  if (!/^\d{4}$/.test(v)) return null;
  const year = Number(v);
  return isValidFoundedYear(year, now) ? year : null;
}

export type BasicsError = 'name' | 'year' | 'ceo';

export function basicsErrors(draft: ClubDraft, now = new Date()): Partial<Record<BasicsError, true>> {
  const out: Partial<Record<BasicsError, true>> = {};
  if (draft.name.trim().length < 2) out.name = true;
  if (parseFoundedYear(draft.founded_year, now) === null) out.year = true;
  if (draft.ceo_name.trim().length < 2) out.ceo = true;
  return out;
}

export type WhereError = 'country' | 'city' | 'pin';

export function whereErrors(draft: ClubDraft): Partial<Record<WhereError, true>> {
  const out: Partial<Record<WhereError, true>> = {};
  if (!draft.country) out.country = true;
  if (draft.city.trim().length < 2) out.city = true;
  if (draft.pin.trim() && !parseMapLocation(draft.pin)) out.pin = true;
  return out;
}

export type ContactError = 'email' | 'phone' | 'website';

export function contactErrors(draft: ClubDraft): Partial<Record<ContactError, true>> {
  const out: Partial<Record<ContactError, true>> = {};
  if (draft.contact_email.trim() && !isValidEmail(draft.contact_email)) out.email = true;
  if (draft.contact_phone.trim() && !isValidPhone(draft.contact_phone)) out.phone = true;
  if (draft.website.trim() && !looksLikeWebsite(draft.website)) out.website = true;
  return out;
}

/** "club.ae", "www.club.ae/x", "https://club.ae" — a host with a dot, no spaces. */
export function looksLikeWebsite(value: string): boolean {
  const v = value.trim().replace(/^https?:\/\//i, '');
  return /^[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/.test(v);
}

// ── Patches: what each step sends ────────────────────────────────────────────

export function basicsInput(draft: ClubDraft, now = new Date()): ClubBasicsInput {
  return {
    type: draft.type,
    name: draft.name.trim(),
    name_local: trimOrNull(draft.name_local),
    founded_year: parseFoundedYear(draft.founded_year, now) ?? 0,
    ceo_name: draft.ceo_name.trim(),
    country: draft.country,
    city: trimOrNull(draft.city),
  };
}

export function basicsPatch(draft: ClubDraft, now = new Date()): ClubPageUpdate {
  const input = basicsInput(draft, now);
  return {
    type: input.type,
    name: input.name,
    name_local: input.name_local,
    founded_year: input.founded_year,
    ceo_name: input.ceo_name,
  };
}

export function wherePatch(draft: ClubDraft): ClubPageUpdate {
  const pin = draft.pin.trim() ? parseMapLocation(draft.pin) : null;
  return {
    country: draft.country,
    city: trimOrNull(draft.city),
    address: trimOrNull(draft.address),
    latitude: pin?.latitude ?? null,
    longitude: pin?.longitude ?? null,
    locations: draft.branches
      .filter((b) => b.label.trim() || b.city.trim() || b.address.trim())
      .slice(0, LIMITS.branches)
      .map((b) => ({
        label: trimOrNull(b.label),
        city: trimOrNull(b.city),
        address: trimOrNull(b.address),
        country: b.country ?? draft.country,
        latitude: b.latitude,
        longitude: b.longitude,
      })),
  };
}

export function sportsPatch(draft: ClubDraft): ClubPageUpdate {
  return {
    sports: draft.sports.map((s) => ({
      sport: s.sport,
      categories: cleanList(s.categories, LIMITS.categories, LIMITS.category),
    })),
  };
}

export function contactPatch(draft: ClubDraft): ClubPageUpdate {
  const socials: ClubSocials = {};
  for (const [key, value] of Object.entries(draft.socials ?? {})) {
    const v = (value ?? '').trim();
    if (v) socials[key as keyof ClubSocials] = v.slice(0, LIMITS.social);
  }
  return {
    contact_email: trimOrNull(draft.contact_email)?.toLowerCase() ?? null,
    contact_phone: trimOrNull(draft.contact_phone),
    website: trimOrNull(draft.website),
    socials,
    facilities: cleanList(draft.facilities, LIMITS.facilities, LIMITS.facility),
    description: trimOrNull(draft.description),
  };
}

export function brandingPatch(draft: ClubDraft): ClubPageUpdate {
  return { logo_url: draft.logo_url, cover_url: draft.cover_url };
}

export function aboutPatch(draft: ClubDraft): ClubPageUpdate {
  return {
    about_story: trimOrNull(draft.about_story),
    mission: trimOrNull(draft.mission),
    philosophy: trimOrNull(draft.philosophy),
    league: trimOrNull(draft.league),
  };
}

/** Toggle a sport on or off, keeping the categories of the others. */
export function toggleSport(sports: ClubSport[], sport: string): ClubSport[] {
  return sports.some((s) => s.sport === sport)
    ? sports.filter((s) => s.sport !== sport)
    : [...sports, { sport, categories: [] }];
}

/** Toggle a category inside one sport (case-insensitive). */
export function toggleCategory(sports: ClubSport[], sport: string, category: string): ClubSport[] {
  return sports.map((s) => {
    if (s.sport !== sport) return s;
    const key = category.trim().toLowerCase();
    const has = s.categories.some((c) => c.toLowerCase() === key);
    return {
      ...s,
      categories: has
        ? s.categories.filter((c) => c.toLowerCase() !== key)
        : cleanList([...s.categories, category], LIMITS.categories, LIMITS.category),
    };
  });
}

// ── Map pins ─────────────────────────────────────────────────────────────────

export interface MapPoint {
  latitude: number;
  longitude: number;
}

function point(lat: string | number, lng: string | number): MapPoint | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  // 0,0 is in the sea off Africa: almost always a broken link, never a club.
  if (latitude === 0 && longitude === 0) return null;
  return { latitude: round6(latitude), longitude: round6(longitude) };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Reads coordinates out of what people actually paste:
 *  - "25.2236, 55.3348" (or with a space only)
 *  - Google Maps: `/@25.22,55.33,15z`, `!3d25.22!4d55.33`, `?q=25.22,55.33`,
 *    `?query=…`, `?ll=…`, `?destination=…`
 *  - Apple Maps: `?ll=25.22,55.33`, `?q=…`, `?sll=…`, `?coordinate=…`
 * Short links (maps.app.goo.gl/…) hide the position behind a redirect, so they
 * return null and the screen asks for the full link instead.
 */
export function parseMapLocation(input: string | null | undefined): MapPoint | null {
  if (!input) return null;
  let text = input.trim();
  if (!text) return null;
  try {
    text = decodeURIComponent(text);
  } catch {
    // A stray % is fine: read the text as it is.
  }

  const plain = new RegExp(`^${NUM}\\s*[,\\s]\\s*${NUM}$`).exec(text);
  if (plain) return point(plain[1], plain[2]);

  // The place's own pin beats the camera position in a Google link.
  const bang = new RegExp(`!3d${NUM}!4d${NUM}`).exec(text);
  if (bang) return point(bang[1], bang[2]);

  const param = new RegExp(
    `[?&](?:q|query|ll|sll|daddr|destination|coordinate|center)=(?:loc:)?${NUM}\\s*,\\s*${NUM}`,
    'i',
  ).exec(text);
  if (param) return point(param[1], param[2]);

  const at = new RegExp(`@${NUM},${NUM}`).exec(text);
  if (at) return point(at[1], at[2]);

  return null;
}

/** 25.2236, 55.3348 — four decimals is about ten metres. */
export function formatPin(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/** Opens in the Google Maps app or site, wherever the reader is. */
export function mapUrl(p: MapPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;
}

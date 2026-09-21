/**
 * Client-side validation shared by the profile and settings forms.
 * Every validator returns a user-facing message, or null when the value is acceptable.
 */

export const FULL_NAME_MAX = 255;
export const HEIGHT_CM_RANGE = { min: 140, max: 220 } as const;
export const WEIGHT_KG_RANGE = { min: 50, max: 120 } as const;
export const EMAIL_MAX = 255;
export const PHONE_MAX = 50;

export function validateFullName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Full name is required.';
  if (trimmed.length > FULL_NAME_MAX) return `Full name must be ${FULL_NAME_MAX} characters or fewer.`;
  return null;
}

function validateMeasurement(
  value: string,
  label: string,
  unit: string,
  range: { min: number; max: number },
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // optional
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return `${label} must be a number.`;
  if (numeric < range.min || numeric > range.max) {
    return `${label} must be between ${range.min} and ${range.max} ${unit}.`;
  }
  return null;
}

export function validateHeightCm(value: string): string | null {
  return validateMeasurement(value, 'Height', 'cm', HEIGHT_CM_RANGE);
}

export function validateWeightKg(value: string): string | null {
  return validateMeasurement(value, 'Weight', 'kg', WEIGHT_KG_RANGE);
}

// Pragmatic address check: one "@", a non-empty local part, and a dotted domain without spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string, { required = true } = {}): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Email is required.' : null;
  if (trimmed.length > EMAIL_MAX) return `Email must be ${EMAIL_MAX} characters or fewer.`;
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address, like name@example.com.';
  return null;
}

// Optional leading "+", then digits with spaces, hyphens, dots or parentheses; 7–15 digits total (E.164).
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // optional
  if (trimmed.length > PHONE_MAX) return `Phone number must be ${PHONE_MAX} characters or fewer.`;
  const digits = trimmed.replace(/\D/g, '');
  if (!PHONE_PATTERN.test(trimmed) || digits.length < 7 || digits.length > 15) {
    return 'Enter a valid phone number, like +971 50 000 0000.';
  }
  return null;
}

export const GENERIC_SAVE_ERROR = 'We couldn’t save your changes. Please try again.';

/**
 * Turn a failed persistence call into copy that is safe to show. Database and
 * PostgREST messages ("value too long for type character varying(255)") are never
 * surfaced; the original error is logged for diagnostics instead.
 */
export function friendlySaveError(error: unknown, fallback = GENERIC_SAVE_ERROR): string {
  if (import.meta.env?.MODE !== 'test') {
    console.error('[save] persistence failed', error);
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (message.includes('row-level security') || message.includes('permission denied') || message.includes('jwt')) {
    return 'Your session has expired. Sign in again to save your changes.';
  }
  return fallback;
}

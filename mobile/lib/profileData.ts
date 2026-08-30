export interface AthleteAttribute {
  label: string;
  value: number;
}

function labelFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeAttributes(value: unknown): AthleteAttribute[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Partial<AthleteAttribute>;
      return typeof candidate.label === 'string' && typeof candidate.value === 'number'
        ? [{ label: candidate.label, value: candidate.value }]
        : [];
    });
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, score]) => (
      typeof score === 'number'
        ? [{ label: labelFromKey(key), value: score }]
        : []
    ));
  }

  return [];
}

import type { AttributeData } from '../types';

function labelFromKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function normalizeAttributes(value: unknown): AttributeData[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Partial<AttributeData>;
      if (typeof candidate.label !== 'string' || typeof candidate.value !== 'number') return [];
      return [{
        label: candidate.label,
        value: candidate.value,
        endorsements: candidate.endorsements ?? 0,
        topEndorser: candidate.topEndorser ?? '',
        topEndorserVerified: candidate.topEndorserVerified ?? false,
      }];
    });
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, score]) =>
      typeof score === 'number'
        ? [{
            label: labelFromKey(key),
            value: score,
            endorsements: 0,
            topEndorser: '',
            topEndorserVerified: false,
          }]
        : [],
    );
  }

  return [];
}

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;

  try {
    const parsed = new URL(value, 'https://app.aceaix.local');
    if (parsed.origin !== 'https://app.aceaix.local') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

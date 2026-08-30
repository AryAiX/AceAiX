export function safeAppPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const path = value.trim();
  if (
    !path.startsWith('/')
    || path.startsWith('//')
    || path.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return null;
  }

  return path;
}

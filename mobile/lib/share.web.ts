export interface ShareContent {
  message: string;
  url?: string;
  title?: string;
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed';

async function copyText(value: string): Promise<void> {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement('textarea');
  field.value = value;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard is unavailable');
}

/**
 * Use Web Share where available. Desktop browsers without it still perform
 * the action by copying the canonical URL/message instead of silently doing
 * nothing.
 */
export async function shareContent(content: ShareContent): Promise<ShareOutcome> {
  if (typeof globalThis.navigator?.share === 'function') {
    try {
      await globalThis.navigator.share({
        title: content.title,
        text: content.message,
        url: content.url,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed';
      // Permission policy and unsupported payload failures still have a useful
      // clipboard fallback.
    }
  }

  await copyText(content.url ?? content.message);
  return 'copied';
}

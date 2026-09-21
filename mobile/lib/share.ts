import { Share } from 'react-native';

export interface ShareContent {
  message: string;
  url?: string;
  title?: string;
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed';

/** Native share sheet. The `.web.ts` sibling supplies browser share/copy. */
export async function shareContent(content: ShareContent): Promise<ShareOutcome> {
  const result = await Share.share({
    message: content.message,
    url: content.url,
    title: content.title,
  });
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

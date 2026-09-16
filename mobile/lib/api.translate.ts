import { supabase } from '@/lib/supabase';

/**
 * "See translation".
 *
 * The server resolves the source row under the caller's authorization before
 * consulting its cache or a paid provider.
 *
 * The failure mode is deliberately quiet. If no provider is configured, or one
 * is down, or the network is bad, this returns null and the caller leaves the
 * original text showing. A translation that does not arrive is a feature that
 * did not appear, not an error the reader has to dismiss.
 */

export interface Translation {
  translated: string;
  detectedLang: string | null;
  provider: string;
}

/** Per-session memo, so re-opening the same post does not re-ask the server. */
const memo = new Map<string, Translation | null>();

const key = (text: string, target: string) => JSON.stringify([target, text.trim()]);

export interface TranslationSource {
  type: 'post' | 'comment' | 'message';
  id: string;
}

export async function translate(
  text: string,
  target: string,
  sourceRef: TranslationSource,
): Promise<Translation | null> {
  const source = text?.trim();
  if (!source) return null;

  const memoKey = key(source, target);
  if (memo.has(memoKey)) return memo.get(memoKey) ?? null;

  const remember = (value: Translation | null) => {
    memo.set(memoKey, value);
    return value;
  };

  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { source_type: sourceRef.type, source_id: sourceRef.id, target },
    });
    if (error) return remember(null);

    const body = data as {
      translated?: string;
      detected_lang?: string | null;
      provider?: string;
      configured?: boolean;
    } | null;

    /* `provider: 'none'` means no key is configured. That is not an error and
       not worth retrying this session — remember it so the button stops
       offering something that cannot happen. */
    if (!body?.translated || body.provider === 'none' || body.configured === false) {
      return remember(null);
    }

    return remember({
      translated: body.translated,
      detectedLang: body.detected_lang ?? null,
      provider: body.provider ?? 'unknown',
    });
  } catch {
    return remember(null);
  }
}

/**
 * Is this worth offering a translation for?
 *
 * Cheap, local, and deliberately crude — the honest answer needs the provider's
 * language detection, which costs money, so this only filters out the cases
 * where asking would obviously be silly: nothing to translate, or text that is
 * plainly already in the reader's script.
 *
 * Latin-script languages cannot be told apart this way, so English, Spanish,
 * French and German readers are always offered the button. Tapping it on text
 * already in your language costs one cached lookup and shows the same words,
 * which is a much smaller annoyance than never being offered it on the one
 * post you needed.
 */
export function mightNeedTranslation(text: string | null | undefined, readerLang: string): boolean {
  const source = text?.trim();
  if (!source || source.length < 8) return false;

  const scripts: Record<string, RegExp> = {
    ar: /[؀-ۿ]/,
    ru: /[Ѐ-ӿ]/,
    zh: /[一-鿿]/,
  };

  const readerScript = scripts[readerLang];
  if (readerScript) {
    /* A reader of a non-Latin script needs the button on anything that is not
       in their script. */
    return !readerScript.test(source);
  }

  /* A Latin-script reader needs it on anything containing another script, and
     may want it on Latin text too — so always offer. */
  return true;
}

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  I18nManager: { isRTL: false, allowRTL: () => {}, forceRTL: () => {} },
  NativeModules: {},
  Platform: { OS: 'ios', select: (options: { ios?: unknown }) => options.ios },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {} },
}));

import { translate } from '@/i18n';
import { ar } from '@/i18n/locales/ar';
import { en } from '@/i18n/locales/en';
import { fa } from '@/i18n/locales/fa';
import { setGlobalTranslator, tr } from '@/lib/i18n-bridge';

afterEach(() => setGlobalTranslator(null, 'en'));

describe('numbers inside a translated sentence', () => {
  it('uses Persian digits in fa and still chooses the plural from the raw number', () => {
    expect(translate(fa, 'fa', 'messaging.markAllReadA11y', { count: 1 })).toBe('۱ اعلان خوانده شود');
    expect(translate(fa, 'fa', 'messaging.markAllReadA11y', { count: 47 })).toBe(
      'هر ۴۷ اعلان خوانده شود',
    );
    expect(translate(fa, 'fa', 'messaging.moreNotifications', { count: 1200 })).toBe(
      '+۱۲۰۰ اعلان دیگر',
    );
    expect(translate(fa, 'fa', 'messaging.likedYourPosts', { name: '47', count: 2 })).toBe(
      '47 ۲ پست شما را پسندید',
    );
  });

  it('leaves English and Arabic unchanged', () => {
    expect(translate(en, 'en', 'messaging.markAllReadA11y', { count: 1 })).toBe(
      'Mark 1 notification as read',
    );
    expect(translate(en, 'en', 'messaging.markAllReadA11y', { count: 47 })).toBe(
      'Mark all 47 notifications as read',
    );
    expect(translate(ar, 'ar', 'messaging.markAllReadA11y', { count: 47 })).toBe(
      'تعليم 47 إشعارًا كمقروء',
    );
  });

  it('formats only a Persian fallback sentence', () => {
    setGlobalTranslator(null, 'fa');
    expect(tr('missing.key', '{{count}} left', { count: 47 })).toBe('۴۷ left');

    setGlobalTranslator(null, 'en');
    expect(tr('missing.key', '{{count}} left', { count: 47 })).toBe('47 left');

    setGlobalTranslator(null, 'ar');
    expect(tr('missing.key', '{{count}} left', { count: 47 })).toBe('47 left');
  });
});

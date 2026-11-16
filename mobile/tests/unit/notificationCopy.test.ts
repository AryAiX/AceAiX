import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Pressable: () => null,
  View: () => null,
  Platform: { OS: 'ios', select: (options: { ios?: unknown }) => options.ios },
  I18nManager: { isRTL: false },
  NativeModules: {},
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock('lucide-react-native', () => {
  const Icon = () => null;
  return {
    AtSign: Icon,
    Award: Icon,
    Bell: Icon,
    Building2: Icon,
    Megaphone: Icon,
    Radio: Icon,
    ShieldAlert: Icon,
    ShieldCheck: Icon,
    Sparkles: Icon,
    Tag: Icon,
    Trophy: Icon,
    Briefcase: Icon,
    Handshake: Icon,
    CalendarCheck: Icon,
    CalendarX: Icon,
    ClipboardCheck: Icon,
    Eye: Icon,
    Heart: Icon,
    Mail: Icon,
    MessageCircle: Icon,
    TrendingUp: Icon,
    UserPlus: Icon,
    Users: Icon,
  };
});

vi.mock('@/components/ui', () => ({
  Avatar: () => null,
  RemoteImage: () => null,
  Text: () => null,
}));

vi.mock('@/components/discover/FollowButton', () => ({
  FollowButton: () => null,
}));

vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({}),
}));

vi.mock('@/i18n', () => ({
  useT: () => (key: string) => key,
}));

import { notificationCopy } from '@/components/messaging/NotificationRow';
import { ar } from '@/i18n/locales/ar';
import { en } from '@/i18n/locales/en';
import type { Translate } from '@/lib/i18n-bridge';
import type { AppNotification, NotificationType } from '@/types/models';

function translate(root: object, language: string): Translate {
  return (key, vars) => {
    const parts = key.split('.');
    let node: unknown = root;
    for (const part of parts) {
      if (!node || typeof node !== 'object') return key;
      node = (node as Record<string, unknown>)[part];
    }
    if (typeof node !== 'string' && vars && typeof vars.count === 'number') {
      const category = new Intl.PluralRules(language).select(vars.count);
      const stem = parts.slice(0, -1);
      const last = parts[parts.length - 1];
      for (const suffix of [category, 'other']) {
        let next: unknown = root;
        for (const part of [...stem, `${last}_${suffix}`]) {
          if (!next || typeof next !== 'object') {
            next = undefined;
            break;
          }
          next = (next as Record<string, unknown>)[part];
        }
        if (typeof next === 'string') {
          node = next;
          break;
        }
      }
    }
    if (typeof node !== 'string') return key;
    if (!vars) return node;
    return node.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
      vars[name] === undefined ? whole : String(vars[name]),
    );
  };
}

const english = translate(en, 'en');
const arabic = translate(ar, 'ar');

function notice(over: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'follow',
    title: 'Sara started following you',
    body: null,
    is_read: false,
    actor_id: 'actor-1',
    entity_type: 'user',
    entity_id: 'actor-1',
    actor_count: 1,
    data: {},
    created_at: '2026-09-04T10:00:00Z',
    actor: { full_name: 'Sara', avatar_url: null },
    ...over,
  };
}

const ACTORS: { type: NotificationType; suffix: string; en: string; ar: string }[] = [
  {
    type: 'follow',
    suffix: ' started following you',
    en: 'Sara started following you',
    ar: 'بدأ Sara بمتابعتك',
  },
  {
    type: 'like',
    suffix: ' liked your post',
    en: 'Sara liked your post',
    ar: 'أُعجب Sara بمنشورك',
  },
  {
    type: 'comment',
    suffix: ' commented on your post',
    en: 'Sara commented on your post',
    ar: 'علّق Sara على منشورك',
  },
  {
    type: 'reply',
    suffix: ' replied to you',
    en: 'Sara replied to you',
    ar: 'ردّ Sara عليك',
  },
  {
    type: 'message',
    suffix: ' sent you a message',
    en: 'Sara sent you a message',
    ar: 'أرسل Sara إليك رسالة',
  },
  {
    type: 'profile_view',
    suffix: ' viewed your profile',
    en: 'Sara viewed your profile',
    ar: 'شاهد Sara ملفك',
  },
];

describe('actor notification sentences', () => {
  for (const row of ACTORS) {
    it(`writes ${row.type} from the name in English and Arabic`, () => {
      const stored = `Sara${row.suffix}`;
      const single = notice({ type: row.type, title: stored, body: 'Kept as written' });
      expect(notificationCopy(single, english)).toEqual({ title: row.en, body: 'Kept as written' });
      expect(notificationCopy(single, arabic)).toEqual({ title: row.ar, body: 'Kept as written' });
    });

    it(`groups ${row.type} as the name and others, in English and Arabic`, () => {
      const stored = `Sara${row.suffix}`;
      const grouped = notice({ type: row.type, title: stored, actor_count: 3 });
      expect(notificationCopy(grouped, english).title).toBe(`Sara and 2 others${row.suffix}`);
      expect(notificationCopy(grouped, arabic).title).toBe(row.ar.replace('Sara', 'Sara وشخصان آخران'));
    });

    it(`accepts the older merged ${row.type} title and still translates it`, () => {
      const stored = `Sara and 2 others${row.suffix}`;
      const merged = notice({ type: row.type, title: stored, actor_count: 3 });
      expect(notificationCopy(merged, english).title).toBe(`Sara and 2 others${row.suffix}`);
      expect(notificationCopy(merged, arabic).title).toBe(row.ar.replace('Sara', 'Sara وشخصان آخران'));
    });

    it(`keeps a ${row.type} title that is not the expected sentence`, () => {
      const stored = 'Something else happened';
      const odd = notice({ type: row.type, title: stored });
      expect(notificationCopy(odd, english).title).toBe(stored);
      expect(notificationCopy(odd, arabic).title).toBe(stored);
    });
  }

  it('keeps the stored title when the actor has no name', () => {
    const stored = 'Sara started following you';
    const nameless = notice({ title: stored, actor: undefined });
    expect(notificationCopy(nameless, english).title).toBe(stored);
    expect(notificationCopy(nameless, arabic).title).toBe(stored);
  });
});

describe('challenge result sentences', () => {
  it('translates a confirmed entry, with the challenge name, in English and Arabic', () => {
    const row = notice({
      type: 'challenge_verified',
      title: 'Your sprint challenge entry is confirmed',
      body: 'A coach watched it and confirmed the result.',
      actor: undefined,
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'Your sprint challenge entry is confirmed',
      body: 'A coach watched it and confirmed the result.',
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'تأكّدت مشاركتك في sprint challenge',
      body: 'شاهدها مدرّب وأكّد النتيجة.',
    });
  });

  it('translates an entry that needs another go, in English and Arabic', () => {
    const row = notice({
      type: 'challenge_rejected',
      title: 'Your sprint challenge entry needs another go',
      body: 'Read the brief again and send a new clip.',
      actor: undefined,
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'Your sprint challenge entry needs another go',
      body: 'Read the brief again and send a new clip.',
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'مشاركتك في sprint challenge تحتاج محاولة أخرى',
      body: 'أعد قراءة المطلوب وأرسل لقطة جديدة.',
    });
  });

  it('drops the challenge name when the stored title is not that sentence', () => {
    const row = notice({
      type: 'challenge_verified',
      title: 'Nice work on the sprint',
      body: null,
      actor: undefined,
    });
    expect(notificationCopy(row, english).title).toBe('Your entry is confirmed');
    expect(notificationCopy(row, arabic).title).toBe('تأكّدت مشاركتك');
  });

  it('keeps a note the coach wrote, in English and Arabic', () => {
    const note = 'Counted 210, not 214.';
    const row = notice({
      type: 'challenge_rejected',
      title: 'Your sprint challenge entry needs another go',
      body: note,
      actor: undefined,
    });
    expect(notificationCopy(row, english).body).toBe(note);
    expect(notificationCopy(row, arabic).body).toBe(note);
    expect(notificationCopy(row, arabic).title).toBe('مشاركتك في sprint challenge تحتاج محاولة أخرى');
  });
});

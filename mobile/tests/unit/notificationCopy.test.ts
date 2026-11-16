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

const FIXED: { type: NotificationType; title: string; ar: string; body?: string }[] = [
  { type: 'club_verification_approved', title: 'Your club page is verified', ar: 'تم توثيق صفحة ناديك' },
  {
    type: 'club_verification_rejected',
    title: 'Your club verification was not approved',
    ar: 'لم تُقبل عملية توثيق ناديك',
    body: 'The licence photo is blurry.',
  },
  {
    type: 'club_verification_more_info',
    title: 'We need more information to verify your club',
    ar: 'نحتاج إلى مزيد من المعلومات لتوثيق ناديك',
    body: 'Send a clearer photo of the pitch.',
  },
  { type: 'club_invite_accepted', title: 'Your invitation was accepted', ar: 'قُبلت دعوتك' },
  { type: 'guardian_consent_granted', title: 'Your parent approved your account', ar: 'وافق أحد والديك على حسابك' },
  { type: 'guardian_consent_changed', title: 'Your parent changed what you can do', ar: 'غيّر أحد والديك ما يمكنك فعله' },
  {
    type: 'guardian_consent_revoked',
    title: 'Your parent did not approve your request',
    ar: 'لم يوافق أحد والديك على طلبك',
  },
  {
    type: 'guardian_consent_revoked',
    title: 'Your parent approval was withdrawn',
    ar: 'سُحبت موافقة أحد والديك',
  },
];

describe('club, guardian and consent sentences', () => {
  for (const row of FIXED) {
    it(`translates ${row.type}: ${row.title}`, () => {
      const stored = notice({ type: row.type, title: row.title, body: row.body ?? null });
      expect(notificationCopy(stored, english)).toEqual({ title: row.title, body: row.body ?? null });
      expect(notificationCopy(stored, arabic)).toEqual({ title: row.ar, body: row.body ?? null });
    });
  }
});

describe('sentences with a name or a title in them', () => {
  it('translates a finished Game Intelligence session, and its private note', () => {
    const row = notice({
      type: 'gi_completed',
      title: 'Sara finished the Game Intelligence games',
      body: 'Their results are private unless they choose to share them.',
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'Sara finished the Game Intelligence games',
      body: 'Their results are private unless they choose to share them.',
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'أنهى Sara ألعاب ذكاء اللعب',
      body: 'نتائجهم خاصة ما لم يختاروا مشاركتها.',
    });
  });

  it('translates a finished Sport Fit, and its private note', () => {
    const row = notice({
      type: 'sport_fit_completed',
      title: 'Sara completed Sport Fit',
      body: 'Their answers and result are private to them.',
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'Sara completed Sport Fit',
      body: 'Their answers and result are private to them.',
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'أكمل Sara ملاءمة الرياضة',
      body: 'إجاباتهم ونتيجتهم خاصة بهم.',
    });
  });

  it('rebuilds a tier change from data.tier and data.overall', () => {
    const row = notice({
      type: 'score_tier_up',
      title: 'You reached Gold tier',
      body: 'Your Talent Score is now 80.',
      data: { tier: 'gold', overall: 80 },
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'You reached Gold tier',
      body: 'Your Talent Score is now 80.',
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'وصلت إلى مستوى ذهبي',
      body: 'درجة الموهبة لديك الآن 80.',
    });
  });

  it('translates an invitation to help run a club', () => {
    const row = notice({ type: 'club_invite', title: 'You were invited to help run Riverside' });
    expect(notificationCopy(row, english).title).toBe('You were invited to help run Riverside');
    expect(notificationCopy(row, arabic).title).toBe('دُعيت للمساعدة في إدارة Riverside');
  });

  it('translates a cancelled club event', () => {
    const row = notice({ type: 'club_event_cancelled', title: 'Open trial was cancelled' });
    expect(notificationCopy(row, english).title).toBe('Open trial was cancelled');
    expect(notificationCopy(row, arabic).title).toBe('أُلغي Open trial');
  });

  it('translates a registration, for the club and for a parent', () => {
    for (const type of ['club_event_registration', 'club_event_registration_minor'] as const) {
      const row = notice({ type, title: 'Sara registered for Open trial' });
      expect(notificationCopy(row, english).title).toBe('Sara registered for Open trial');
      expect(notificationCopy(row, arabic).title).toBe('سجّل Sara في Open trial');
    }
  });

  it('translates "Your child" on a minor registration, and keeps it as a name otherwise', () => {
    const child = notice({
      type: 'club_event_registration_minor',
      title: 'Your child registered for Open trial',
      actor: undefined,
    });
    expect(notificationCopy(child, english).title).toBe('Your child registered for Open trial');
    expect(notificationCopy(child, arabic).title).toBe('سجّل طفلك في Open trial');

    const named = notice({
      type: 'club_event_registration',
      title: 'Your child registered for Open trial',
      actor: undefined,
    });
    expect(notificationCopy(named, arabic).title).toBe('سجّل Your child في Open trial');
  });

  it('translates a squad link and keeps the squad name as written', () => {
    const row = notice({
      type: 'club_squad_link',
      title: 'Riverside added you to its U14 Football squad',
    });
    expect(notificationCopy(row, english).title).toBe('Riverside added you to its U14 Football squad');
    expect(notificationCopy(row, arabic).title).toBe('أضافك Riverside إلى فريق U14 Football');
  });

  it('translates a live match, with the club and the opponent', () => {
    const row = notice({ type: 'club_match_live', title: 'Riverside vs Marina is live' });
    expect(notificationCopy(row, english).title).toBe('Riverside vs Marina is live');
    expect(notificationCopy(row, arabic).title).toBe('Riverside ضد Marina مباشرة الآن');
  });

  it('translates a request to join, and keeps the message', () => {
    const message = 'Can I bring a friend?';
    const row = notice({
      type: 'meetup_request',
      title: 'Sara wants to join Tuesday kickabout',
      body: message,
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'Sara wants to join Tuesday kickabout',
      body: message,
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'يريد Sara الانضمام إلى Tuesday kickabout',
      body: message,
    });
  });

  it('translates an accepted meetup, and keeps the city and the date', () => {
    const when = 'Dubai · Nov 16, 18:00';
    const row = notice({ type: 'meetup_accepted', title: 'You are in: Tuesday kickabout', body: when });
    expect(notificationCopy(row, english)).toEqual({ title: 'You are in: Tuesday kickabout', body: when });
    expect(notificationCopy(row, arabic)).toEqual({ title: 'أنت مشارك: Tuesday kickabout', body: when });
  });

  it('translates a declined meetup', () => {
    const row = notice({ type: 'meetup_declined', title: 'Not this time: Tuesday kickabout' });
    expect(notificationCopy(row, english).title).toBe('Not this time: Tuesday kickabout');
    expect(notificationCopy(row, arabic).title).toBe('ليس هذه المرة: Tuesday kickabout');
  });

  it('translates a meetup that was called off', () => {
    const row = notice({ type: 'meetup_cancelled', title: 'Tuesday kickabout was called off' });
    expect(notificationCopy(row, english).title).toBe('Tuesday kickabout was called off');
    expect(notificationCopy(row, arabic).title).toBe('أُلغي Tuesday kickabout');
  });

  it('translates a challenge entry, and the default clip note', () => {
    const row = notice({
      type: 'challenge_entry',
      title: 'Sara entered sprint challenge',
      body: 'A new clip is waiting for you.',
    });
    expect(notificationCopy(row, english)).toEqual({
      title: 'Sara entered sprint challenge',
      body: 'A new clip is waiting for you.',
    });
    expect(notificationCopy(row, arabic)).toEqual({
      title: 'شارك Sara في sprint challenge',
      body: 'لقطة جديدة بانتظارك.',
    });

    const note = 'Watch the first touch.';
    const coached = notice({
      type: 'challenge_entry',
      title: 'Sara entered sprint challenge',
      body: note,
    });
    expect(notificationCopy(coached, english).body).toBe(note);
    expect(notificationCopy(coached, arabic).body).toBe(note);
    expect(notificationCopy(coached, arabic).title).toBe('شارك Sara في sprint challenge');
  });
});

describe('sentences that are not the stored English', () => {
  it('keeps a sentence with an extra word', () => {
    const stored = 'Your club page is now verified';
    const row = notice({ type: 'club_verification_approved', title: stored });
    expect(notificationCopy(row, english).title).toBe(stored);
    expect(notificationCopy(row, arabic).title).toBe(stored);

    const tier = notice({
      type: 'score_tier_up',
      title: 'You reached the Gold tier',
      body: 'Your Talent Score is now 80.',
      data: { tier: 'gold', overall: 80 },
    });
    expect(notificationCopy(tier, arabic).title).toBe('You reached the Gold tier');
    expect(notificationCopy(tier, arabic).body).toBe('Your Talent Score is now 80.');
  });

  it('keeps a sentence whose name is empty or has a space at the edge', () => {
    const empty = ' finished the Game Intelligence games';
    const blank = notice({
      type: 'gi_completed',
      title: empty,
      body: 'Their results are private unless they choose to share them.',
      actor: undefined,
    });
    expect(notificationCopy(blank, english).title).toBe(empty);
    expect(notificationCopy(blank, arabic).title).toBe(empty);
    expect(notificationCopy(blank, arabic).body).toBe(
      'Their results are private unless they choose to share them.',
    );

    const padded = ' Sara registered for Open trial';
    const spaced = notice({ type: 'club_event_registration', title: padded, actor: undefined });
    expect(notificationCopy(spaced, english).title).toBe(padded);
    expect(notificationCopy(spaced, arabic).title).toBe(padded);
  });

  it('keeps a live match when " vs " appears twice', () => {
    const stored = 'Riverside vs Marina vs City is live';
    const row = notice({ type: 'club_match_live', title: stored });
    expect(notificationCopy(row, english).title).toBe(stored);
    expect(notificationCopy(row, arabic).title).toBe(stored);
  });

  it('keeps the stored title when it does not start with the actor', () => {
    const stored = 'Sam finished the Game Intelligence games';
    const row = notice({
      type: 'gi_completed',
      title: stored,
      body: 'Their results are private unless they choose to share them.',
      actor: { full_name: 'Sara', avatar_url: null },
    });
    expect(notificationCopy(row, english).title).toBe(stored);
    expect(notificationCopy(row, arabic).title).toBe(stored);
    expect(notificationCopy(row, arabic).body).toBe(
      'Their results are private unless they choose to share them.',
    );
  });

  it('keeps a tier change when the score data is missing', () => {
    const row = notice({
      type: 'score_tier_up',
      title: 'You reached Gold tier',
      body: 'Your Talent Score is now 80.',
      data: {},
    });
    expect(notificationCopy(row, english).title).toBe('You reached Gold tier');
    expect(notificationCopy(row, arabic).title).toBe('You reached Gold tier');
    expect(notificationCopy(row, arabic).body).toBe('Your Talent Score is now 80.');
  });
});

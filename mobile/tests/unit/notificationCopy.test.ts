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
import { setGlobalTranslator } from '@/lib/i18n-bridge';
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

  it('translates a profile view that names the organisation, in English and Arabic', () => {
    const row = notice({
      type: 'profile_view',
      title: 'Test FC viewed your profile',
      actor: { full_name: 'Sam', avatar_url: null },
      actor_count: 3,
    });
    expect(notificationCopy(row, english).title).toBe('Test FC viewed your profile');
    expect(notificationCopy(row, arabic).title).toBe('شاهد Test FC ملفك');
  });

  it('keeps a profile view when " viewed your profile" appears twice', () => {
    const stored = 'Test FC viewed your profile viewed your profile';
    const row = notice({
      type: 'profile_view',
      title: stored,
      actor: { full_name: 'Sam', avatar_url: null },
    });
    expect(notificationCopy(row, english).title).toBe(stored);
    expect(notificationCopy(row, arabic).title).toBe(stored);
  });

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

  it('translates an accepted meetup, and keeps a note that is not the date line', () => {
    const when = 'Bring a ball';
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

const APPLICATION_STATUSES = [
  'applied',
  'in_review',
  'shortlisted',
  'invited',
  'accepted',
  'rejected',
  'withdrawn',
] as const;

function inLanguage<T>(language: string, run: () => T): T {
  setGlobalTranslator(null, language);
  try {
    return run();
  } finally {
    setGlobalTranslator(null, 'en');
  }
}

/** The phone's zone, for the one test that has to pin a local clock. */
function inZone<T>(zone: string, run: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

describe('applications, coaching, endorsement and sponsorship', () => {
  it('translates an application received, in English and Arabic', () => {
    const row = notice({ type: 'application_received', title: 'Sara applied to Open trial' });
    expect(notificationCopy(row, english).title).toBe('Sara applied to Open trial');
    expect(notificationCopy(row, arabic).title).toBe('تقدّم Sara إلى Open trial');
  });

  it('writes each application status with its label, in English and Arabic', () => {
    for (const status of APPLICATION_STATUSES) {
      const row = notice({
        type: 'application_status',
        title: `Your application to Open trial is now ${status}`,
        data: { status },
        actor: undefined,
      });
      const enLabel = english(`opportunities.status.athlete.${status}`);
      const arLabel = arabic(`opportunities.status.athlete.${status}`);
      expect(notificationCopy(row, english).title).toBe(`Your application to Open trial is now ${enLabel}`);
      expect(notificationCopy(row, arabic).title).toBe(`طلبك إلى Open trial أصبح ${arLabel}`);
    }
    const review = notice({
      type: 'application_status',
      title: 'Your application to Open trial is now in_review',
      data: { status: 'in_review' },
      actor: undefined,
    });
    expect(notificationCopy(review, english).title).toBe('Your application to Open trial is now Being read');
    expect(notificationCopy(review, arabic).title).toBe('طلبك إلى Open trial أصبح قيد القراءة');
  });

  it('keeps an application status when it is not the status on the row', () => {
    const row = notice({
      type: 'application_status',
      title: 'Your application to Open trial is now accepted',
      data: { status: 'rejected' },
      actor: undefined,
    });
    expect(notificationCopy(row, english).title).toBe('Your application to Open trial is now accepted');
    expect(notificationCopy(row, arabic).title).toBe('Your application to Open trial is now accepted');
  });

  it('keeps an application status the opportunity screen does not name', () => {
    const row = notice({
      type: 'application_status',
      title: 'Your application to Open trial is now pending',
      data: { status: 'pending' },
      actor: undefined,
    });
    expect(notificationCopy(row, english).title).toBe('Your application to Open trial is now pending');
    expect(notificationCopy(row, arabic).title).toBe('Your application to Open trial is now pending');
  });

  it('translates an endorsement and keeps the coach’s note', () => {
    const note = 'Best first touch in the group.';
    const row = notice({ type: 'endorsement', title: 'Sara endorsed you for pace', body: note });
    expect(notificationCopy(row, english)).toEqual({ title: 'Sara endorsed you for pace', body: note });
    expect(notificationCopy(row, arabic)).toEqual({ title: 'زكّاك Sara في pace', body: note });
  });

  it('translates a booked session, in English and Arabic', () => {
    const row = notice({ type: 'coaching_booked', title: 'Sara booked Footwork' });
    expect(notificationCopy(row, english).title).toBe('Sara booked Footwork');
    expect(notificationCopy(row, arabic).title).toBe('حجز Sara Footwork');
  });

  it('translates a booking a guardian’s consent cancelled', () => {
    const row = notice({
      type: 'coaching_cancelled',
      title: 'A booking was cancelled by a guardian',
      actor: undefined,
    });
    expect(notificationCopy(row, english).title).toBe('A booking was cancelled by a guardian');
    expect(notificationCopy(row, arabic).title).toBe('ألغى أحد أولياء الأمور حجزًا');
  });

  it('translates a session AceAiX cancelled, and keeps the reason', () => {
    const row = notice({
      type: 'coaching_cancelled',
      title: 'AceAiX cancelled a coaching session: the coach is away',
      actor: undefined,
    });
    expect(notificationCopy(row, english).title).toBe('AceAiX cancelled a coaching session: the coach is away');
    expect(notificationCopy(row, arabic).title).toBe('ألغت AceAiX حصة تدريبية: the coach is away');
  });

  it('translates a dated cancellation as a day and month, not as a session title', () => {
    const row = notice({ type: 'coaching_cancelled', title: 'Sara cancelled the session on 16 Nov' });
    expect(inLanguage('en', () => notificationCopy(row, english).title)).toBe(
      'Sara cancelled the session on November 16',
    );
    expect(inLanguage('ar', () => notificationCopy(row, arabic).title)).toBe('ألغى Sara الحصة في 16 نوفمبر');

    const first = notice({ type: 'coaching_cancelled', title: 'Sara cancelled the session on 01 Nov' });
    expect(inLanguage('en', () => notificationCopy(first, english).title)).toBe(
      'Sara cancelled the session on November 1',
    );
    expect(inLanguage('ar', () => notificationCopy(first, arabic).title)).toBe('ألغى Sara الحصة في 1 نوفمبر');
  });

  it('translates a parent cancelling, and says “a session” in the reader’s language', () => {
    const named = notice({
      type: 'coaching_cancelled',
      title: 'Your parent cancelled Sprint drills',
      actor: { full_name: 'Your parent', avatar_url: null },
    });
    expect(notificationCopy(named, english).title).toBe('Your parent cancelled Sprint drills');
    expect(notificationCopy(named, arabic).title).toBe('ألغى أحد والديك Sprint drills');

    const plain = notice({
      type: 'coaching_cancelled',
      title: 'Your parent cancelled a session',
      actor: { full_name: 'Your parent', avatar_url: null },
    });
    expect(notificationCopy(plain, english).title).toBe('Your parent cancelled a session');
    expect(notificationCopy(plain, arabic).title).toBe('ألغى أحد والديك حصة');
  });

  it('reads a child’s parent before a plain “cancelled” name', () => {
    const row = notice({
      type: 'coaching_cancelled',
      title: "Lina's parent cancelled Sprint drills",
      actor: { full_name: "Lina's parent", avatar_url: null },
    });
    expect(notificationCopy(row, english).title).toBe("Lina's parent cancelled Sprint drills");
    expect(notificationCopy(row, arabic).title).toBe('ألغى والد Lina Sprint drills');

    const plain = notice({
      type: 'coaching_cancelled',
      title: "Lina's parent cancelled a session",
      actor: { full_name: "Lina's parent", avatar_url: null },
    });
    expect(notificationCopy(plain, arabic).title).toBe('ألغى والد Lina حصة');
  });

  it('translates a named cancellation, and “a session”, from the actor’s name', () => {
    const named = notice({ type: 'coaching_cancelled', title: 'Sara cancelled Footwork' });
    expect(notificationCopy(named, english).title).toBe('Sara cancelled Footwork');
    expect(notificationCopy(named, arabic).title).toBe('ألغى Sara Footwork');

    const plain = notice({ type: 'coaching_cancelled', title: 'Sara cancelled a session' });
    expect(notificationCopy(plain, english).title).toBe('Sara cancelled a session');
    expect(notificationCopy(plain, arabic).title).toBe('ألغى Sara حصة');
  });

  it('does not read a dated cancellation as a session, or a parent line as a name, out of order', () => {
    const dated = notice({ type: 'coaching_cancelled', title: 'Sara cancelled the session on 16 Nov' });
    expect(inLanguage('ar', () => notificationCopy(dated, arabic).title)).not.toBe(
      'ألغى Sara the session on 16 Nov',
    );

    const parent = notice({
      type: 'coaching_cancelled',
      title: "Lina's parent cancelled Sprint drills",
      actor: { full_name: "Lina's parent", avatar_url: null },
    });
    expect(notificationCopy(parent, arabic).title).not.toBe("ألغى Lina's parent Sprint drills");
  });

  it('translates a sponsorship offer from a company, for a request and for a child', () => {
    const offer = notice({
      type: 'sponsorship_offer',
      title: 'Nike made a sponsorship offer for summer kit',
      actor: { full_name: 'Sara', avatar_url: null },
    });
    expect(notificationCopy(offer, english).title).toBe('Nike made a sponsorship offer for summer kit');
    expect(notificationCopy(offer, arabic).title).toBe('قدّم Nike عرض رعاية لـ summer kit');

    const child = notice({
      type: 'sponsorship_offer',
      title: 'Nike made a sponsorship offer to your child',
      actor: { full_name: 'Sara', avatar_url: null },
    });
    expect(notificationCopy(child, english).title).toBe('Nike made a sponsorship offer to your child');
    expect(notificationCopy(child, arabic).title).toBe('قدّم Nike عرض رعاية لطفلك');
  });

  it('translates a sponsorship application, including “An athlete” and a child', () => {
    const named = notice({ type: 'sponsorship_application', title: 'Sara applied to Summer kit' });
    expect(notificationCopy(named, english).title).toBe('Sara applied to Summer kit');
    expect(notificationCopy(named, arabic).title).toBe('تقدّم Sara إلى Summer kit');

    const anonymous = notice({
      type: 'sponsorship_application',
      title: 'An athlete applied to Summer kit',
      actor: { full_name: null, avatar_url: null },
    });
    expect(notificationCopy(anonymous, english).title).toBe('An athlete applied to Summer kit');
    expect(notificationCopy(anonymous, arabic).title).toBe('تقدّم رياضي إلى Summer kit');

    const child = notice({
      type: 'sponsorship_application',
      title: 'Your child applied to a sponsorship call: Summer kit',
      actor: { full_name: 'Sara', avatar_url: null },
    });
    expect(notificationCopy(child, english).title).toBe('Your child applied to a sponsorship call: Summer kit');
    expect(notificationCopy(child, arabic).title).toBe('تقدّم طفلك إلى دعوة رعاية: Summer kit');
  });

  it('translates who accepted or declined a sponsorship, in English and Arabic', () => {
    const rows: { title: string; ar: string }[] = [
      { title: 'Sara accepted your sponsorship offer', ar: 'قبل Sara عرض الرعاية الذي قدّمته' },
      { title: 'Sara declined your sponsorship offer', ar: 'رفض Sara عرض الرعاية الذي قدّمته' },
      { title: 'Sara accepted your sponsorship application', ar: 'قبل Sara طلب الرعاية الذي قدّمته' },
      { title: 'Sara declined your sponsorship application', ar: 'رفض Sara طلب الرعاية الذي قدّمته' },
    ];
    for (const row of rows) {
      const stored = notice({ type: 'sponsorship_response', title: row.title });
      expect(notificationCopy(stored, english).title).toBe(row.title);
      expect(notificationCopy(stored, arabic).title).toBe(row.ar);
    }
  });

  it('reads a parent’s sponsorship answer before the same words with a name', () => {
    const rows: { title: string; ar: string }[] = [
      {
        title: "Lina's parent accepted your sponsorship offer",
        ar: 'قبل والد Lina عرض الرعاية الذي قدّمته',
      },
      {
        title: "Lina's parent declined your sponsorship offer",
        ar: 'رفض والد Lina عرض الرعاية الذي قدّمته',
      },
      {
        title: "Lina's parent withdrew the application to your call",
        ar: 'سحب والد Lina الطلب على دعوتك',
      },
    ];
    for (const row of rows) {
      const stored = notice({
        type: 'sponsorship_response',
        title: row.title,
        actor: { full_name: "Lina's parent", avatar_url: null },
      });
      expect(notificationCopy(stored, english).title).toBe(row.title);
      expect(notificationCopy(stored, arabic).title).toBe(row.ar);
      expect(notificationCopy(stored, arabic).title).not.toContain("Lina's parent");
    }
  });

  it('translates what a parent did with a brand, in English and Arabic', () => {
    const rows: { title: string; ar: string }[] = [
      {
        title: 'Your parent accepted the sponsorship offer from Brand Co',
        ar: 'قبل أحد والديك عرض الرعاية من Brand Co',
      },
      {
        title: 'Your parent declined the sponsorship offer from Brand Co',
        ar: 'رفض أحد والديك عرض الرعاية من Brand Co',
      },
      {
        title: 'Your parent withdrew your application to Brand Co',
        ar: 'سحب أحد والديك طلبك إلى Brand Co',
      },
    ];
    for (const row of rows) {
      const stored = notice({ type: 'sponsorship_response', title: row.title, actor: undefined });
      expect(notificationCopy(stored, english).title).toBe(row.title);
      expect(notificationCopy(stored, arabic).title).toBe(row.ar);
    }
  });

  it('translates a guardian’s news that a child’s deal was answered', () => {
    const rows: { title: string; ar: string }[] = [
      {
        title: 'A sponsorship offer for your child was accepted',
        ar: 'قُبل عرض رعاية لطفلك',
      },
      {
        title: 'A sponsorship offer for your child was declined',
        ar: 'رُفض عرض رعاية لطفلك',
      },
      {
        title: 'A sponsorship application for your child was accepted',
        ar: 'قُبل طلب رعاية لطفلك',
      },
      {
        title: 'A sponsorship application for your child was declined',
        ar: 'رُفض طلب رعاية لطفلك',
      },
    ];
    for (const row of rows) {
      const stored = notice({ type: 'sponsorship_response', title: row.title, actor: undefined });
      expect(notificationCopy(stored, english).title).toBe(row.title);
      expect(notificationCopy(stored, arabic).title).toBe(row.ar);
    }
  });
});

describe('meetup place and time', () => {
  it('rewrites the stored UTC line in the phone’s zone, in English and Arabic', () => {
    inZone('Asia/Dubai', () => {
      for (const type of ['meetup_accepted', 'meetup_cancelled'] as const) {
        const title = type === 'meetup_accepted' ? 'You are in: Tuesday kickabout' : 'Tuesday kickabout was called off';
        const row = notice({
          type,
          title,
          body: 'Dubai · Nov 16, 18:00',
          created_at: '2026-09-04T10:00:00Z',
          actor: undefined,
        });
        expect(inLanguage('en', () => notificationCopy(row, english).body)).toBe('Dubai · Mon, Nov 16, 10:00 PM');
        expect(inLanguage('ar', () => notificationCopy(row, arabic).body)).toBe('Dubai · الاثنين، 16 نوفمبر، 10:00 م');
      }
    });
  });

  it('picks the year that sits closest to the notice, including across New Year', () => {
    inZone('Asia/Dubai', () => {
      const after = notice({
        type: 'meetup_accepted',
        title: 'You are in: Tuesday kickabout',
        body: 'Dubai · Dec 31, 20:00',
        created_at: '2026-01-01T02:00:00Z',
        actor: undefined,
      });
      // 31 Dec 2025 20:00 UTC is 1 Jan locally, and a Thursday. The next December is a Friday.
      expect(inLanguage('en', () => notificationCopy(after, english).body)).toBe('Dubai · Thu, Jan 1, 12:00 AM');
      expect(inLanguage('ar', () => notificationCopy(after, arabic).body)).toBe('Dubai · الخميس، 1 يناير، 12:00 ص');

      const before = notice({
        type: 'meetup_cancelled',
        title: 'Tuesday kickabout was called off',
        body: 'Dubai · Jan 1, 03:00',
        created_at: '2025-12-31T10:00:00Z',
        actor: undefined,
      });
      expect(inLanguage('en', () => notificationCopy(before, english).body)).toBe('Dubai · Thu, Jan 1, 7:00 AM');
      expect(inLanguage('ar', () => notificationCopy(before, arabic).body)).toBe('Dubai · الخميس، 1 يناير، 7:00 ص');
    });
  });
});

describe('sentences that are slightly different', () => {
  it('keeps an application, a cancellation and an offer that are not the stored sentence', () => {
    const rows = [
      notice({ type: 'application_received', title: 'Sara applied for Open trial' }),
      notice({ type: 'application_received', title: 'Sam applied to Open trial' }),
      notice({
        type: 'application_status',
        title: 'Your application to Open trial is currently accepted',
        data: { status: 'accepted' },
        actor: undefined,
      }),
      notice({ type: 'endorsement', title: 'Sara endorsed you on pace' }),
      notice({ type: 'coaching_booked', title: 'Sara has booked Footwork' }),
      notice({ type: 'coaching_cancelled', title: 'Sara has cancelled the session on 16 Nov' }),
      notice({
        type: 'coaching_cancelled',
        title: 'A booking was cancelled by the guardian',
        actor: undefined,
      }),
      notice({
        type: 'sponsorship_offer',
        title: 'Nike made a sponsorship offer about summer kit',
        actor: undefined,
      }),
      notice({
        type: 'sponsorship_response',
        title: 'Sara has accepted your sponsorship offer',
      }),
      notice({
        type: 'sponsorship_application',
        title: 'Your child registered for a sponsorship call: Summer kit',
        actor: undefined,
      }),
    ];
    for (const row of rows) {
      expect(notificationCopy(row, english).title).toBe(row.title);
      expect(notificationCopy(row, arabic).title).toBe(row.title);
    }
  });

  it('keeps a meetup line that is not the stored UTC date', () => {
    const bodies = ['Dubai · November 16, 18:00', 'Dubai · Nov 16, 24:00', ' Dubai · Nov 16, 18:00'];
    for (const body of bodies) {
      const row = notice({
        type: 'meetup_accepted',
        title: 'You are in: Tuesday kickabout',
        body,
        actor: undefined,
      });
      expect(notificationCopy(row, english).body).toBe(body);
      expect(notificationCopy(row, arabic).body).toBe(body);
    }
  });
});

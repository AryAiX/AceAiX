import { describe, expect, it } from 'vitest';

import type { ClubPage } from '@/lib/api.club';
import {
  basicsErrors,
  clubMapOpenUrl,
  contactErrors,
  contactPatch,
  draftFromPage,
  emptyDraft,
  clubRoleEnglish,
  clubRoleFromTitle,
  emptyVerification,
  firstIncompleteStep,
  formatPin,
  looksLikeWebsite,
  mapUrl,
  parseFoundedYear,
  parseMapLocation,
  readMapPin,
  sportsPatch,
  toggleCategory,
  toggleSport,
  verificationFromPage,
  whereErrors,
  wherePatch,
  withAccountContactName,
  withCatalogueCities,
} from '@/lib/clubSetup';

const NOW = new Date(2026, 9, 14);

describe('parseMapLocation', () => {
  it('reads plain "lat, lng"', () => {
    expect(parseMapLocation('25.2236, 55.3348')).toEqual({ latitude: 25.2236, longitude: 55.3348 });
    expect(parseMapLocation('  -33.86 151.2093 ')).toEqual({ latitude: -33.86, longitude: 151.2093 });
  });

  it('reads Google Maps links', () => {
    expect(
      parseMapLocation('https://www.google.com/maps/place/Dubai/@25.2048493,55.2707828,12z/data=x'),
    ).toEqual({ latitude: 25.204849, longitude: 55.270783 });
    expect(parseMapLocation('https://maps.google.com/?q=25.2236,55.3348')).toEqual({
      latitude: 25.2236,
      longitude: 55.3348,
    });
    expect(
      parseMapLocation('https://www.google.com/maps/search/?api=1&query=25.1%2C55.2'),
    ).toEqual({ latitude: 25.1, longitude: 55.2 });
  });

  it('prefers the place pin over the camera position', () => {
    expect(
      parseMapLocation('https://www.google.com/maps/place/X/@25.0,55.0,15z/data=!3m1!4b1!4m6!3m5!3d25.2236!4d55.3348'),
    ).toEqual({ latitude: 25.2236, longitude: 55.3348 });
  });

  it('reads Apple Maps links', () => {
    expect(parseMapLocation('https://maps.apple.com/?ll=25.2236,55.3348&q=Pitch')).toEqual({
      latitude: 25.2236,
      longitude: 55.3348,
    });
    expect(parseMapLocation('https://maps.apple.com/?address=X&coordinate=24.45,54.37')).toEqual({
      latitude: 24.45,
      longitude: 54.37,
    });
  });

  it('refuses short links, nonsense and out-of-range values', () => {
    expect(parseMapLocation('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(parseMapLocation('Al Jadaf, Dubai')).toBeNull();
    expect(parseMapLocation('95, 55')).toBeNull();
    expect(parseMapLocation('25, 190')).toBeNull();
    expect(parseMapLocation('0, 0')).toBeNull();
    expect(parseMapLocation('')).toBeNull();
    expect(parseMapLocation(null)).toBeNull();
  });

  it('reads a place pin, an @ position, plain coordinates, and a consent continue link', () => {
    expect(
      parseMapLocation(
        'https://www.google.com/maps/place/X/@25.0,55.0,15z/data=!3m1!4b1!4m6!3m5!3d25.2236!4d55.3348',
      ),
    ).toEqual({ latitude: 25.2236, longitude: 55.3348 });
    expect(parseMapLocation('https://www.google.com/maps/@25.2048493,55.2707828,12z')).toEqual({
      latitude: 25.204849,
      longitude: 55.270783,
    });
    expect(parseMapLocation('25.2236, 55.3348')).toEqual({ latitude: 25.2236, longitude: 55.3348 });

    const inner = 'https://www.google.com/maps/place/Dubai/@25.2048493,55.2707828,12z';
    const consent = `https://consent.google.com/ml?continue=${encodeURIComponent(inner)}&gl=DE`;
    expect(parseMapLocation(consent)).toEqual({ latitude: 25.204849, longitude: 55.270783 });
  });

  it('formats a pin and a map link', () => {
    expect(formatPin(25.22361, 55.33479)).toBe('25.2236, 55.3348');
    expect(mapUrl({ latitude: 25.2, longitude: 55.3 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.2,55.3',
    );
  });
});

describe('readMapPin', () => {
  const base = { ...emptyDraft(), country: 'UAE', city: 'Dubai' };

  it('stores coordinates and clears the link', () => {
    expect(readMapPin('25.2236, 55.3348')).toEqual({
      latitude: 25.2236,
      longitude: 55.3348,
      mapUrl: null,
    });
    const patch = wherePatch({ ...base, pin: '25.2236, 55.3348' });
    expect(patch.latitude).toBe(25.2236);
    expect(patch.longitude).toBe(55.3348);
    expect(whereErrors({ ...base, pin: '25.2236, 55.3348' })).toEqual({});
  });

  it('keeps a short map link and does not invent coordinates', () => {
    const link = 'https://maps.app.goo.gl/abc123';
    expect(readMapPin(link)).toEqual({ latitude: null, longitude: null, mapUrl: link });
    const patch = wherePatch({ ...base, pin: link });
    expect(patch.latitude).toBeNull();
    expect(patch.longitude).toBeNull();
    expect(whereErrors({ ...base, pin: link })).toEqual({});
  });

  it('keeps a Google link and the coordinates in it', () => {
    const link = 'https://www.google.com/maps/@25.2048493,55.2707828,12z';
    expect(readMapPin(link)).toEqual({
      latitude: 25.204849,
      longitude: 55.270783,
      mapUrl: link,
    });
    const patch = wherePatch({ ...base, pin: link });
    expect(patch.latitude).toBe(25.204849);
    expect(patch.longitude).toBe(55.270783);
  });

  it('refuses a link that is not a map', () => {
    expect(readMapPin('https://example.com')).toBeNull();
    expect(whereErrors({ ...base, pin: 'https://example.com' })).toEqual({ pin: true });
  });

  it('clears coordinates and the link when the field is empty', () => {
    expect(readMapPin('')).toEqual({ latitude: null, longitude: null, mapUrl: null });
    expect(readMapPin('   ')).toEqual({ latitude: null, longitude: null, mapUrl: null });
    expect(whereErrors({ ...base, pin: '' })).toEqual({});
    const patch = wherePatch({ ...base, pin: '' });
    expect(patch.latitude).toBeNull();
    expect(patch.longitude).toBeNull();
  });

  it('opens the saved link, then the pin, then a search for the address', () => {
    const link = 'https://maps.app.goo.gl/abc123';
    expect(
      clubMapOpenUrl({ mapUrl: link, latitude: 25.2, longitude: 55.3, address: 'Al Jadaf', city: 'Dubai' }),
    ).toBe(link);
    expect(clubMapOpenUrl({ mapUrl: null, latitude: 25.2, longitude: 55.3, address: 'Al Jadaf' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.2,55.3',
    );
    expect(
      clubMapOpenUrl({
        mapUrl: null,
        latitude: null,
        longitude: null,
        address: 'Al Jadaf',
        city: 'Dubai',
        country: 'UAE',
      }),
    ).toBe('https://www.google.com/maps/search/?api=1&query=Al%20Jadaf%2C%20Dubai%2C%20UAE');
  });
});

describe('verification role', () => {
  it('stores a preset as its English label and reads it back onto that chip', () => {
    expect(clubRoleEnglish('sporting_director')).toBe('Sporting director');
    expect(clubRoleEnglish('head_of_youth_development')).toBe('Head of youth development');
    expect(clubRoleFromTitle('Academy director')).toEqual({ role: 'academy_director', custom: '' });
    expect(clubRoleFromTitle('  Club administrator  ')).toEqual({ role: 'club_administrator', custom: '' });
  });

  it('keeps a custom role on Other, and an empty field as nothing chosen', () => {
    expect(clubRoleFromTitle('General manager')).toEqual({ role: 'other', custom: 'General manager' });
    expect(clubRoleFromTitle('Other club role')).toEqual({ role: 'other', custom: 'Other club role' });
    expect(clubRoleFromTitle('')).toEqual({ role: null, custom: '' });
    expect(clubRoleFromTitle('   ')).toEqual({ role: null, custom: '' });
  });
});

describe('checks', () => {
  it('validates the founded year', () => {
    expect(parseFoundedYear('1998', NOW)).toBe(1998);
    expect(parseFoundedYear('2026', NOW)).toBe(2026);
    expect(parseFoundedYear('2027', NOW)).toBeNull();
    expect(parseFoundedYear('1799', NOW)).toBeNull();
    expect(parseFoundedYear('98', NOW)).toBeNull();
  });

  it('requires name, year and CEO', () => {
    expect(basicsErrors(emptyDraft(), NOW)).toEqual({ name: true, year: true, ceo: true });
    expect(
      basicsErrors({ ...emptyDraft(), name: 'Al Jadaf FC', founded_year: '2001', ceo_name: 'Sara A' }, NOW),
    ).toEqual({});
  });

  it('requires a country and city, and a readable pin when one is given', () => {
    const base = { ...emptyDraft(), country: 'UAE', city: 'Dubai' };
    expect(whereErrors(base)).toEqual({});
    expect(whereErrors({ ...base, pin: 'somewhere' })).toEqual({ pin: true });
    expect(whereErrors(emptyDraft())).toEqual({ country: true, city: true });
  });

  it('only checks contact fields that are filled', () => {
    expect(contactErrors(emptyDraft())).toEqual({});
    expect(
      contactErrors({ ...emptyDraft(), contact_email: 'nope', contact_phone: 'abc', website: 'no site' }),
    ).toEqual({ email: true, phone: true, website: true });
    expect(looksLikeWebsite('https://club.ae/about')).toBe(true);
    expect(looksLikeWebsite('club.ae')).toBe(true);
    expect(looksLikeWebsite('club')).toBe(false);
  });
});

describe('patches', () => {
  it('sends the pin and the non-empty branches', () => {
    const patch = wherePatch({
      ...emptyDraft(),
      country: 'UAE',
      city: ' Dubai ',
      pin: '25.2236, 55.3348',
      branches: [
        { key: 'a', label: 'North pitch', city: 'Sharjah', address: '', country: null, latitude: null, longitude: null },
        { key: 'b', label: ' ', city: '', address: '', country: null, latitude: null, longitude: null },
      ],
    });
    expect(patch.city).toBe('Dubai');
    expect(patch.latitude).toBe(25.2236);
    expect(patch.locations).toEqual([
      { label: 'North pitch', city: 'Sharjah', address: null, country: 'UAE', latitude: null, longitude: null },
    ]);
  });

  it('stores the catalogue spelling of each city and leaves an empty one empty', async () => {
    const calls: [string, string][] = [];
    const next = await withCatalogueCities(
      {
        ...emptyDraft(),
        country: 'UAE',
        city: ' dubai ',
        branches: [
          { key: 'a', label: 'North', city: 'Sharjah', address: '', country: null, latitude: null, longitude: null },
          { key: 'b', label: 'Away', city: ' muscat ', address: '', country: 'Oman', latitude: null, longitude: null },
          { key: 'c', label: 'Empty', city: '  ', address: '', country: 'UAE', latitude: null, longitude: null },
        ],
      },
      async (country, name) => {
        calls.push([country, name]);
        return name === 'dubai' ? 'Dubai' : name;
      },
    );
    expect(calls).toEqual([
      ['UAE', 'dubai'],
      ['UAE', 'Sharjah'],
      ['Oman', 'muscat'],
    ]);
    expect(next.city).toBe('Dubai');
    expect(next.branches.map((b) => b.city)).toEqual(['Sharjah', 'muscat', '']);
    expect(wherePatch(next).city).toBe('Dubai');
    expect(wherePatch(next).locations?.map((l) => l.city)).toEqual(['Sharjah', 'muscat', null]);
  });

  it('cleans categories and keeps other socials', () => {
    let sports = toggleSport([], 'Football');
    sports = toggleCategory(sports, 'Football', 'U14');
    sports = toggleCategory(sports, 'Football', ' u14 ');
    sports = toggleCategory(sports, 'Football', 'U9 girls');
    expect(sportsPatch({ ...emptyDraft(), sports }).sports).toEqual([
      { sport: 'Football', categories: ['U9 girls'] },
    ]);
    expect(toggleSport(sports, 'Football')).toEqual([]);

    const patch = contactPatch({
      ...emptyDraft(),
      contact_email: ' Info@Club.AE ',
      socials: { instagram: '@club', x: '  ', linkedin: 'club-co' },
      facilities: ['Gym', 'gym', ' '],
    });
    expect(patch.contact_email).toBe('info@club.ae');
    expect(patch.socials).toEqual({ instagram: '@club', linkedin: 'club-co' });
    expect(patch.facilities).toEqual(['Gym']);
  });
});

describe('resuming', () => {
  const page = (over: Partial<ClubPage['organization']> = {}, rest: Partial<ClubPage> = {}): ClubPage =>
    ({
      organization: {
        id: 'o1',
        name: 'Al Jadaf FC',
        name_local: null,
        type: 'academy',
        logo_url: null,
        cover_url: null,
        description: null,
        country: null,
        city: null,
        address: null,
        latitude: null,
        longitude: null,
        website: null,
        contact_email: null,
        contact_phone: null,
        socials: {},
        facilities: [],
        league: null,
        founded_year: 2001,
        ceo_name: 'Sara A',
        about_story: null,
        mission: null,
        philosophy: null,
        is_verified: false,
        verification_status: 'pending',
        followers_count: 0,
        primary_color: null,
        ...over,
      },
      sports: [],
      locations: [],
      viewer: {} as ClubPage['viewer'],
      verification: null,
      story: null,
      live_match: null,
      next_match: null,
      counts: { posts: 0, awards: 0, players: 0, open_events: 0, open_challenges: 0 },
      ...rest,
    }) as ClubPage;

  it('starts at the first step that is missing something', () => {
    expect(firstIncompleteStep(page())).toBe('where');
    expect(firstIncompleteStep(page({ country: 'UAE', city: 'Dubai' }))).toBe('sports');
    const withSports = { sports: [{ sport: 'Football', categories: [] }] };
    expect(firstIncompleteStep(page({ country: 'UAE', city: 'Dubai' }, withSports))).toBe('contact');
    expect(
      firstIncompleteStep(
        page({ country: 'UAE', city: 'Dubai', description: 'Hi', logo_url: 'x' }, withSports),
      ),
    ).toBe('verify');
  });

  it('prefills the draft from the page', () => {
    const draft = draftFromPage(
      page({ latitude: 25.2236, longitude: 55.3348 }, {
        locations: [
          { id: 'p', label: null, address: null, city: 'Dubai', country: 'UAE', latitude: null, longitude: null, is_primary: true },
          { id: 'l2', label: 'Grounds', address: null, city: 'Sharjah', country: 'UAE', latitude: null, longitude: null, is_primary: false },
        ],
      }),
    );
    expect(draft.type).toBe('academy');
    expect(draft.founded_year).toBe('2001');
    expect(draft.pin).toBe('25.2236, 55.3348');
    expect(draft.branches.map((b) => b.label)).toEqual(['Grounds']);
    expect(
      draftFromPage(page({ latitude: 25.2236, longitude: 55.3348 }), 'https://maps.app.goo.gl/abc123').pin,
    ).toBe('https://maps.app.goo.gl/abc123');
  });

  it('fills a blank verification name from the account and keeps a saved one', () => {
    const fromParts = { full_name: '  ', first_name: 'Sara', last_name: 'Hassan' };
    expect(withAccountContactName(emptyVerification(), fromParts).contact_person_name).toBe('Sara Hassan');
    expect(
      withAccountContactName(emptyVerification(), {
        full_name: 'Noura K',
        first_name: 'Sara',
        last_name: 'Hassan',
      }).contact_person_name,
    ).toBe('Noura K');

    const saved = verificationFromPage(
      page(
        {},
        {
          verification: {
            license_number: null,
            has_document: false,
            contact_person_name: 'Club Secretary',
            contact_person_title: null,
            terms_accepted: false,
            submitted_at: null,
            review_note: null,
          },
        },
      ),
    );
    expect(withAccountContactName(saved, fromParts).contact_person_name).toBe('Club Secretary');
  });
});

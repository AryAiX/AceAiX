/**
 * AceAiX demo seed. Idempotent: wipes @aceaix.demo users + content tables, then reseeds.
 * Run: SB_URL=... SB_SVC=<service_role> node scripts/seed.mjs
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SB_URL;
const SVC = process.env.SB_SVC;
if (!URL || !SVC) { console.error('Set SB_URL and SB_SVC'); process.exit(1); }
const db = createClient(URL, SVC, { auth: { persistSession: false } });
const PW = 'demo123456';

const pexels = {
  cover: 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1400',
  stadium: 'https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&w=1400',
  clip1: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg?auto=compress&cs=tinysrgb&w=600',
  clip2: 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=600',
  clip3: 'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=600',
  clip4: 'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=600',
};
const avatar = (n) => `https://i.pravatar.cc/300?img=${n}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function clear(table, keyCol = 'id', sentinel = '00000000-0000-0000-0000-000000000000') {
  const { error } = await db.from(table).delete().neq(keyCol, sentinel);
  if (error) console.warn(`clear ${table}: ${error.message}`);
}

async function wipe() {
  console.log('Wiping demo data…');
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.warn(error.message); break; }
    const demos = data.users.filter((u) => (u.email || '').endsWith('@aceaix.demo'));
    for (const u of demos) await db.auth.admin.deleteUser(u.id);
    if (data.users.length < 200) break;
    page++;
  }
  for (const t of ['profile_views', 'posts', 'opportunities', 'verification_requests', 'medical_partners', 'success_stories', 'organizations']) await clear(t);
  await clear('cms_content', 'key', '__none__');
}

async function createUser(email, fullName, role) {
  const { data, error } = await db.auth.admin.createUser({
    email, password: PW, email_confirm: true, user_metadata: { full_name: fullName, role },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const id = data.user.id;
  // trigger clamps elevated roles; force the real role + verification server-side
  await db.from('user_profiles').update({ role, is_verified: true }).eq('id', id);
  // the signup trigger creates an athlete_profiles row for clamped roles; drop it for non-athletes
  if (role !== 'athlete') await db.from('athlete_profiles').delete().eq('user_id', id);
  return id;
}

const ATTR_LABELS = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physical'];
function buildAttributes(base, endorsers) {
  return ATTR_LABELS.map((label, i) => ({
    label,
    value: Math.max(45, Math.min(97, base + rint(-12, 8) + (i === 4 ? -25 : 0))),
    endorsements: rint(4, 35),
    topEndorser: pick(endorsers),
    topEndorserVerified: Math.random() > 0.4,
  }));
}
function buildTrajectory(peak) {
  const seasons = ['20/21', '21/22', '22/23', '23/24', '24/25', '25/26', '26/27'];
  return seasons.map((season, i) => {
    const score = +(6 + (peak - 6) * (i / 4)).toFixed(1);
    return i <= 4 ? { season, score: Math.min(score, peak) } : { season, forecast: +(peak + (i - 4) * 0.3).toFixed(1) };
  });
}

// ── Organizations (clubs/federations/academies) ──────────────
const ORGS = [
  { name: 'Al Wasl SC', short_name: 'Al Wasl', initials: 'AW', type: 'club', league: 'UAE Pro League', city: 'Dubai', country: 'UAE', stadium: 'Zabeel Stadium', stadium_capacity: 12000, primary_color: '#F5A623', secondary_color: '#0C1A2B', founded_year: 1960, followers_count: 124000, is_verified: true, verification_status: 'approved',
    description: 'One of the most storied clubs in the UAE Pro League, Al Wasl SC blends academy-driven development with elite-level competition.',
    values: ['Youth Development', 'Attacking Football', 'Community First'],
    profile: { trophies: [{ title: 'UAE Pro League', count: 8 }, { title: 'UAE Super Cup', count: 3 }, { title: 'League Cup', count: 2 }], currentSeason: [{ label: 'League Position', value: '2nd' }, { label: 'Goals Scored', value: 54 }, { label: 'Clean Sheets', value: 11 }, { label: 'Win Rate', value: '68%' }], coachingStaff: [{ name: 'Ricardo Mendes', role: 'Head Coach' }, { name: 'Ibrahim Al-Farsi', role: 'Assistant' }] } },
  { name: 'Al Ain FC', short_name: 'Al Ain', initials: 'AA', type: 'club', league: 'UAE Pro League', city: 'Al Ain', country: 'UAE', stadium: 'Hazza bin Zayed', stadium_capacity: 25000, primary_color: '#8B2BE2', secondary_color: '#ffffff', founded_year: 1968, followers_count: 210000, is_verified: true, verification_status: 'approved',
    description: 'AFC Champions League winners and a perennial UAE powerhouse with one of the region\u2019s best academies.',
    values: ['Excellence', 'Continental Ambition', 'Academy Pathway'],
    profile: { trophies: [{ title: 'UAE Pro League', count: 14 }, { title: 'AFC Champions League', count: 1 }], currentSeason: [{ label: 'League Position', value: '1st' }, { label: 'Goals Scored', value: 61 }], coachingStaff: [{ name: 'Hernan Crespo', role: 'Head Coach' }] } },
  { name: 'Shabab Al Ahli', short_name: 'Shabab', initials: 'SA', type: 'club', league: 'UAE Pro League', city: 'Dubai', country: 'UAE', primary_color: '#EF5350', secondary_color: '#ffffff', founded_year: 2017, followers_count: 98000, is_verified: true, verification_status: 'approved', description: 'Dubai-based club with a strong youth pipeline.', values: ['Discipline', 'Growth'], profile: {} },
  { name: 'Sharjah FC', short_name: 'Sharjah', initials: 'SH', type: 'club', league: 'UAE Pro League', city: 'Sharjah', country: 'UAE', primary_color: '#1FB57A', secondary_color: '#ffffff', founded_year: 1966, followers_count: 76000, is_verified: true, verification_status: 'approved', description: 'The King of the league, known for resilient, organized football.', values: ['Resilience'], profile: {} },
  { name: 'UAE Football Academy', short_name: 'UAE Academy', initials: 'UA', type: 'academy', league: 'Youth Development', city: 'Abu Dhabi', country: 'UAE', primary_color: '#2F80ED', secondary_color: '#B8F135', founded_year: 2008, followers_count: 34000, is_verified: false, verification_status: 'approved', description: 'National youth development academy producing the next generation of talent.', values: ['Development', 'Education'], profile: {} },
  { name: 'UAE Football Association', short_name: 'UAE FA', initials: 'FA', type: 'federation', league: 'Governing Body', city: 'Abu Dhabi', country: 'UAE', primary_color: '#0C1A2B', secondary_color: '#B8F135', founded_year: 1971, followers_count: 410000, is_verified: true, verification_status: 'approved', description: 'The governing body of football in the United Arab Emirates.', values: ['Integrity', 'Growth'], profile: {} },
];

// ── Athletes ─────────────────────────────────────────────────
const ATHLETES = [
  { email: 'karim@aceaix.demo', name: 'Karim Al-Hassan', sport: 'Football', position: 'Striker', club: 'Al Wasl SC', nat: 'Emirati', country: 'UAE', city: 'Dubai', level: 'professional', score: 92, perf: 94, fit: 97, foot: 'Right', h: 181, w: 76, av: 12, verified: true, followers: 12847, conns: 483,
    bio: 'Professional striker with six seasons in the UAE Pro League and senior international caps. Clinical finisher, strong in the air, relentless presser. Seeking a top-flight European or Asian challenge.' },
  { email: 'yousef@aceaix.demo', name: 'Yousef Al-Amri', sport: 'Football', position: 'Striker', club: 'Al Jazira FC', nat: 'Emirati', country: 'UAE', city: 'Abu Dhabi', level: 'professional', score: 88, perf: 86, fit: 90, foot: 'Right', h: 184, w: 78, av: 13, verified: true, followers: 8400, conns: 320, bio: 'Powerful centre-forward and aerial threat.' },
  { email: 'omar@aceaix.demo', name: 'Omar Abdulrahman Jr.', sport: 'Football', position: 'Attacking Midfielder', club: 'Al Ain FC', nat: 'Emirati', country: 'UAE', city: 'Al Ain', level: 'professional', score: 90, perf: 91, fit: 84, foot: 'Left', h: 176, w: 70, av: 14, verified: true, followers: 15200, conns: 540, bio: 'Creative playmaker with elite vision and set-piece delivery.' },
  { email: 'rashid@aceaix.demo', name: 'Rashid Al-Mansoori', sport: 'Football', position: 'Winger', club: 'Sharjah FC', nat: 'Emirati', country: 'UAE', city: 'Sharjah', level: 'semi-pro', score: 82, perf: 80, fit: 88, foot: 'Right', h: 174, w: 68, av: 15, verified: false, followers: 3100, conns: 180, bio: 'Direct, pacey right winger who loves to take on defenders.' },
  { email: 'ahmed@aceaix.demo', name: 'Ahmed Khalfan', sport: 'Football', position: 'Centre Back', club: 'Shabab Al Ahli', nat: 'Emirati', country: 'UAE', city: 'Dubai', level: 'professional', score: 85, perf: 84, fit: 89, foot: 'Right', h: 188, w: 82, av: 16, verified: true, followers: 5600, conns: 260, bio: 'Commanding central defender, strong in duels and build-up.' },
  { email: 'salem@aceaix.demo', name: 'Salem Rashid', sport: 'Football', position: 'Goalkeeper', club: 'Al Ain FC', nat: 'Emirati', country: 'UAE', city: 'Al Ain', level: 'professional', score: 83, perf: 82, fit: 86, foot: 'Right', h: 191, w: 84, av: 17, verified: true, followers: 4200, conns: 210, bio: 'Shot-stopper with excellent reflexes and distribution.' },
  { email: 'hassan@aceaix.demo', name: 'Hassan Al-Naqbi', sport: 'Football', position: 'Defensive Midfielder', club: 'Sharjah FC', nat: 'Emirati', country: 'UAE', city: 'Sharjah', level: 'semi-pro', score: 79, perf: 78, fit: 83, foot: 'Right', h: 179, w: 74, av: 18, verified: false, followers: 1900, conns: 120, bio: 'Tenacious ball-winner who breaks up play and recycles possession.' },
  { email: 'fatima@aceaix.demo', name: 'Fatima Al-Zaabi', sport: 'Football', position: 'Midfielder', club: 'UAE Football Academy', nat: 'Emirati', country: 'UAE', city: 'Abu Dhabi', level: 'amateur', score: 77, perf: 76, fit: 80, foot: 'Left', h: 168, w: 60, av: 5, verified: false, followers: 2400, conns: 140, bio: 'Rising academy midfielder with a bright future in the national setup.' },
  { email: 'noura@aceaix.demo', name: 'Noura Saeed', sport: 'Football', position: 'Forward', club: 'UAE Football Academy', nat: 'Emirati', country: 'UAE', city: 'Abu Dhabi', level: 'amateur', score: 75, perf: 74, fit: 82, foot: 'Right', h: 165, w: 58, av: 9, verified: false, followers: 1600, conns: 90, bio: 'Quick, instinctive forward developing through the youth ranks.' },
  { email: 'tariq@aceaix.demo', name: 'Tariq Hassan', sport: 'Football', position: 'Right Back', club: 'Al Wasl SC', nat: 'Emirati', country: 'UAE', city: 'Dubai', level: 'professional', score: 81, perf: 80, fit: 87, foot: 'Right', h: 177, w: 72, av: 33, verified: true, followers: 3800, conns: 200, bio: 'Modern full-back combining defensive solidity with overlapping runs.' },
  { email: 'khalid@aceaix.demo', name: 'Khalid Al-Rashidi', sport: 'Football', position: 'Left Winger', club: 'Al Jazira FC', nat: 'Emirati', country: 'UAE', city: 'Abu Dhabi', level: 'semi-pro', score: 80, perf: 79, fit: 85, foot: 'Right', h: 173, w: 67, av: 51, verified: false, followers: 2700, conns: 160, bio: 'Inverted left winger with an eye for goal.' },
  { email: 'majed@aceaix.demo', name: 'Majed Al-Owais', sport: 'Football', position: 'Centre Forward', club: 'Shabab Al Ahli', nat: 'Emirati', country: 'UAE', city: 'Dubai', level: 'professional', score: 86, perf: 87, fit: 88, foot: 'Both', h: 186, w: 80, av: 60, verified: true, followers: 6900, conns: 300, bio: 'Two-footed target man with a strong scoring record.' },
];

const SCOUTS = [
  { email: 'scout@aceaix.demo', name: 'Sergio Mendes', org: 'Al Ain FC', av: 52, role: 'scout' },
  { email: 'james@aceaix.demo', name: 'James Crawford', org: 'Sharjah FC', av: 53, role: 'scout' },
];
const COACHES = [
  { email: 'ricardo@aceaix.demo', name: 'Ricardo Mendes', av: 59 },
];

async function main() {
  await wipe();

  console.log('Seeding organizations…');
  const orgIds = {};
  for (const o of ORGS) {
    const { data, error } = await db.from('organizations').insert(o).select('id,name').single();
    if (error) throw new Error(`org ${o.name}: ${error.message}`);
    orgIds[o.name] = data.id;
  }

  console.log('Seeding users…');
  const adminId = await createUser('admin@aceaix.demo', 'Layla Ahmed', 'admin');
  await db.from('user_profiles').update({ avatar_url: avatar(45), city: 'Dubai', country: 'UAE', bio: 'Platform administrator.' }).eq('id', adminId);

  const medId = await createUser('medical@aceaix.demo', 'Dr. Yousuf Rahimi', 'medical_partner');
  await db.from('user_profiles').update({ avatar_url: avatar(68), city: 'Dubai', country: 'UAE', bio: 'Sports physician, Dubai Sports Medicine Centre.' }).eq('id', medId);
  const { data: mp } = await db.from('medical_partners').insert({
    user_id: medId, organization_id: null, name: 'Dubai Sports Medicine Centre', license_number: 'DHA-SM-2231', accreditation_status: 'approved', commission_rate: 12.5,
  }).select('id').single();
  const partnerId = mp.id;

  // Neutral test login for the athlete app. Keep this account unseeded so logging
  // into athlete@aceaix.demo looks like a fresh athlete, not a named portfolio.
  const neutralAthleteId = await createUser('athlete@aceaix.demo', 'Fresh Athlete', 'athlete');
  await db.from('user_profiles').update({
    avatar_url: null,
    city: null,
    country: null,
    bio: null,
    is_verified: false,
    subscription_tier: 'free',
  }).eq('id', neutralAthleteId);
  await db.from('athlete_profiles').update({
    sport: 'Football',
    position: null,
    position_primary: null,
    positions: [],
    nationality: null,
    dominant_foot: null,
    height_cm: null,
    weight_kg: null,
    level: 'amateur',
    current_club: null,
    current_club_id: null,
    bio: null,
    cover_url: null,
    is_open_to_offers: false,
    visibility_score: 0,
    performance_score: 0,
    fitness_score: 0,
    profile_completeness: 0,
    followers_count: 0,
    connections_count: 0,
    birth_date: null,
    attributes: [],
    trajectory: [],
    academy: [],
    certifications: [],
    honors: [],
    languages: [],
    following: [],
    analytics: {},
  }).eq('user_id', neutralAthleteId);

  const scoutIds = {};
  for (const s of SCOUTS) {
    const id = await createUser(s.email, s.name, s.role);
    await db.from('user_profiles').update({ avatar_url: avatar(s.av), city: 'Abu Dhabi', country: 'UAE', subscription_tier: 'elite', bio: `Talent scout at ${s.org}.` }).eq('id', id);
    await db.from('scout_profiles').upsert({ user_id: id, organization_id: orgIds[s.org] ?? null, verification_status: 'approved', credentials: 'AFC Licensed Scout', contact_quota_limit: 100, contact_quota_used: rint(5, 40) }, { onConflict: 'user_id' });
    scoutIds[s.email] = id;
  }
  const endorserNames = [...SCOUTS.map((s) => s.name), ...COACHES.map((c) => c.name), 'Coach Al-Rashidi', 'Team Analyst'];

  console.log('Seeding coaches…');
  for (const c of COACHES) {
    const id = await createUser(c.email, c.name, 'coach');
    await db.from('user_profiles').update({ avatar_url: avatar(c.av), city: 'Dubai', country: 'UAE', bio: 'UEFA Pro Licensed Head Coach.' }).eq('id', id);
    await db.from('coach_profiles').upsert({
      user_id: id, specialty: 'Attacking Football', current_club: 'Al Wasl SC', current_club_id: orgIds['Al Wasl SC'], country: 'UAE', nationality: 'Portuguese',
      years_experience: 18, score: 91, win_rate: 64.5, total_trophies: 7, total_matches: 420, is_open_to_opportunities: true, cover_url: pexels.stadium,
      philosophy: 'Proactive, possession-based football with relentless pressing and a clear academy-to-first-team pathway.',
      coaching_spells: [{ club: 'Al Wasl SC', role: 'Head Coach', from: '2023', to: 'Present', trophies: ['UAE Pro League 2024'] }, { club: 'Al Ain FC', role: 'Assistant', from: '2019', to: '2023', trophies: ['League Cup 2022'] }],
      licenses: [{ title: 'UEFA Pro License', issuer: 'UEFA', year: '2018', tier: 'pro' }, { title: 'AFC Pro Diploma', issuer: 'AFC', year: '2020', tier: 'pro' }],
      attributes: [{ label: 'Tactical', value: 93 }, { label: 'Man Management', value: 88 }, { label: 'Development', value: 95 }, { label: 'In-Game Adaptation', value: 86 }],
      honors: [{ title: 'UAE Pro League', org: 'Al Wasl SC', year: '2024' }, { title: 'Coach of the Year', org: 'UAE FA', year: '2024' }],
      languages: [{ name: 'Portuguese', level: 'Native' }, { name: 'English', level: 'Fluent' }, { name: 'Arabic', level: 'Conversational' }],
      activity: [{ type: 'achievement', text: 'Guided the team to a second consecutive league title.', time: '2 weeks ago', reactions: 1820 }],
    }, { onConflict: 'user_id' });
  }

  console.log('Seeding athletes + portfolios…');
  const athleteRowIds = {};
  const athleteUserIds = {};
  for (const [ai, a] of ATHLETES.entries()) {
    const uid = await createUser(a.email, a.name, 'athlete');
    athleteUserIds[a.email] = uid;
    await db.from('user_profiles').update({ avatar_url: avatar(a.av), city: a.city, country: a.country, is_verified: a.verified, subscription_tier: a.score > 85 ? 'pro' : 'free', bio: a.bio }).eq('id', uid);

    const patch = {
      sport: a.sport, position: a.position, position_primary: a.position, positions: [a.position],
      nationality: a.nat, dominant_foot: a.foot, height_cm: a.h, weight_kg: a.w, level: a.level,
      current_club: a.club, current_club_id: orgIds[a.club] ?? null, bio: a.bio, cover_url: pexels.cover,
      is_open_to_offers: true, visibility_score: a.score, performance_score: a.perf, fitness_score: a.fit,
      profile_completeness: rint(72, 98), followers_count: a.followers, connections_count: a.conns,
      birth_date: `${2000 + rint(0, 6)}-0${rint(1, 9)}-1${rint(0, 8)}`,
      attributes: buildAttributes(a.score, endorserNames),
      trajectory: buildTrajectory(a.score / 10),
      academy: [{ name: 'Shabab Al Ahli Academy', location: 'Dubai, UAE', years: '2015 \u2013 2021', scholarship: true, description: 'Full sports scholarship; multiple youth league titles.' }],
      certifications: [{ title: 'FIFA Anti-Doping Certificate', issuer: 'FIFA / WADA', date: 'Jan 2024', verified: true, expiry: 'Jan 2026' }, { title: 'Pro League Player License', issuer: 'UAE FA', date: 'Aug 2023', verified: true }],
      honors: [{ title: 'UAE Pro League Champion', org: a.club, year: '2024', type: 'team' }, { title: 'Top Scorer (U-21)', org: 'UAE FA', year: '2023', type: 'individual' }],
      languages: [{ name: 'Arabic', level: 'Native' }, { name: 'English', level: 'Professional' }],
      following: [{ name: a.club, type: 'Club', followers: '124K', color: '#F5A623', initials: a.club.split(' ').map((w) => w[0]).join('').slice(0, 2) }, { name: 'UAE Football Association', type: 'Federation', followers: '410K', color: '#2F80ED', initials: 'FA' }],
      analytics: { weeklyViews: Array.from({ length: 7 }, () => rint(20, 120)), topLocations: [{ city: 'Dubai', pct: 38 }, { city: 'Abu Dhabi', pct: 24 }, { city: 'Madrid', pct: 14 }, { city: 'London', pct: 12 }, { city: 'Doha', pct: 12 }] },
    };
    const { data: ap, error: apErr } = await db.from('athlete_profiles').update(patch).eq('user_id', uid).select('id').single();
    if (apErr) throw new Error(`athlete ${a.email}: ${apErr.message}`);
    const aid = ap.id;
    athleteRowIds[a.email] = aid;

    // attributes (normalized)
    await db.from('athlete_attributes').insert(patch.attributes.map((at) => ({ athlete_id: aid, attribute_key: at.label, value: at.value, source: 'verified' })));
    // matches
    const opponents = ['Sharjah FC', 'Al Jazira', 'Al Nasr', 'Shabab Al Ahli', 'Baniyas SC', 'Emirates FC'];
    await db.from('match_records').insert(Array.from({ length: 5 }, (_, i) => ({
      athlete_id: aid, match_date: daysAgo(i * 7 + 3).slice(0, 10), competition: 'UAE Pro League', opponent: pick(opponents),
      result: pick(['3-1 W', '1-1 D', '2-0 W', '0-2 L', '2-1 W']), minutes_played: rint(70, 90), goals: rint(0, 2), assists: rint(0, 2),
      stats: { rating: +(6 + Math.random() * 3).toFixed(1), passes: rint(20, 60) }, source: 'verified',
    })));
    // media
    await db.from('athlete_media').insert([
      { athlete_id: aid, title: `${a.name} \u2014 Season Highlights`, media_type: 'highlight_reel', storage_url: pexels.clip2, thumbnail_url: pexels.clip2, duration_seconds: 455, is_featured: true, is_public: true, views_count: rint(5000, 45000), ai_tags: ['Goals', 'Assists'] },
      { athlete_id: aid, title: 'Match Winner', media_type: 'video', storage_url: pexels.clip1, thumbnail_url: pexels.clip1, duration_seconds: 252, is_featured: false, is_public: true, views_count: rint(2000, 20000), ai_tags: ['Goal'] },
      { athlete_id: aid, title: 'Top 10 Dribbles', media_type: 'video', storage_url: pexels.clip4, thumbnail_url: pexels.clip4, duration_seconds: 234, is_featured: false, is_public: true, views_count: rint(1000, 15000), ai_tags: ['Dribbling'] },
      { athlete_id: aid, title: 'International Debut', media_type: 'video', storage_url: pexels.clip3, thumbnail_url: pexels.clip3, duration_seconds: 138, is_featured: false, is_public: true, views_count: rint(8000, 90000), ai_tags: ['International'] },
    ]);
    // career milestones
    await db.from('career_milestones').insert([
      { athlete_id: aid, milestone_type: 'debut', club_or_event: `${a.club} First Team`, achieved_at: '2021-08-15', notes: 'Senior debut' },
      { athlete_id: aid, milestone_type: 'trophy', club_or_event: 'UAE Pro League', achieved_at: '2024-05-20', notes: 'League champion' },
    ]);
    // medical: consent to scouts, clearance, record, injury
    await db.from('medical_clearances').insert({ athlete_id: aid, partner_id: partnerId, status: a.verified ? 'cleared' : 'pending', issued_by: 'Dubai Sports Medicine Centre', effective_from: daysAgo(40).slice(0, 10), effective_to: daysAgo(-300).slice(0, 10), notes: 'Full pre-season clearance.' });
    await db.from('medical_records').insert({ athlete_id: aid, partner_id: partnerId, record_type: 'fitness_assessment', title: 'Pre-season Fitness Assessment', summary: 'Cardiac and musculoskeletal assessment completed. No flags.', issued_at: daysAgo(40).slice(0, 10), is_verified: true, hash: 'sha256:' + Math.random().toString(16).slice(2) });
    if (rint(0, 2) === 0) await db.from('injuries').insert({ athlete_id: aid, partner_id: partnerId, injury_type: 'Hamstring strain', body_area: 'Left thigh', severity: 'Minor', occurred_at: daysAgo(120).slice(0, 10), recovery_status: 'Recovered', notes: 'Grade 1, full recovery in 3 weeks.' });
    // posts / activity — varied so the feed reads naturally
    const clips = [pexels.clip1, pexels.clip2, pexels.clip3, pexels.clip4];
    const achievementText = [
      `Proud to help bring the title back to ${a.club}. This is just the beginning. 🏆`,
      `Honoured to be named ${a.position} of the month. Grateful to my teammates and coaches at ${a.club}.`,
      `New personal best in pre-season testing. The work in the lab is paying off. 💪`,
      `Signed my first professional contract with ${a.club}. A dream becoming reality.`,
      `Called up to the national team camp this week. Representing ${a.country} means everything.`,
    ];
    const matchText = [
      `Big result against ${pick(['Sharjah FC', 'Al Jazira', 'Al Nasr', 'Baniyas SC'])} this week. Happy with the performance and the clean finishing.`,
      `Tough away game but we found a way. Three points and a clean sheet. On to the next one.`,
      `Two assists and a goal tonight — but the win is what matters. ${a.club} 💙`,
      `90 minutes in the legs and a derby win. Atmosphere was electric tonight.`,
      `Late winner! Moments like these are why we do this. Thank you to the travelling fans.`,
    ];
    await db.from('posts').insert([
      {
        author_id: uid, athlete_id: aid, type: 'achievement',
        text: achievementText[ai % achievementText.length],
        image_url: ai % 2 === 0 ? clips[ai % clips.length] : null,
        reactions_count: rint(200, 3000), created_at: daysAgo(ai + 1),
      },
      {
        author_id: uid, athlete_id: aid, type: 'match',
        text: matchText[(ai + 2) % matchText.length],
        image_url: ai % 3 === 0 ? clips[(ai + 1) % clips.length] : null,
        reactions_count: rint(100, 1500), created_at: daysAgo(ai + 4),
      },
    ]);
    // profile views (scout interest + analytics)
    const viewers = [{ n: 'Sergio Mendes', o: 'Al Ain FC', r: 'Head Scout', v: true }, { n: 'James Crawford', o: 'Sharjah FC', r: 'Senior Scout', v: true }, { n: 'Technical Director', o: 'Al Hilal', r: 'Director', v: true }, { n: 'Development Coach', o: 'UAE Academy', r: 'Coach', v: false }];
    const views = [];
    const nViews = a.score > 85 ? 28 : 12;
    for (let i = 0; i < nViews; i++) { const vw = pick(viewers); views.push({ athlete_id: aid, viewer_user_id: scoutIds['scout@aceaix.demo'], viewer_name: vw.n, viewer_role: vw.r, viewer_org: vw.o, viewer_verified: vw.v, created_at: daysAgo(rint(0, 13)) }); }
    await db.from('profile_views').insert(views);
    // endorsements
    await db.from('endorsements').insert(ATTR_LABELS.slice(0, 3).map((label) => ({ athlete_id: aid, endorser_id: scoutIds['scout@aceaix.demo'], endorser_role: 'scout', skill_or_trait: label, note: `Elite ${label.toLowerCase()} for this level.` })));
  }

  console.log('Seeding social graph, recs, messages, watchlists, opportunities, notifications…');
  const heroUid = athleteUserIds['karim@aceaix.demo'];
  const heroAid = athleteRowIds['karim@aceaix.demo'];
  const scoutUid = scoutIds['scout@aceaix.demo'];

  // follows: scouts follow athletes; athletes follow scouts/coaches
  const follows = [];
  for (const a of ATHLETES) { follows.push({ follower_id: scoutUid, following_id: athleteUserIds[a.email] }); }
  follows.push({ follower_id: heroUid, following_id: scoutUid });
  await db.from('follows').upsert(follows, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });

  // recommendations to hero athlete
  await db.from('recommendations').upsert([
    { author_id: scoutUid, recipient_id: heroUid, relationship_type: 'scout', body: 'Karim is one of the most clinical finishers I have scouted in the region. Outstanding movement and professionalism.', is_public: true },
  ], { onConflict: 'author_id,recipient_id' });

  // conversation scout <-> hero
  const { data: conv } = await db.from('conversations').insert({ participant_1_id: scoutUid, participant_2_id: heroUid, subject: 'Trial opportunity', last_message_at: daysAgo(1), last_message_preview: 'Would you be open to a trial next month?' }).select('id').single();
  await db.from('messages').insert([
    { conversation_id: conv.id, sender_id: scoutUid, content: 'Hi Karim, really impressed by your recent highlights.', is_read: true, created_at: daysAgo(2) },
    { conversation_id: conv.id, sender_id: heroUid, content: 'Thank you! Appreciate you reaching out.', is_read: true, created_at: daysAgo(2) },
    { conversation_id: conv.id, sender_id: scoutUid, content: 'Would you be open to a trial next month?', is_read: false, created_at: daysAgo(1) },
  ]);

  // watchlists for scout
  const { data: wl1 } = await db.from('watchlists').insert({ user_id: scoutUid, name: 'Strikers to watch', description: 'Top forward targets for the summer window.' }).select('id').single();
  const { data: wl2 } = await db.from('watchlists').insert({ user_id: scoutUid, name: 'Academy prospects', description: 'Young talents on the rise.' }).select('id').single();
  await db.from('watchlist_athletes').insert([
    { watchlist_id: wl1.id, athlete_id: athleteRowIds['karim@aceaix.demo'], rating: 5, notes: 'Priority target.' },
    { watchlist_id: wl1.id, athlete_id: athleteRowIds['yousef@aceaix.demo'], rating: 4 },
    { watchlist_id: wl1.id, athlete_id: athleteRowIds['majed@aceaix.demo'], rating: 4 },
    { watchlist_id: wl2.id, athlete_id: athleteRowIds['fatima@aceaix.demo'], rating: 4, notes: 'Big upside.' },
    { watchlist_id: wl2.id, athlete_id: athleteRowIds['noura@aceaix.demo'], rating: 3 },
  ]);

  // opportunities (created by scout)
  await db.from('opportunities').insert([
    { organization_id: orgIds['Al Jazira FC'] ?? orgIds['Al Ain FC'], created_by_id: scoutUid, title: 'Attacking Midfielder', description: 'First-team opportunity for a creative #10.', type: 'offer', location: 'Abu Dhabi, UAE', sport: 'Football', position: 'Attacking Midfielder', salary_min: 45000, salary_max: 60000, currency: 'EUR', application_deadline: daysAgo(-30).slice(0, 10), is_active: true },
    { organization_id: orgIds['Sharjah FC'], created_by_id: scoutUid, title: 'Forward / Striker', description: 'Seeking a clinical striker for the Pro League season.', type: 'offer', location: 'Sharjah, UAE', sport: 'Football', position: 'Striker', salary_min: 30000, salary_max: 40000, currency: 'EUR', application_deadline: daysAgo(-22).slice(0, 10), is_active: true },
    { organization_id: orgIds['Al Wasl SC'], created_by_id: scoutUid, title: 'Open Trial: Right Winger', description: 'Open trial day for wingers aged 18-23.', type: 'trial', location: 'Dubai, UAE', sport: 'Football', position: 'Winger', currency: 'AED', application_deadline: daysAgo(-15).slice(0, 10), is_active: true },
    { organization_id: orgIds['UAE Football Academy'], created_by_id: scoutUid, title: 'Academy Goalkeeper', description: 'Development contract for a promising goalkeeper.', type: 'offer', location: 'Abu Dhabi, UAE', sport: 'Football', position: 'Goalkeeper', salary_min: 12000, salary_max: 18000, currency: 'EUR', application_deadline: daysAgo(-40).slice(0, 10), is_active: true },
  ]);

  // notifications
  await db.from('notifications').insert([
    { user_id: heroUid, type: 'scout_view', title: 'Al Ain FC scout viewed your profile', body: 'Sergio Mendes (Head Scout) viewed your profile.', is_read: false, action_url: '/athlete/analytics' },
    { user_id: heroUid, type: 'message', title: 'New message from Sergio Mendes', body: 'Would you be open to a trial next month?', is_read: false, action_url: '/athlete/messages' },
    { user_id: heroUid, type: 'medical', title: 'Medical clearance updated', body: 'Your full clearance is active.', is_read: true, action_url: '/athlete/medical' },
    { user_id: scoutUid, type: 'match', title: '3 new athletes match your saved search', body: 'New strikers in the UAE Pro League.', is_read: false, action_url: '/recruiter/search' },
    { user_id: adminId, type: 'verification', title: '3 verification requests pending', body: 'Review the verification queue.', is_read: false, action_url: '/admin/verification' },
  ]);

  // success stories
  await db.from('success_stories').insert([
    { title: 'From Al Ain academy to the Pro League', slug: 'al-ain-academy-pro', sport: 'Football', athlete_name: 'Khalid Al-Rashidi', athlete_id: athleteRowIds['khalid@aceaix.demo'], excerpt: 'How a verified profile and AI insights opened the door to a first-team contract.', content: 'Full story...', cover_image_url: pexels.clip2, is_published: true, is_featured: true, published_at: daysAgo(10) },
    { title: 'How verified data changed a scouting career', slug: 'verified-data-scouting', sport: 'Football', athlete_name: 'Sergio Mendes', excerpt: 'A scout shares how AceAiX cut his shortlist time in half.', content: 'Full story...', cover_image_url: pexels.clip3, is_published: true, is_featured: true, published_at: daysAgo(20) },
    { title: 'Medical verification that builds trust', slug: 'medical-verification-trust', sport: 'Football', athlete_name: 'Dr. Yousuf Rahimi', excerpt: 'Tamper-evident medical records give clubs confidence.', content: 'Full story...', cover_image_url: pexels.stadium, is_published: true, is_featured: false, published_at: daysAgo(30) },
  ]);

  // verification requests (admin queue)
  await db.from('verification_requests').insert([
    { subject_user_id: athleteUserIds['rashid@aceaix.demo'], type: 'athlete_id', status: 'pending', documents: [{ name: 'Emirates ID', url: '#' }] },
    { subject_user_id: athleteUserIds['hassan@aceaix.demo'], type: 'athlete_id', status: 'pending', documents: [{ name: 'Passport', url: '#' }] },
    { organization_id: orgIds['UAE Football Academy'], type: 'club', status: 'pending', documents: [{ name: 'Trade License', url: '#' }] },
  ]);

  console.log('Seeding CMS content…');
  await db.from('cms_content').upsert([
    { key: 'home', data: {
      heroStats: [{ value: '1,200+', label: 'Verified Athletes' }, { value: '340+', label: 'Partner Clubs' }, { value: '98%', label: 'Data Accuracy' }],
      pillars: [
        { title: 'AI Performance Score', desc: 'Objective, explainable scoring from verified match data.', icon: 'Bot' },
        { title: 'Verified Profiles', desc: 'Identity, performance, and medical verification you can trust.', icon: 'ShieldCheck' },
        { title: 'Direct Connections', desc: 'Reach clubs, scouts, and coaches without the middlemen.', icon: 'Network' },
      ],
      trustClubs: ORGS.filter((o) => o.type === 'club').map((o) => o.name).concat(['Al Jazira FC', 'Ajman Club', 'Baniyas SC', 'Emirates FC']),
    } },
    { key: 'plans', data: {
      plans: [
        { name: 'Athlete Free', price: 0, period: 'mo', audience: 'athlete', features: ['Public profile', 'AI score', '3 highlight uploads', 'Basic analytics'], cta: 'Start free' },
        { name: 'Athlete Pro', price: 49, period: 'mo', audience: 'athlete', highlighted: true, features: ['Everything in Free', 'Unlimited media', 'Career forecasting', 'Priority in search', 'Direct scout messaging'], cta: 'Go Pro' },
        { name: 'Scout / Recruiter', price: 199, period: 'mo', audience: 'scout', features: ['Advanced search & filters', 'Watchlists', 'Contact quota 100/mo', 'Analytics'], cta: 'Start scouting' },
        { name: 'Club / Enterprise', price: null, period: '', audience: 'club', features: ['Seats for staff', 'Squad management', 'Trials & opportunities', 'API access', 'Dedicated support'], cta: 'Contact sales' },
      ],
      faqs: [
        { q: 'How is the AceAiX score calculated?', a: 'From verified match and performance data using an explainable model.' },
        { q: 'Is my medical data private?', a: 'Yes. Medical data is consent-gated and only visible to those you explicitly authorize.' },
        { q: 'Can I cancel anytime?', a: 'Yes, plans are month-to-month with no lock-in.' },
      ],
    } },
    { key: 'resources', data: {
      categories: [{ name: 'Guides', count: 12 }, { name: 'Research', count: 8 }, { name: 'Athlete Tips', count: 15 }, { name: 'Club Playbooks', count: 6 }],
      articles: [
        { title: 'Building a scout-ready profile', category: 'Guides', readTime: '6 min', excerpt: 'The essential checklist to get noticed by recruiters.' },
        { title: 'Understanding your AI performance score', category: 'Research', readTime: '9 min', excerpt: 'What goes into the score and how to improve it.' },
        { title: 'Nutrition for match-day performance', category: 'Athlete Tips', readTime: '5 min', excerpt: 'Fuel your body for 90 minutes at peak intensity.' },
        { title: 'Running effective open trials', category: 'Club Playbooks', readTime: '8 min', excerpt: 'How clubs use AceAiX to streamline trial days.' },
      ],
    } },
    { key: 'about', data: {
      values: [{ title: 'Integrity', desc: 'Verified data, always.' }, { title: 'Opportunity', desc: 'Talent over connections.' }, { title: 'Privacy', desc: 'Your data, your control.' }, { title: 'Excellence', desc: 'World-class product.' }],
      team: [{ name: 'Layla Ahmed', role: 'CEO & Co-founder', avatar: avatar(45) }, { name: 'Sergio Mendes', role: 'Head of Scouting', avatar: avatar(52) }, { name: 'Dr. Yousuf Rahimi', role: 'Chief Medical Officer', avatar: avatar(68) }, { name: 'Ricardo Mendes', role: 'Football Advisor', avatar: avatar(59) }],
      milestones: [{ year: '2023', text: 'AceAiX founded in Dubai.' }, { year: '2024', text: 'Launched verified profiles & AI score.' }, { year: '2025', text: '1,200+ athletes, 340+ clubs.' }, { year: '2026', text: 'Medical intelligence & provenance launched.' }],
    } },
  ], { onConflict: 'key' });

  console.log('\n✅ Seed complete.');
  const counts = {};
  for (const t of ['user_profiles', 'athlete_profiles', 'organizations', 'opportunities', 'posts', 'profile_views', 'success_stories', 'coach_profiles', 'cms_content']) {
    const { count } = await db.from(t).select('*', { count: 'exact', head: true });
    counts[t] = count;
  }
  console.table(counts);
}

main().catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); });

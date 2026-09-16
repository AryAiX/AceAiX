/**
 * Opportunities: the trials board, one posting in full, the club's review
 * queue, the posting form, and the club page an opportunity points at.
 *
 * Four things worth knowing before translating:
 *
 *  - `status.*` is deliberately written twice. The same stored value reads
 *    differently to the two people looking at the same row: `rejected` is a
 *    fact on a scout's list and a sentence on a 15-year-old's screen. Translate
 *    both voices; never collapse them into one.
 *  - `match.reason.*` is the athlete's reading of a reason the database emits
 *    in English. The English source strings stay in the code as lookup keys —
 *    see components/opportunities/MatchExplain.tsx.
 *  - `post.safetyBody` is compliance copy. Keep its meaning exact — under-18s,
 *    a parent or guardian informed, postings removed — and keep
 *    `{{guidelines}}` where the sentence needs it: that is where the link to
 *    the Community Guidelines is drawn.
 *  - Sports, positions, levels and opportunity types are stored in English and
 *    translated through `constants/sports.ts`. Nothing here restates them.
 */
export const opportunities = {
  // ── Opportunities tab ───────────────────────────────────────────────────────
  title: 'Opportunities',
  athleteSubtitle: 'Trials, scholarships, contracts, camps',
  recruiterSubtitle: 'Your postings and who applied',

  /** Every bookmark in this area says the same thing: board, posting, club. */
  savedToast: 'Saved. Find it in Saved.',

  tabs: {
    open: 'Open',
    saved: 'Saved',
    applied: 'Applied',
    postings: 'My postings',
    applicants: 'Applicants',
  },

  /** Sports come from `sports.allSports`; only the type row is ours. */
  allTypes: 'Everything',

  athlete: {
    appliedOn: 'Applied {{date}}',

    openEmptyFilteredTitle: 'Nothing matches those filters',
    openEmptyFilteredBody: 'Clear them to see everything that is open right now.',
    clearFilters: 'Clear filters',

    openEmptyTitle: 'Nothing open in your sport yet',
    openEmptyBody: 'Follow clubs to hear first.',
    findClubs: 'Find clubs',

    savedEmptyTitle: 'Nothing saved yet',
    savedEmptyBody: 'Tap the bookmark on anything you want to come back to.',
    browseOpen: 'Browse what’s open',

    appliedEmptyTitle: 'No applications yet',
    appliedEmptyBody: 'When you apply, you can track every reply here.',
    seeWhatsOpen: 'See what’s open',
  },

  recruiter: {
    active: 'Active',
    closed: 'Closed',
    /* The two below are spoken inside a longer sentence, hence lower case. */
    activeA11y: 'active',
    closedA11y: 'closed',
    openPosting: 'Opens the posting',
    reviewApplicants: 'Review applicants',

    postingsEmptyTitle: 'No postings yet',
    postingsEmptyBody:
      'Post a trial, a scholarship or a camp and athletes who fit will see it first.',

    allApplicants: 'Everyone who applied to any of your postings, best fit first.',
    applicantsEmptyTitle: 'No applicants yet',
    applicantsEmptyBody: 'They will appear here the moment someone applies.',
  },

  // ── Opportunity card ────────────────────────────────────────────────────────
  card: {
    independent: 'Independent listing',
    open: 'Opens the opportunity',
    /* Spoken at the end of the card's accessibility sentence. */
    closedA11y: 'closed',
    save: 'Save {{title}} for later',
    unsave: 'Remove {{title}} from saved',
  },

  // ── Where an application stands ─────────────────────────────────────────────
  status: {
    /** What the athlete who sent it reads. */
    athlete: {
      applied: 'Sent',
      in_review: 'Being read',
      shortlisted: 'Shortlisted',
      invited: 'Invited to trial',
      rejected: 'Not this time',
      withdrawn: 'Withdrawn',
    },
    /** What the club reviewing it reads. */
    recruiter: {
      applied: 'New',
      in_review: 'In review',
      shortlisted: 'Shortlisted',
      invited: 'Invited',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    },
  },

  // ── The match number and the reasons behind it ──────────────────────────────
  match: {
    percentA11y: '{{percent}} percent match',
    fitPercentA11y: '{{percent}} percent fit',
    why: 'Why this fits you',
    /** The athlete's reading of what `private.match_reasons` returned. */
    reason: {
      sport: 'Your sport',
      position: 'Your position',
      region: 'Near you',
      topTier: 'Your talent score is top tier',
      strongScore: 'Strong talent score',
    },
  },

  // ── Applicant row ───────────────────────────────────────────────────────────
  applicant: {
    open: 'Opens their application',
    talentScoreA11y: 'talent score {{score}}',
  },

  // ── One opportunity, in full ────────────────────────────────────────────────
  detail: {
    title: 'Opportunity',
    more: 'More actions',
    /** The line above the link in a shared message. */
    shareText: '{{title}} — {{club}}',
    shareClubFallback: 'on AceAiX',

    missingTitle: 'We can’t find that',
    missingBody: 'The link may be broken or out of date.',
    goneTitle: 'This one has gone',
    goneBody: 'The club took it down, or it closed. There is plenty more open.',
    seeWhatsOpen: 'See what’s open',

    save: 'Save for later',
    unsave: 'Remove from saved',

    reviewApplicants_one: 'Review {{count}} applicant',
    reviewApplicants_other: 'Review {{count}} applicants',

    withdraw: 'Withdraw application',
    withdrawA11y: 'Withdraw this application',
    withdrawn: 'Withdrawn.',
    applicationsClosed: 'Applications closed',

    openClub: 'Open {{club}}',
    viewClub: 'View club',
    postedByMember: 'Posted by a member',
    closed: 'Closed',

    about: 'About this',

    factType: 'Type',
    factSport: 'Sport',
    factPosition: 'Position',
    factWhere: 'Where',
    factDeadline: 'Deadline',
    factPosted: 'Posted',
    noDeadline: 'No deadline',

    /* A trial is a real-world meeting with a stranger. Keep this plain. */
    safety:
      'Tell a parent, guardian or coach before you go to anything in person. Nobody on AceAiX should ever ask you for money.',

    menuTitle: 'This opportunity',
    reportHint: 'Tell us what’s wrong. Reports are private.',
  },

  report: {
    title: 'Report this posting',
    subtitle: 'Pick the closest reason. We never tell them who reported.',
    thanks: 'Thanks for telling us. Our team will take a look.',
    reason: {
      childSafety: 'Child safety',
      childSafetyHint: 'Unsafe for under-18s',
      scam: 'Scam or asking for money',
      impersonation: 'Pretending to be a real club',
      misleading: 'Misleading or untrue',
      spam: 'Spam',
      other: 'Something else',
    },
  },

  apply: {
    send: 'Send application',
    sent: 'Sent. They will see your profile with it.',
    messageLabel: 'Your message',
    messagePlaceholder: 'Tell them why you’re a good fit — two or three lines is plenty.',
    whatTheySee: 'What they will see',
    seeProfile: 'Your name and profile',
    seeScore: 'Your Talent Score',
    seeHighlights: 'Your highlights and stats',
    seeMessage: 'The message you write above',
    guardianNotice: 'Your parent or guardian will be able to see applications you send.',
  },

  // ── Reviewing who applied ───────────────────────────────────────────────────
  applicants: {
    title: 'Applicants',
    /** The filter row reuses the recruiter status names; only "all" is ours. */
    filterAll: 'Everyone',
    /** A filter chip: the stage, then how many are at it. */
    filterChip: '{{label}} {{count}}',
    ranked: 'Ranked by how well each athlete fits this posting.',

    missingTitle: 'We can’t find that posting',
    missingBody: 'The link may be broken or out of date.',
    backToOpportunities: 'Back to opportunities',

    lockedTitle: 'You can’t review this posting',
    lockedBody:
      'Only the club or coach who posted it — and the staff they added — can see who applied.',

    emptyTitle: 'Nobody has applied yet',
    emptyBody: 'Athletes who fit this posting see it first. Give it a day or two.',
    emptyStageTitle: 'Nobody at that stage',
    emptyStageBody: 'Try another filter.',
    showEveryone: 'Show everyone',

    scoreLine: 'Talent Score {{score}}',
    noMessage: 'They did not write a message.',
    viewProfile: 'View full profile',

    moveForward: 'Move them forward',
    shortlist: 'Shortlist',
    shortlistDone: 'Shortlisted.',
    invite: 'Invite to trial',
    inviteDone: 'Invited to trial.',
    reject: 'Reject',
    rejectDone: 'Marked as rejected.',

    notified: 'They’ll be notified — AceAiX sends it for you.',
  },

  // ── Posting an opportunity ──────────────────────────────────────────────────
  post: {
    title: 'Post an opportunity',
    submit: 'Post it',
    posted: 'Posted. Athletes who fit will see it first.',
    checkFields: 'Check the highlighted fields.',

    titleLabel: 'Title',
    titlePlaceholder: 'U16 goalkeeper trial',
    titleHint: 'Short and specific. Athletes scan this first.',
    titleError: 'Give it a title athletes will recognise.',

    typeLabel: 'What is it?',
    typeError: 'Pick what this is.',
    /** Read out as one sentence: the type, then what it means. */
    typeA11y: '{{label}}. {{hint}}',

    sportLabel: 'Sport',
    sportError: 'Pick the sport.',

    positionLabel: 'Position',
    positionHint: 'Leave it open if any position can apply.',
    positionAny: 'Any',

    whereLabel: 'Where',
    wherePlaceholder: 'Dubai, UAE',
    whereError: 'Where does this happen?',

    deadlineLabel: 'Applications close',
    deadlineNone: 'No deadline',
    deadlineChoose: 'Choose a closing date',
    deadlineChange: 'Applications close {{date}}. Change the date',
    deadlineClearA11y: 'Clear the closing date',
    deadlineError: 'Pick a date in the future.',

    detailsLabel: 'Details',
    detailsPlaceholder: 'What happens on the day, who it’s for, what to bring.',
    detailsError_one: 'Say a bit more — at least {{count}} character.',
    detailsError_other: 'Say a bit more — at least {{count}} characters.',

    previewTitle: 'What athletes will see',
    previewHint: 'The match percentage is worked out per athlete, so it is not shown here.',
    previewPlaceholder: 'Your title goes here',

    /* Compliance copy. Every clause carries weight — keep all three. */
    safetyTitle: 'Before you post',
    safetyBody:
      'Many AceAiX athletes are under 18. Trials must be run with a parent or guardian informed, and AceAiX may remove postings that don’t follow our {{guidelines}}.',
    safetyLinkA11y: 'Read the Community Guidelines',
  },

  // ── Club page ───────────────────────────────────────────────────────────────
  org: {
    missingTitle: 'We can’t find that club',
    missingBody: 'The link may be broken or out of date.',
    backToDiscover: 'Back to discover',
    goneTitle: 'This club is not on AceAiX',
    goneBody: 'It may have been removed.',

    /* `club` and `federation` come from common; an academy is only ever an
       organization type, so it lives here. */
    typeAcademy: 'Academy',

    /* `value` is the count already shortened for the badge — "1.2K". */
    followers_one: '{{value}} follower',
    followers_other: '{{value}} followers',
    followA11y: 'Follow {{name}}',
    unfollowA11y: 'Unfollow {{name}}',

    tabAbout: 'About',
    tabOpenings: 'Openings',
    tabOpeningsCount: 'Openings {{count}}',

    noIntro: 'This club has not written an introduction yet.',
    factType: 'Type',
    factLeague: 'League',
    factBasedIn: 'Based in',

    unverified:
      'AceAiX has not verified this club yet. Check who you are talking to before you travel anywhere.',

    openingsEmptyTitle: 'Nothing open right now',
    openingsEmptyFollowing: 'You’re following them, so you’ll hear when something opens.',
    openingsEmptyBody: 'Follow them to hear first when something opens.',
  },
};

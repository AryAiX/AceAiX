/**
 * The page a parent opens from the consent email (app/parent-approval.tsx).
 *
 * There is no account on this screen. Every sentence is a condition of
 * consent: translate it, and do not drop a limit — verified accounts only,
 * no money through AceAiX, not a medical assessment.
 */
export const parentApproval = {
  title: 'AceAiX — Parent or guardian approval',
  loading: 'Loading the request',
  yourChild: 'Your child',
  heading: '{{name}} would like your approval',
  introCreated: 'They have created an AceAiX profile.',
  introHidden:
    'Because they are under 18, nothing happens until you agree. Their profile is hidden and nobody can message them.',
  approving: 'What you are approving',
  discoveryTitle: 'Let coaches and clubs find them',
  discoveryBody:
    'Verified coaches, clubs and academies can find their profile, and their exact age is never shown.',
  messagingTitle: 'Let verified coaches and clubs message them',
  messagingBody: 'Only accounts AceAiX has verified can start a conversation, and other adults cannot.',
  mediaTitle: 'Let them share photos and clips',
  mediaBody: 'Highlights and posts they choose to publish.',
  assessmentsTitle: 'Let them take the Game Intelligence games',
  assessmentsBody:
    'Short timed games of reaction, focus and decisions, kept private, and not a medical assessment.',
  sponsorshipTitle: 'Let them ask for and accept sponsorship',
  sponsorshipBody:
    'Only a verified sponsor can offer, they cannot message directly, and no money moves through AceAiX.',
  bookingsTitle: 'Let them book sessions with verified coaches',
  bookingsBody: 'A session with a verified coach only, and any payment goes straight to that coach.',
  approve: 'Approve',
  decline: 'Not right now',
  approvedTitle: 'Approved — thank you',
  approvedBody:
    'Their profile is now visible to verified coaches and clubs, with the permissions you chose.',
  declinedTitle: 'Thank you — nothing has been shared',
  declinedBody:
    'Their profile stays hidden and nobody can message them. They can ask again later if you change your mind.',
  invalidTitle: 'That link is not valid',
  invalidBody: 'Ask your child to send a new request from the AceAiX app.',
  expiredTitle: 'This link has expired',
  expiredBody: 'This link is no longer valid. Ask your child to send a new one from the app.',
  answeredTitle: 'This request has already been answered',
  answeredBody: 'Nothing further is needed.',
  errorTitle: "We couldn't reach AceAiX",
  errorBody: 'Check your connection and try again.',
  retry: 'Try again',
  footer:
    'You can change or withdraw this at any time by e-mailing {{email}}, or from inside the app.',
  privacy: 'Privacy Policy',
  childSafety: 'Child Safety Standards',
};

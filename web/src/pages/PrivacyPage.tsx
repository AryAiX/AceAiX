import PublicHeader from '../components/PublicHeader';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'Account and contact information, including name, email address, phone number, sign-in details, and user identifiers.',
      'Athlete profile information, including sport, position, team or club, biography, performance history, achievements, and career details you choose to provide.',
      'Health, fitness, and medical-related records when you upload them or connect supported partners, such as clearances, injury notes, readiness metrics, and performance data.',
      'Photos, videos, posts, messages, comments, and other user content you submit to build your profile or interact with the AceAiX community.',
      'General location information such as city, country, region, club location, or opportunity location. We do not use precise background location tracking.',
      'Product interaction and technical data, such as pages viewed, feature usage, device type, crash diagnostics, and security logs used to operate and improve the service.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'To create and maintain athlete, scout, club, coach, partner, and administrator accounts.',
      'To show athlete profiles, highlights, opportunities, notifications, recommendations, and performance insights.',
      'To support verification, safety, fraud prevention, account security, customer support, and legal compliance.',
      'To improve app functionality, personalize relevant sports opportunities, and understand aggregate product usage.',
      'To communicate with you about your account, support requests, product updates, and important service notices.',
    ],
  },
  {
    title: 'Sharing and Disclosure',
    body: [
      'Profile information and user content may be visible to other AceAiX users according to your settings and the feature you use.',
      'Medical and sensitive athlete information is intended to be shared only with authorized parties, such as selected clubs, scouts, coaches, or medical partners, when permitted by your account settings, consent, or organizational relationship.',
      'We use service providers such as hosting, database, authentication, analytics, crash reporting, and email providers to operate AceAiX. These providers process information for AceAiX and not for their own advertising purposes.',
      'We may disclose information when required by law, to protect rights and safety, or during a business transaction such as a merger, acquisition, or financing.',
      'We do not sell personal information and we do not use collected data to track users across third-party apps or websites for advertising.',
    ],
  },
  {
    title: 'Youth Athletes and Guardians',
    body: [
      'AceAiX may be used by youth athletes with appropriate parent, guardian, club, school, federation, or organization involvement where required.',
      'A parent or guardian may contact us to review, correct, export, or request deletion of a youth athlete account or related personal information.',
      'If we learn that information was collected from a youth athlete without appropriate consent where consent is required, we will take reasonable steps to delete or restrict that information.',
    ],
  },
  {
    title: 'Your Choices and Rights',
    body: [
      'You can update many profile, notification, and privacy settings directly in the app.',
      'You may request access, correction, deletion, restriction, or export of your personal information by contacting support.',
      'You may request account deletion from the app where available or by emailing us with the account email address and your request.',
      'We retain information for as long as needed to provide the service, comply with legal obligations, resolve disputes, protect safety, and enforce agreements.',
    ],
  },
  {
    title: 'Security and International Transfers',
    body: [
      'We use administrative, technical, and organizational safeguards designed to protect personal information.',
      'AceAiX may process information in countries other than where you live. When we transfer information, we use reasonable safeguards appropriate to the data and service.',
      'No online service can guarantee absolute security, but we work to protect accounts and investigate suspected unauthorized access.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald/25 bg-emerald/10 text-emerald text-xs font-semibold mb-5">
            <ShieldCheck size={14} />
            Privacy Policy
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AceAiX Privacy Policy</h1>
          <p className="text-slate-400 leading-relaxed">
            Effective June 28, 2026. This policy explains how AceAiX collects, uses, shares, and protects information when you use our website, mobile app, and related services.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map(section => (
            <section key={section.title} className="card p-6">
              <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
              <ul className="space-y-3">
                {section.body.map(item => (
                  <li key={item} className="text-sm text-slate-400 leading-relaxed flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-azure flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              For privacy questions, account deletion, or data-rights requests, contact AceAiX support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="mailto:customer-devops@apsy.io" className="btn-primary">
                <Mail size={16} /> customer-devops@apsy.io
              </a>
              <Link to="/support" className="btn-outline">Visit Support</Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

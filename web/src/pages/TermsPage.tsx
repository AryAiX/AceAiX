import PublicHeader from '../components/PublicHeader';
import { Link } from 'react-router-dom';
import { FileText, Mail } from 'lucide-react';

const sections = [
  {
    title: 'Using AceAiX',
    body: 'AceAiX provides athlete profile, sports intelligence, recruiting, messaging, opportunity discovery, and related tools for athletes, scouts, clubs, coaches, medical partners, and administrators. You are responsible for the information you provide and for using the service lawfully and respectfully.',
  },
  {
    title: 'Accounts and Eligibility',
    body: 'You must provide accurate account information and keep your login credentials secure. Youth athletes may use AceAiX with appropriate parent, guardian, club, school, federation, or organization involvement where required by law or policy.',
  },
  {
    title: 'User Content',
    body: 'You retain ownership of photos, videos, profile details, posts, messages, and other content you submit. By using AceAiX, you give us permission to host, display, process, and share that content as needed to operate the service and make the features you choose work.',
  },
  {
    title: 'Medical and Performance Information',
    body: 'AceAiX may help organize medical clearances, fitness data, performance records, and sports insights. AI outputs and platform analytics are informational decision-support signals only. They are not medical diagnoses, legal advice, professional scouting guarantees, or a substitute for qualified professionals.',
  },
  {
    title: 'Acceptable Use',
    body: 'Do not misuse the service, attempt unauthorized access, scrape data, impersonate others, upload illegal or harmful content, harass users, interfere with platform security, or use AceAiX in a way that violates applicable laws or third-party rights.',
  },
  {
    title: 'Availability and Changes',
    body: 'We may update, suspend, remove, or change features from time to time. We work to keep AceAiX available and reliable, but we do not guarantee uninterrupted access or that every feature will always be available.',
  },
  {
    title: 'Termination',
    body: 'You may stop using AceAiX at any time. We may suspend or terminate access if an account violates these terms, creates risk, or is used in a way that harms users, partners, or the platform.',
  },
  {
    title: 'Disclaimers and Liability',
    body: 'AceAiX is provided on an as-is and as-available basis to the fullest extent permitted by law. We are not responsible for user decisions, recruiting outcomes, medical decisions, third-party conduct, or indirect damages except where liability cannot be limited by law.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-azure/25 bg-azure/10 text-azure text-xs font-semibold mb-5">
            <FileText size={14} />
            Terms of Service
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AceAiX Terms of Service</h1>
          <p className="text-slate-400 leading-relaxed">
            Effective June 28, 2026. These terms apply when you use AceAiX websites, mobile apps, and related services.
          </p>
        </div>

        <div className="space-y-5">
          {sections.map(section => (
            <section key={section.title} className="card p-6">
              <h2 className="text-xl font-bold text-white mb-3">{section.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{section.body}</p>
            </section>
          ))}

          <section className="card p-6">
            <h2 className="text-xl font-bold text-white mb-3">Contact</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Questions about these terms can be sent to AceAiX support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="mailto:customer-devops@apsy.io" className="btn-primary">
                <Mail size={16} /> customer-devops@apsy.io
              </a>
              <Link to="/privacy" className="btn-outline">Privacy Policy</Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

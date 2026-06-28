import PublicHeader from '../components/PublicHeader';
import { Link } from 'react-router-dom';
import { LifeBuoy, Mail, ShieldCheck, Trash2 } from 'lucide-react';

type SupportCard =
  | { kind: 'external'; title: string; icon: React.ReactNode; body: string; action: string; href: string }
  | { kind: 'internal'; title: string; icon: React.ReactNode; body: string; action: string; to: string };

const supportCards: SupportCard[] = [
  {
    kind: 'external',
    title: 'General Support',
    icon: <LifeBuoy size={18} />,
    body: 'Get help with sign-in, profile setup, opportunities, notifications, account access, or app issues.',
    action: 'Email support',
    href: 'mailto:customer-devops@apsy.io?subject=AceAiX%20Support%20Request',
  },
  {
    kind: 'internal',
    title: 'Privacy Requests',
    icon: <ShieldCheck size={18} />,
    body: 'Request access, correction, export, restriction, or deletion of personal information associated with your account.',
    action: 'Privacy policy',
    to: '/privacy',
  },
  {
    kind: 'external',
    title: 'Account Deletion',
    icon: <Trash2 size={18} />,
    body: 'To request deletion, email us from the address on your AceAiX account and include "Account Deletion Request" in the subject.',
    action: 'Request deletion',
    href: 'mailto:customer-devops@apsy.io?subject=AceAiX%20Account%20Deletion%20Request',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />
      <main className="max-w-5xl mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-volt/25 bg-volt/10 text-volt text-xs font-semibold mb-5">
            <LifeBuoy size={14} />
            Support
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AceAiX Support</h1>
          <p className="text-slate-400 leading-relaxed max-w-2xl mx-auto">
            We help athletes, scouts, clubs, coaches, guardians, and partners with AceAiX account and product questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {supportCards.map(card => (
            <section key={card.title} className="card p-6 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-azure/10 text-azure flex items-center justify-center mb-4">
                {card.icon}
              </div>
              <h2 className="text-lg font-bold text-white mb-3">{card.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed flex-1">{card.body}</p>
              {card.kind === 'internal' ? (
                <Link to={card.to} className="btn-outline mt-5">{card.action}</Link>
              ) : (
                <a href={card.href} className="btn-outline mt-5">{card.action}</a>
              )}
            </section>
          ))}
        </div>

        <section className="card p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Contact AceAiX</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                For fastest support, include your account email, device type, app version if known, and a short description of the issue. We aim to respond within 2 business days.
              </p>
            </div>
            <a href="mailto:customer-devops@apsy.io" className="btn-primary flex-shrink-0">
              <Mail size={16} /> customer-devops@apsy.io
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

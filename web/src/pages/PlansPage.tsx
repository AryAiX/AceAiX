import { useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import { Check, ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCms } from '../api/content';

interface PlanItem {
  name: string;
  price: number | null;
  period: string;
  audience: string;
  highlighted?: boolean;
  features: string[];
  cta: string;
}

interface PlansCms {
  plans: PlanItem[];
  faqs: { q: string; a: string }[];
}

const CURRENCY = 'AED';

export default function PlansPage() {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: cms, isLoading } = useQuery({ queryKey: ['cms', 'plans'], queryFn: () => getCms<PlansCms>('plans') });
  const plans = cms?.plans ?? [];
  const faqs = cms?.faqs ?? [];

  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />

      <div className="border-b border-slate-700/50 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Plans for Every Stage</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">From grassroots athlete to professional club — AceAiX has a plan built for your goals.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-navy-800 border border-slate-700 rounded-full px-4 py-2">
            <span className={`text-sm ${!billingAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>Monthly</span>
            <div
              onClick={() => setBillingAnnual(!billingAnnual)}
              className={`w-12 h-6 rounded-full cursor-pointer transition-colors flex items-center px-0.5 ${billingAnnual ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${billingAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <span className={`text-sm ${billingAnnual ? 'text-white font-medium' : 'text-slate-400'}`}>
              Annual <span className="text-emerald-400 text-xs ml-1">Save 20%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-700/50 bg-navy-700 p-6 animate-pulse">
                <div className="h-3 w-16 bg-navy-800 rounded mb-2" />
                <div className="h-5 w-28 bg-navy-800 rounded mb-4" />
                <div className="h-8 w-20 bg-navy-800 rounded mb-5" />
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((j) => <div key={j} className="h-3 w-full bg-navy-800 rounded" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative flex flex-col rounded-2xl border p-6 ${plan.highlighted ? 'bg-blue-600/10 border-blue-600/50 shadow-blue-glow' : 'bg-navy-700 border-slate-700/50'}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={10} fill="white" /> Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{plan.audience}</p>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                </div>
                <div className="mb-4">
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {billingAnnual ? Math.round(plan.price * 0.8) : plan.price}
                      </span>
                      <span className="text-slate-400 text-sm">{CURRENCY}/{plan.period}</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-white">Custom</p>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.price === null ? '/contact' : '/auth/register'}
                  className={`w-full text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${plan.highlighted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-navy-800 hover:bg-navy-700 border border-slate-700 text-white hover:border-slate-500'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{faq.q}</p>
                  <ChevronRight size={16} className={`text-slate-400 transition-transform flex-shrink-0 ml-3 ${openFaq === i ? 'rotate-90' : ''}`} />
                </div>
                {openFaq === i && (
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

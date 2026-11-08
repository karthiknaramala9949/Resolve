import React, { useState } from 'react';
import { Button, Card, useToast } from '@/design-system';
import {
  Phone,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Scale,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  const { toast } = useToast();
  const [decisionStep, setDecisionStep] = useState<number | null>(null);

  const officialRoutes = [
    {
      id: 'nch',
      title: 'National Consumer Helpline (NCH)',
      tagline: 'First-line national consumer dispute resolution & convergence',
      description:
        'Administered by the Department of Consumer Affairs, Government of India. Over 800+ top companies and e-commerce platforms have partnered for pre-litigation grievance settlement.',
      contact: 'Call 1915 or 1800-11-4000 (Toll Free, 8 AM - 8 PM all days) / WhatsApp 8800001915',
      webUrl: 'https://consumerhelpline.gov.in',
      sourceUrl: 'https://consumerhelpline.gov.in',
      lastVerifiedAt: '', // empty to trigger "Not yet verified: open the official site to confirm"
      legalStatus: 'Pre-litigation conciliation',
      verifyBeforeLaunch: true,
    },
    {
      id: 'ejagriti',
      title: 'e-Jagriti (Consumer Commission)',
      tagline: 'Formal consumer commission filing before District, State, and National benches',
      description:
        'Digital portal under Consumer Protection Act, 2019 for filing cases before District, State, and National Consumer Disputes Redressal Commissions without needing a lawyer.',
      contact: 'Digital e-filing across 650+ District Commissions',
      webUrl: 'https://e-jagriti.gov.in/',
      sourceUrl: 'https://e-jagriti.gov.in/',
      lastVerifiedAt: '', // empty to trigger "Not yet verified: open the official site to confirm"
      legalStatus: 'Consumer Commission Filing',
      verifyBeforeLaunch: true,
    },
    {
      id: 'rbi',
      title: 'RBI Integrated Ombudsman',
      tagline: 'Failed UPI, Net Banking, or Debit Card reversals',
      description:
        'Applicable when an e-commerce platform provides a UTR/RRN payment reference claiming refund was sent, but the recipient bank account shows no credit after T+1 to T+5 turnaround days.',
      contact: 'Toll-free 14448 (9:30 AM to 5:15 PM) or CMS Portal / SMS 14448',
      webUrl: 'https://cms.rbi.org.in',
      sourceUrl: 'https://cms.rbi.org.in',
      lastVerifiedAt: '', // empty to trigger "Not yet verified: open the official site to confirm"
      legalStatus: 'Banking Regulatory Ombudsman',
      verifyBeforeLaunch: true,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/60 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>India Official Consumer Rights & Routes</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-serif text-neutral-900 dark:text-neutral-100">
          Know Your Official Grievance Routes
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl">
          Plain-language verified guidance for Indian consumers. General informational starting points, not legal advice. Always check official government portals.
        </p>
      </div>

      {/* Decision Tree: Which Route Fits? (Signature Feature #8) */}
      <Card variant="elevated" className="border-l-4 border-l-brand-500 p-6 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Interactive Route Decision Tree
          </span>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            Which route fits your problem?
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-0.5">
            Answer 2 quick factual questions to find whether company escalation, NCH 1915, RBI Ombudsman, or e-Jagriti is appropriate.
          </p>
        </div>

        {decisionStep === null && (
          <Button variant="primary" size="md" onClick={() => setDecisionStep(1)}>
            <span>Start Decision Tree</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}

        {decisionStep === 1 && (
          <div className="p-5 rounded-xl bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 space-y-4 animate-in fade-in">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Question 1: Have you already lodged a formal complaint with the company's customer care?
            </h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm" onClick={() => setDecisionStep(2)}>
                Yes, I lodged a ticket and have a reference / ticket number
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(101)}>
                No, I haven't contacted them yet
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 101 && (
          <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Recommended First Step: Lodge Formal Ticket with Merchant</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Under Indian consumer law and NCH rules, statutory commissions require proof that you first gave the merchant an opportunity to rectify the issue. Use our Proof Pack builder to generate a formal complaint letter and submit it via the merchant's support channel.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setDecisionStep(null)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Reset Decision Tree</span>
            </Button>
          </div>
        )}

        {decisionStep === 2 && (
          <div className="p-5 rounded-xl bg-white dark:bg-surface-dark border border-neutral-200 dark:border-neutral-800 space-y-4 animate-in fade-in">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Question 2: What is the current status of the dispute?
            </h4>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => setDecisionStep(201)}>
                Seller rejected return, item defective, or no reply for 4+ days
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDecisionStep(202)}>
                Seller claims refund was sent via UPI, but money not received
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDecisionStep(203)}>
                High-value claim (over ₹20,000) where NCH failed to resolve
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 201 && (
          <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold text-sm">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Best Route: National Consumer Helpline (NCH - 1915)</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              NCH handles pre-litigation convergence for consumer durables and e-commerce. Call 1915 or register your docket online at consumerhelpline.gov.in. Include your order ID and invoice proof pack.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://consumerhelpline.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <span>Open NCH Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 202 && (
          <div className="p-5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold text-sm">
              <Scale className="w-4 h-4 text-purple-600" />
              <span>Best Route: Bank Grievance Officer & RBI Integrated Ombudsman</span>
            </div>
            <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
              If the store provided a 12-digit UTR/RRN number, request a Written Beneficiary Confirmation from your bank. If the bank fails to trace or credit the funds within 30 days, lodge a complaint with the RBI Ombudsman at cms.rbi.org.in or call 14448.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
              >
                <span>Open RBI CMS Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 203 && (
          <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Best Route: e-Jagriti (District Consumer Commission)</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              When informal mediation via NCH fails, file a formal complaint under Section 35 of the Consumer Protection Act, 2019 via the official e-Jagriti portal. Consumers can file in their own district without hiring an advocate.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://e-jagriti.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <span>Open e-Jagriti Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Official Directory Cards with Cited, Dated Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {officialRoutes.map((r) => (
          <Card key={r.id} variant="default" className="p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                  {r.legalStatus}
                </span>
                {r.verifyBeforeLaunch && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Verify before launch
                  </span>
                )}
              </div>

              <div className="text-[11px] mb-2">
                {r.lastVerifiedAt ? (
                  <span className="text-neutral-500">
                    Verified {new Date(r.lastVerifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                ) : (
                  <span className="text-amber-800 dark:text-amber-300 font-medium">
                    Not yet verified: open the official site to confirm
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {r.title}
              </h3>
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                {r.tagline}
              </p>

              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {r.description}
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{r.contact}</span>
              </div>

              <a
                href={r.sourceUrl || r.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <span>Visit Official Government Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

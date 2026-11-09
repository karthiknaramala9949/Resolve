'use client';

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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-steel-grey-50 text-steel-grey-700 border border-steel-grey-200 text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5 text-coral" />
          <span>India Official Consumer Rights & Routes</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black font-sans text-charcoal tracking-tight">
          Know Your Official Grievance <span className="text-coral">Routes</span>
        </h2>
        <p className="text-sm text-steel-grey-600 mt-1 max-w-2xl font-normal">
          Plain-language verified guidance for Indian consumers. General informational starting points, not legal advice. Always check official government portals.
        </p>
      </div>

      {/* Decision Tree: Which Route Fits? (Signature Feature #8) */}
      <Card variant="elevated" className="border border-steel-grey-200 border-l-4 border-l-coral bg-white p-6 rounded-2xl shadow-xs space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-coral">
            Interactive Route Decision Tree
          </span>
          <h3 className="text-lg font-bold text-charcoal mt-1">
            Which route fits your problem?
          </h3>
          <p className="text-sm text-steel-grey-600 mt-0.5">
            Answer 2 quick factual questions to find whether company escalation, NCH 1915, RBI Ombudsman, or e-Jagriti is appropriate.
          </p>
        </div>

        {decisionStep === null && (
          <Button variant="primary" size="md" onClick={() => setDecisionStep(1)} className="shadow-sm">
            <span>Start Decision Tree</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Button>
        )}

        {decisionStep === 1 && (
          <div className="p-5 rounded-xl bg-steel-grey-50/50 border border-steel-grey-200 space-y-4 animate-in fade-in">
            <h4 className="text-sm font-bold text-charcoal">
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
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Recommended First Step: Lodge Formal Ticket with Merchant</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-normal">
              Under Indian consumer law and NCH rules, statutory commissions require proof that you first gave the merchant an opportunity to rectify the issue. Use our Proof Pack builder to generate a formal complaint letter and submit it via the merchant's support channel.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setDecisionStep(null)}>
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Decision Tree</span>
            </Button>
          </div>
        )}

        {decisionStep === 2 && (
          <div className="p-5 rounded-xl bg-steel-grey-50/50 border border-steel-grey-200 space-y-4 animate-in fade-in">
            <h4 className="text-sm font-bold text-charcoal">
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
          <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Best Route: National Consumer Helpline (NCH - 1915)</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed font-normal">
              NCH handles pre-litigation convergence for consumer durables and e-commerce. Call 1915 or register your docket online at consumerhelpline.gov.in. Include your order ID and invoice proof pack.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://consumerhelpline.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors leading-none"
              >
                <span>Open NCH Portal</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 202 && (
          <div className="p-5 rounded-xl bg-purple-50 border border-purple-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <Scale className="w-4 h-4 text-purple-600" />
              <span>Best Route: Bank Grievance Officer & RBI Integrated Ombudsman</span>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed font-normal">
              If the store provided a 12-digit UTR/RRN number, request a Written Beneficiary Confirmation from your bank. If the bank fails to trace or credit the funds within 30 days, lodge a complaint with the RBI Ombudsman at cms.rbi.org.in or call 14448.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors leading-none"
              >
                <span>Open RBI CMS Portal</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 203 && (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Best Route: e-Jagriti (District Consumer Commission)</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed font-normal">
              When informal mediation via NCH fails, file a formal complaint under Section 35 of the Consumer Protection Act, 2019 via the official e-Jagriti portal. Consumers can file in their own district without hiring an advocate.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://e-jagriti.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors leading-none"
              >
                <span>Open e-Jagriti Portal</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
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
          <Card key={r.id} variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-steel-grey-600 uppercase tracking-wider text-[10px]">
                  {r.legalStatus}
                </span>
                {r.verifyBeforeLaunch && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Verify before launch
                  </span>
                )}
              </div>

              <div className="text-[11px] mb-2">
                {r.lastVerifiedAt ? (
                  <span className="text-steel-grey-500">
                    Verified {new Date(r.lastVerifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium">
                    Not yet verified: open the official site to confirm
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-charcoal">
                {r.title}
              </h3>
              <p className="text-xs font-medium text-steel-grey-500 mt-0.5">
                {r.tagline}
              </p>

              <p className="mt-3 text-sm text-steel-grey-600 leading-relaxed font-normal">
                {r.description}
              </p>
            </div>

            <div className="pt-4 border-t border-steel-grey-100 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-charcoal">
                <Phone className="w-3.5 h-3.5 text-coral shrink-0" />
                <span>{r.contact}</span>
              </div>

              <a
                href={r.sourceUrl || r.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl border border-steel-grey-200 bg-steel-grey-50 text-xs font-bold text-charcoal hover:border-coral hover:text-coral transition-all leading-none min-h-[44px]"
              >
                <span>Visit Official Government Site</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-coral" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

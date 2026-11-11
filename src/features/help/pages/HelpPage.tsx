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
      contact: 'Call 1915 or 1800-11-4000 (Toll Free, 8 AM - 8 PM) / WhatsApp 8800001915',
      webUrl: 'https://consumerhelpline.gov.in',
      sourceUrl: 'https://consumerhelpline.gov.in',
      lastVerifiedAt: '',
      legalStatus: 'Informal resolution before court',
      verifyBeforeLaunch: true,
    },
    {
      id: 'ejagriti',
      title: 'e-Jagriti (Consumer Commission)',
      tagline: 'Formal consumer commission filing before District, State, and National benches',
      description:
        'Digital portal under Consumer Protection Act, 2019 for filing cases before District, State, and National Consumer Disputes Redressal Commissions without needing an advocate.',
      contact: 'Digital e-filing across 650+ District Commissions',
      webUrl: 'https://e-jagriti.gov.in/',
      sourceUrl: 'https://e-jagriti.gov.in/',
      lastVerifiedAt: '',
      legalStatus: 'Official consumer court',
      verifyBeforeLaunch: true,
    },
    {
      id: 'rbi',
      title: 'RBI Integrated Ombudsman',
      tagline: 'Failed UPI, Net Banking, or Debit Card reversals',
      description:
        'Applicable when an e-commerce platform provides a UTR/RRN payment reference claiming refund was sent, but the recipient bank account shows no credit after turnaround days.',
      contact: 'Toll-free 14448 (9:30 AM to 5:15 PM) or CMS Portal / SMS 14448',
      webUrl: 'https://cms.rbi.org.in',
      sourceUrl: 'https://cms.rbi.org.in',
      lastVerifiedAt: '',
      legalStatus: 'Banking complaints & refunds',
      verifyBeforeLaunch: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-steel-grey-100 text-steel-grey-700 border border-steel-grey-200 text-xs font-normal mb-2">
          <BookOpen className="w-3.5 h-3.5 text-coral" />
          <span>India official consumer rights & routes</span>
        </div>
        <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
          Official grievance routes
        </h2>
        <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 max-w-2xl font-normal">
          Plain-language verified guidance for Indian consumers. General informational starting points, not formal legal advice.
        </p>
      </div>

      {/* Decision Tree: Which Route Fits? */}
      <Card variant="elevated" className="border border-steel-grey-200 bg-white p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div>
          <span className="text-xs font-medium text-coral">
            Interactive route guide
          </span>
          <h3 className="text-base sm:text-lg font-medium text-charcoal mt-0.5">
            Which route fits your problem?
          </h3>
          <p className="text-xs sm:text-sm text-steel-grey-600 mt-0.5 font-normal">
            Answer 2 quick factual questions to find whether merchant escalation, NCH 1915, RBI Ombudsman, or e-Jagriti is appropriate.
          </p>
        </div>

        {decisionStep === null && (
          <Button variant="primary" size="md" onClick={() => setDecisionStep(1)} className="shadow-2xs">
            <span>Start decision guide</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Button>
        )}

        {decisionStep === 1 && (
          <div className="p-4 sm:p-5 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-3 animate-in fade-in">
            <h4 className="text-xs sm:text-sm font-medium text-charcoal">
              Question 1: Have you already lodged a formal complaint with the store&apos;s customer care?
            </h4>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="primary" size="sm" onClick={() => setDecisionStep(2)}>
                Yes, I have a ticket or reference number
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(101)}>
                No, I haven&apos;t contacted them yet
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 101 && (
          <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-900 font-medium text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Recommended first step: Contact the store or seller</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-normal">
              Official consumer commissions require proof that you first gave the store an opportunity to fix the issue. Use our proof pack builder to prepare a formal complaint letter and submit it to the store&apos;s customer service.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setDecisionStep(null)}>
              <RefreshCw className="w-3 h-3 shrink-0" />
              <span>Reset guide</span>
            </Button>
          </div>
        )}

        {decisionStep === 2 && (
          <div className="p-4 sm:p-5 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-3 animate-in fade-in">
            <h4 className="text-xs sm:text-sm font-medium text-charcoal">
              Question 2: What is the current status of the dispute?
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDecisionStep(201)}>
                Seller rejected return or no reply for 4+ days
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDecisionStep(202)}>
                Seller claims refund was sent, but money not in bank
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDecisionStep(203)}>
                High-value claim where NCH failed to resolve
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 201 && (
          <div className="p-4 sm:p-5 rounded-xl bg-blue-50 border border-blue-200 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-blue-900 font-medium text-xs sm:text-sm">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Recommended route: National Consumer Helpline (NCH - 1915)</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed font-normal">
              NCH helps resolve consumer disputes directly with companies before going to court. Call 1915 or register online at consumerhelpline.gov.in with your order details and proof pack.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://consumerhelpline.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors leading-none"
              >
                <span>Open NCH portal</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 202 && (
          <div className="p-4 sm:p-5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-900 font-medium text-xs sm:text-sm">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>Recommended route: Bank Grievance Officer & RBI Integrated Ombudsman</span>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed font-normal">
              If the store provided a 12-digit transaction number, ask your bank for written confirmation. If the bank fails to trace or credit the funds, lodge a complaint with the RBI Ombudsman at cms.rbi.org.in or call 14448.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 text-white text-xs font-medium hover:bg-indigo-800 transition-colors leading-none"
              >
                <span>Open RBI CMS portal</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {decisionStep === 203 && (
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-900 font-medium text-xs sm:text-sm">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Recommended route: e-Jagriti (District Consumer Commission)</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed font-normal">
              When informal resolution with the company or NCH does not solve the issue, file a formal complaint through the official e-Jagriti portal. You can file in your own district without hiring a lawyer.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://e-jagriti.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition-colors leading-none"
              >
                <span>Open e-Jagriti portal</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setDecisionStep(null)}>
                Reset
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Official Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {officialRoutes.map((r) => (
          <Card key={r.id} variant="default" className="p-5 flex flex-col justify-between space-y-4 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-normal text-steel-grey-600 text-[11px]">
                  {r.legalStatus}
                </span>
                {r.verifyBeforeLaunch && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-amber-50 text-amber-900 border border-amber-200">
                    Verify before launch
                  </span>
                )}
              </div>

              <h3 className="text-base font-serif font-medium text-charcoal">
                {r.title}
              </h3>
              <p className="text-xs text-steel-grey-500 mt-0.5 font-normal">
                {r.tagline}
              </p>

              <p className="mt-2.5 text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                {r.description}
              </p>
            </div>

            <div className="pt-3 border-t border-steel-grey-100 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-normal text-steel-grey-700">
                <Phone className="w-3.5 h-3.5 text-coral shrink-0" />
                <span>{r.contact}</span>
              </div>

              <a
                href={r.sourceUrl || r.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-steel-grey-200 bg-steel-grey-50 text-xs font-medium text-charcoal hover:border-steel-grey-300 hover:text-coral transition-colors leading-none min-h-[38px]"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-coral" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

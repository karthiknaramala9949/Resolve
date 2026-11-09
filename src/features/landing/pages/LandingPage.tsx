'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/design-system';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Scale,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  IndianRupee,
  Hash,
  Ban,
} from 'lucide-react';
import { parseComplaintText } from '@/lib/rules/intakeParser';

export const LandingPage: React.FC = () => {
  const router = useRouter();

  // Interactive Live Demo in Hero
  const [demoText, setDemoText] = useState(
    'I ordered a phone case from Example Store for ₹499 on Oct 28. Order #EX-2048. I returned it via pickup on Oct 30 but refund has not arrived in my account.'
  );
  const parsedDemo = parseComplaintText(demoText);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const faqs = [
    {
      q: 'Does RESOLVE-ONE contact the company or send emails on my behalf?',
      a: 'Never. RESOLVE-ONE operates with 100% customer approval at every step. We compile your proof, verify return window math, and format complaint letters, but you approve and copy-paste every submission yourself. We never auto-send or claim live commercial API connections.',
    },
    {
      q: 'Will RESOLVE-ONE ever ask for my passwords or banking OTPs?',
      a: 'Absolutely not. We have an unshakeable boundary against collecting passwords, OTPs, session cookies, CVVs, or banking PINs. All data processing is strictly local.',
    },
    {
      q: 'How is this different from traditional legal-tech or automated bots?',
      a: 'Most services claim "AI lawyers" or promise guaranteed refunds that do not exist in reality. RESOLVE-ONE is completely honest: our text extraction runs on transparent in-browser rules, and we strictly separate "Company says refund initiated" from "Customer confirms money received in bank".',
    },
    {
      q: 'Where is my data stored? Can anyone else see my invoices?',
      a: 'Your data is stored 100% locally in your browser using IndexedDB. No remote servers, no cloud tracking, and no external telemetry. You can export or delete all data in one tap at any time.',
    },
    {
      q: 'When should I use NCH (1915) versus e-Jagriti?',
      a: 'Start with NCH (National Consumer Helpline at 1915 or consumerhelpline.gov.in) for quick, informal pre-litigation mediation with e-commerce and retail brands. If informal mediation fails after 15 days or the claim is high-value, file a formal complaint under Section 35 of the CPA 2019 via e-Jagriti (e-jagriti.gov.in), which does not require hiring an advocate.',
    },
    {
      q: 'How does the Return Window Countdown work?',
      a: 'Our Return Vault calculates exact calendar days remaining from the confirmed delivery date using verified retailer policies (e.g. 7 days for electronics, 10 days for fashion). As the deadline approaches, the countdown turns amber and red, ensuring you never forfeit your right to return.',
    },
    {
      q: 'Can I use RESOLVE-ONE completely offline?',
      a: 'Yes. RESOLVE-ONE is an installable Progressive Web App (PWA) with offline caching and IndexedDB storage. Once loaded, you can draft complaints, check return deadlines, organize proof files, and generate proof packs completely offline.',
    },
    {
      q: 'What happens if I forget my local encryption passphrase?',
      a: 'Because RESOLVE-ONE has zero remote backend servers or user accounts, there is no master reset key. If you enable client-side AES-256-GCM encryption with a passphrase, only that exact passphrase can decrypt your records. We recommend keeping a downloaded JSON backup in a safe location.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-charcoal selection:bg-coral-100 selection:text-coral-900">
      {/* Top Header - Clean Plain Navbar matching App Shell */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-steel-grey-200 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-coral flex items-center justify-center text-white font-serif font-black text-xl shadow-xs">
              R
            </div>
            <span className="font-serif font-black text-xl tracking-tight text-charcoal">RESOLVE-ONE</span>
            <span className="hidden sm:inline-flex items-center text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-steel-grey-50 text-steel-grey-700 font-medium border border-steel-grey-200 leading-none">
              India Consumer Care
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wide uppercase text-steel-grey-600">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="hover:text-coral transition-colors"
            >
              How it Works
            </a>
            <a
              href="#rights"
              onClick={(e) => scrollToSection(e, 'rights')}
              className="hover:text-coral transition-colors"
            >
              Your Rights
            </a>
            <a
              href="#privacy"
              onClick={(e) => scrollToSection(e, 'privacy')}
              className="hover:text-coral transition-colors"
            >
              Honesty Manifesto
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="hover:text-coral transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/app/overview')}
              className="hidden sm:inline-flex bg-steel-grey-50 hover:bg-steel-grey-100 text-charcoal border border-steel-grey-200 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
            >
              Open App
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/app/cases?new=true')}
              className="bg-coral hover:bg-coral-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Start in 60s</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 md:px-8 pt-14 md:pt-24 pb-16 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-steel-grey-50 border border-steel-grey-200 text-charcoal text-xs font-semibold shadow-xs leading-none">
          <span className="w-2 h-2 rounded-full bg-coral animate-pulse shrink-0" />
          <span>India-First Consumer Dispute Resolution</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto text-charcoal font-sans">
          Sort it out. <br className="hidden sm:block" />
          One step at a <span className="text-coral">time</span>.
        </h1>

        <p className="text-lg md:text-xl text-steel-grey-600 max-w-2xl mx-auto leading-relaxed font-normal">
          Stuck with a rejected refund, damaged delivery, or warranty runaround? Turn your stressful complaint into an organized dispute pack and official escalation in under 3 minutes.
        </p>

        {/* Live Interactive Hero Demo Card */}
        <div className="max-w-2xl mx-auto pt-6 text-left">
          <Card variant="elevated" className="p-5 md:p-7 space-y-4 border-steel-grey-200 bg-white shadow-lg rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-coral inline-flex items-center gap-1.5 leading-none">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Interactive Live Demo — Try Typing or Editing</span>
              </span>
              <span className="text-[11px] font-mono text-steel-grey-600 font-medium px-2 py-0.5 rounded bg-steel-grey-50 border border-steel-grey-200 leading-none">
                100% Client-Side Rules
              </span>
            </div>

            <textarea
              rows={3}
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-steel-grey-200 bg-steel-grey-50/50 text-charcoal text-sm leading-relaxed focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 font-sans transition-all"
              placeholder="Type your dispute here..."
            />

            {/* Live extracted chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-steel-grey-600 block">
                Extracted Facts (Instant Browser Heuristics)
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {parsedDemo.company && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-steel-grey-50 border border-steel-grey-200 text-charcoal font-semibold shadow-2xs leading-none">
                    <Building2 className="w-3.5 h-3.5 text-steel-grey-500 shrink-0" />
                    <span>Company: {parsedDemo.company}</span>
                  </span>
                )}
                {parsedDemo.issueType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral-50 border border-coral-200 text-coral font-semibold shadow-2xs leading-none">
                    <Tag className="w-3.5 h-3.5 text-coral shrink-0" />
                    <span>Issue: {parsedDemo.issueType}</span>
                  </span>
                )}
                {parsedDemo.amount !== null && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-steel-grey-50 border border-steel-grey-200 text-charcoal font-semibold shadow-2xs leading-none">
                    <IndianRupee className="w-3.5 h-3.5 text-coral shrink-0" />
                    <span>₹{parsedDemo.amount}</span>
                  </span>
                )}
                {parsedDemo.orderRef && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-steel-grey-50 border border-steel-grey-200 text-charcoal font-mono font-medium shadow-2xs leading-none">
                    <Hash className="w-3.5 h-3.5 text-steel-grey-500 shrink-0" />
                    <span>Ref: {parsedDemo.orderRef}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-steel-grey-100">
              <span className="text-xs text-steel-grey-600 font-medium leading-snug">
                Notice: All parsing runs client-side. Zero cloud transmission.
              </span>
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto shrink-0 bg-coral hover:bg-coral-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all"
                onClick={() =>
                  router.push(
                    `/app/cases?new=true&store=${encodeURIComponent(parsedDemo.company)}&orderRef=${encodeURIComponent(
                      parsedDemo.orderRef
                    )}&amount=${parsedDemo.amount || ''}&story=${encodeURIComponent(demoText)}`
                  )
                }
              >
                <span>Convert to Case</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-semibold text-charcoal">
          <div className="inline-flex items-center gap-2 leading-none">
            <Lock className="w-4 h-4 text-steel-grey-500 shrink-0" />
            <span>100% On-Device IndexedDB</span>
          </div>
          <div className="inline-flex items-center gap-2 leading-none">
            <ShieldCheck className="w-4 h-4 text-steel-grey-500 shrink-0" />
            <span>Never Auto-Sends Without Approval</span>
          </div>
          <div className="inline-flex items-center gap-2 leading-none">
            <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
            <span>Zero Passwords or OTPs</span>
          </div>
        </div>
      </section>

      {/* How it Works: 3 Steps */}
      <section id="how-it-works" className="scroll-mt-20 px-4 md:px-8 py-20 bg-steel-grey-50/50 border-y border-steel-grey-200">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal font-sans">
              How RESOLVE-ONE <span className="text-coral">Works</span>
            </h2>
            <p className="text-base text-steel-grey-600 max-w-md mx-auto">
              A calm, competent friend who handles the paperwork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="subtle" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200 rounded-2xl hover:border-steel-grey-300 hover:shadow-sm transition-all shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-charcoal text-white font-bold text-lg flex items-center justify-center font-mono shadow-xs">
                1
              </div>
              <h3 className="text-lg font-bold text-charcoal">Tell us what happened</h3>
              <p className="text-sm text-steel-grey-600 leading-relaxed font-normal">
                Describe the problem in plain words or voice note. Transparent rule heuristics extract company name, order ID, amount, and dates into editable chips in seconds.
              </p>
            </Card>

            <Card variant="subtle" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200 rounded-2xl hover:border-steel-grey-300 hover:shadow-sm transition-all shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-charcoal text-white font-bold text-lg flex items-center justify-center font-mono shadow-xs">
                2
              </div>
              <h3 className="text-lg font-bold text-charcoal">Follow exactly one Next Step</h3>
              <p className="text-sm text-steel-grey-600 leading-relaxed font-normal">
                No 40-step confusion. We show one clear action—like attaching a defect photo or verifying return window math—with transparent reasons why.
              </p>
            </Card>

            <Card variant="subtle" className="p-6 sm:p-7 space-y-4 bg-white border border-steel-grey-200 rounded-2xl hover:border-steel-grey-300 hover:shadow-sm transition-all shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-charcoal text-white font-bold text-lg flex items-center justify-center font-mono shadow-xs">
                3
              </div>
              <h3 className="text-lg font-bold text-charcoal">Export Proof & Escalate</h3>
              <p className="text-sm text-steel-grey-600 leading-relaxed font-normal">
                Export a clean, client-side PDF Proof Pack with SHA-256 hashes. Copy formal dispute letters directly into NCH 1915 or company escalation forms.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Honesty Boundaries Manifesto - Plain Clean Section */}
      <section id="privacy" className="scroll-mt-20 px-4 md:px-8 py-20 bg-white space-y-10">
        <div className="text-center space-y-3 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-steel-grey-50 text-steel-grey-700 text-xs font-semibold border border-steel-grey-200">
            <Scale className="w-3.5 h-3.5 text-coral" />
            <span>Honesty Manifesto</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal font-sans">
            What RESOLVE-ONE Never <span className="text-coral">Does</span>
          </h2>
          <p className="text-sm sm:text-base text-steel-grey-600 max-w-xl mx-auto leading-relaxed">
            Our uncompromised ethical boundaries protect your privacy, security, and peace of mind.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl border border-steel-grey-200 bg-steel-grey-50/50 text-charcoal space-y-2 hover:border-steel-grey-300 transition-colors shadow-xs">
            <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never collects credentials</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              We strictly prohibit asking for passwords, OTPs, session cookies, or banking PINs. You maintain 100% security.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-steel-grey-200 bg-steel-grey-50/50 text-charcoal space-y-2 hover:border-steel-grey-300 transition-colors shadow-xs">
            <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never claims fake AI</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              All text extraction uses honest, transparent in-browser heuristics. No simulated LLM hallucinations or phantom legal advice.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-steel-grey-200 bg-steel-grey-50/50 text-charcoal space-y-2 hover:border-steel-grey-300 transition-colors shadow-xs">
            <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never contacts anyone for you</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              You review, approve, and send every complaint yourself. RESOLVE-ONE never acts autonomously.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-steel-grey-200 bg-steel-grey-50/50 text-charcoal space-y-2 hover:border-steel-grey-300 transition-colors shadow-xs">
            <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never confuses promises with money</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              "Company says refund initiated" and "Customer verified in bank" are strictly kept separate until you confirm receipt.
            </p>
          </div>
        </div>
      </section>

      {/* India Routes Teaser */}
      <section id="rights" className="scroll-mt-20 px-4 md:px-8 py-20 bg-steel-grey-50/50 border-y border-steel-grey-200">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal font-sans">
              India-Specific Escalation <span className="text-coral">Channels</span>
            </h2>
            <p className="text-sm sm:text-base text-steel-grey-600 max-w-lg mx-auto">
              Direct connections to official government and regulatory helplines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-charcoal font-semibold bg-steel-grey-50 px-2.5 py-1 rounded-lg border border-steel-grey-200">
                    Toll Free 1915 / WA 8800001915
                  </span>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap leading-none">
                    Verify before launch
                  </span>
                </div>
                <div className="text-[11px] text-steel-grey-500 font-medium leading-none">
                  Not yet verified: open official site to confirm
                </div>
                <h3 className="text-lg font-bold text-charcoal">National Consumer Helpline (NCH)</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Department of Consumer Affairs convergence channel resolving e-commerce and retail disputes in days.
                </p>
              </div>
              <a
                href="https://consumerhelpline.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-charcoal hover:text-coral transition-colors pt-3 border-t border-steel-grey-100 group"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-4 h-4 text-coral group-hover:translate-x-0.5 transition-transform" />
              </a>
            </Card>

            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-charcoal font-semibold bg-steel-grey-50 px-2.5 py-1 rounded-lg border border-steel-grey-200">
                    e-jagriti.gov.in
                  </span>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap leading-none">
                    Verify before launch
                  </span>
                </div>
                <div className="text-[11px] text-steel-grey-500 font-medium leading-none">
                  Not yet verified: open official site to confirm
                </div>
                <h3 className="text-lg font-bold text-charcoal">e-Jagriti (Consumer Commission)</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Online consumer commission filing before District, State, and National Commissions under CPA 2019 without advocates.
                </p>
              </div>
              <a
                href="https://e-jagriti.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-charcoal hover:text-coral transition-colors pt-3 border-t border-steel-grey-100 group"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-4 h-4 text-coral group-hover:translate-x-0.5 transition-transform" />
              </a>
            </Card>

            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-white border border-steel-grey-200 rounded-2xl shadow-xs hover:border-steel-grey-300 hover:shadow-sm transition-all">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-charcoal font-semibold bg-steel-grey-50 px-2.5 py-1 rounded-lg border border-steel-grey-200">
                    Toll Free 14448 / SMS 14448
                  </span>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap leading-none">
                    Verify before launch
                  </span>
                </div>
                <div className="text-[11px] text-steel-grey-500 font-medium leading-none">
                  Not yet verified: open official site to confirm
                </div>
                <h3 className="text-lg font-bold text-charcoal">RBI Integrated Ombudsman</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Mandatory turnaround resolution for failed UPI refunds, net banking, or debit card reversal discrepancies.
                </p>
              </div>
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-charcoal hover:text-coral transition-colors pt-3 border-t border-steel-grey-100 group"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-4 h-4 text-coral group-hover:translate-x-0.5 transition-transform" />
              </a>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="scroll-mt-20 px-4 md:px-8 py-20 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal font-sans">
            Frequently Asked <span className="text-coral">Questions</span>
          </h2>
          <p className="text-base text-steel-grey-600 max-w-md mx-auto">Everything you need to know about RESOLVE-ONE.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-steel-grey-200 rounded-2xl bg-white overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-charcoal hover:text-coral transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5 shrink-0 text-coral" /> : <ChevronDown className="w-5 h-5 shrink-0 text-steel-grey-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-steel-grey-600 leading-relaxed border-t border-steel-grey-100 pt-3 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pre-Footer Call to Action Banner - Plain Clean Card */}
      <section className="px-4 md:px-8 py-16 bg-steel-grey-50/50 border-t border-steel-grey-200">
        <div className="max-w-4xl mx-auto rounded-3xl bg-white p-8 sm:p-12 text-center space-y-6 shadow-sm border border-steel-grey-200">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-charcoal font-sans">
            Resolve Disputes Beyond <span className="text-coral">Limits</span>
          </h2>
          <p className="text-sm sm:text-base text-steel-grey-600 max-w-xl mx-auto leading-relaxed">
            Zero signups required. 100% private and on-device. Turn order numbers and frustration into structured resolution in minutes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/app/cases?new=true')}
              className="w-full sm:w-auto bg-coral hover:bg-coral-600 text-white font-bold px-8 shadow-sm text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Start Your Case Now</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/app/overview')}
              className="w-full sm:w-auto bg-steel-grey-50 hover:bg-steel-grey-100 text-charcoal border border-steel-grey-200 font-semibold px-7 text-sm transition-all"
            >
              Open Workspace
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Clean Plain Footer */}
      <footer className="bg-white border-t border-steel-grey-200 py-12 px-4 text-center text-xs text-steel-grey-600 font-medium space-y-4">
        <p className="font-semibold text-charcoal">
          <span className="text-charcoal font-bold">RESOLVE-ONE</span> · Award-Grade Consumer Dispute Resolution for India · Offline-First PWA
        </p>
        <p className="max-w-xl mx-auto text-steel-grey-500 leading-relaxed">
          General informational guidance only. Not legal advice. Direct all formal legal disputes through official Consumer Commissions under the Consumer Protection Act, 2019.
        </p>
        <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-steel-grey-600 font-semibold">
          <button type="button" onClick={() => router.push('/app/overview')} className="hover:text-coral hover:underline transition-colors">
            Consumer Workspace
          </button>
          <span className="text-steel-grey-300">•</span>
          <button type="button" onClick={() => router.push('/app/privacy')} className="hover:text-coral hover:underline transition-colors">
            Privacy & Trust
          </button>
        </div>
      </footer>
    </div>
  );
};

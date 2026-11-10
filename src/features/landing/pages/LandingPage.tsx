'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/design-system';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Scale,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  IndianRupee,
  Hash,
  Ban,
  FileText,
  Clock,
  Fingerprint,
  SlidersHorizontal,
} from 'lucide-react';
import { parseComplaintText } from '@/lib/rules/intakeParser';

export const LandingPage: React.FC = () => {
  const router = useRouter();

  // Interactive Live Demo tab state
  const [activeTab, setActiveTab] = useState<'docket' | 'try'>('docket');
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
      a: 'Never. RESOLVE-ONE operates with your explicit approval at every step. We compile your proof, verify return window deadlines, and draft formal complaint letters, but you review and submit every filing yourself. We never auto-send or connect to proprietary store APIs.',
    },
    {
      q: 'Will RESOLVE-ONE ever ask for my passwords or banking OTPs?',
      a: 'Never. We have an unshakeable boundary against requesting passwords, OTPs, session cookies, CVVs, or banking PINs. All data processing is strictly local to your browser.',
    },
    {
      q: 'How is this different from generic legal-tech portals or chatbots?',
      a: 'Most services make unverified claims about "AI lawyers" or promise guaranteed refunds that do not exist. RESOLVE-ONE is honest: our text extraction runs on transparent in-browser rules, and we strictly separate a company\'s promised refund from verified bank receipt.',
    },
    {
      q: 'Where is my data stored? Can anyone else see my invoices?',
      a: 'Your data is stored locally in your browser using IndexedDB. There are no remote tracking servers and no cloud telemetries. You can export or erase all records in one click at any time.',
    },
    {
      q: 'When should I use NCH (1915) versus e-Jagriti?',
      a: 'Start with NCH (National Consumer Helpline at 1915 or consumerhelpline.gov.in) for quick, informal pre-litigation mediation with major e-commerce brands. If informal mediation fails after 15 days or the claim is high-value, file a formal complaint under Section 35 of the CPA 2019 via e-Jagriti (e-jagriti.gov.in), which does not require hiring an advocate.',
    },
    {
      q: 'How does the Return Window Countdown work?',
      a: 'The Return Vault calculates exact calendar days remaining from the confirmed delivery date using verified retailer policies (such as 7 days for electronics or 10 days for fashion). It alerts you before deadlines expire so you never forfeit statutory rights.',
    },
    {
      q: 'Can I use RESOLVE-ONE completely offline?',
      a: 'Yes. RESOLVE-ONE is an installable Progressive Web App (PWA) with offline caching and IndexedDB storage. Once loaded, you can draft complaints, check return deadlines, organize evidence, and build proof packs completely offline.',
    },
    {
      q: 'What happens if I forget my local encryption passphrase?',
      a: 'Because RESOLVE-ONE has zero remote backend servers or user accounts, there is no master reset key. If you enable client-side AES-256-GCM encryption with a passphrase, only that exact passphrase can decrypt your records. We recommend keeping a downloaded JSON backup in a safe location.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-charcoal selection:bg-coral-100 selection:text-coral-900">
      {/* Top Header - Quiet, Dignified Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF8F4]/90 backdrop-blur-md border-b border-steel-grey-200 select-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center text-white font-serif font-medium text-lg shadow-2xs leading-none">
              R
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif font-medium text-xl tracking-tight text-charcoal">RESOLVE-ONE</span>
              <span className="hidden sm:inline-block text-xs text-steel-grey-500 font-normal">
                Consumer care
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-steel-grey-600 font-medium">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="hover:text-charcoal transition-colors"
            >
              How it works
            </a>
            <a
              href="#rights"
              onClick={(e) => scrollToSection(e, 'rights')}
              className="hover:text-charcoal transition-colors"
            >
              Official routes
            </a>
            <a
              href="#privacy"
              onClick={(e) => scrollToSection(e, 'privacy')}
              className="hover:text-charcoal transition-colors"
            >
              Honesty manifesto
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="hover:text-charcoal transition-colors"
            >
              Questions
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/app/overview')}
              className="hidden sm:inline-flex text-xs font-medium text-steel-grey-600 hover:text-charcoal transition-colors"
            >
              Open workspace
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/app/cases?new=true')}
              className="flex items-center gap-1.5"
            >
              <span>Start a case</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section: Asymmetric Split Layout */}
      <section className="px-4 sm:px-6 pt-12 md:pt-20 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Calm Editorial Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-steel-grey-100 border border-steel-grey-200 text-steel-grey-700 text-xs font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
              <span>Independent dispute support for India</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal tracking-tight text-charcoal leading-[1.05]">
              Turn paperwork into proof. Settle consumer disputes with confidence.
            </h1>

            <p className="text-base sm:text-lg text-steel-grey-600 leading-relaxed font-normal max-w-xl">
              Stuck with a rejected refund, damaged delivery, or warranty runaround? Organize receipts, calculate statutory return deadlines, and generate verified complaint letters in under 3 minutes.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/app/cases?new=true')}
                className="flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Tell us what happened</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/app/overview')}
                className="flex items-center justify-center"
              >
                Explore demo workspace
              </Button>
            </div>

            {/* Three Quiet Reassurance Points */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-steel-grey-600 font-normal">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
                <span>100% on-device storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
                <span>Never auto-submits filings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-coral shrink-0" />
                <span>Zero passwords or OTPs</span>
              </div>
            </div>
          </div>

          {/* Right Column: The Product Moment (Case Docket Preview & Interactive Parser) */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl border border-steel-grey-200 shadow-elevated overflow-hidden">
              {/* Tab Selector: Real Case Docket vs Interactive Parser */}
              <div className="flex items-center border-b border-steel-grey-200 bg-steel-grey-50 px-4 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('docket')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'docket'
                      ? 'border-coral text-charcoal'
                      : 'border-transparent text-steel-grey-500 hover:text-charcoal'
                  }`}
                >
                  Dispute docket preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('try')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'try'
                      ? 'border-coral text-charcoal'
                      : 'border-transparent text-steel-grey-500 hover:text-charcoal'
                  }`}
                >
                  Test local parser
                </button>
              </div>

              {activeTab === 'docket' ? (
                /* Tactile Case Docket Preview Card */
                <div className="p-6 space-y-5 text-left">
                  {/* Docket Header */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-steel-grey-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-steel-grey-500">
                          DOCKET-2026-0842
                        </span>
                        <span className="text-steel-grey-300">•</span>
                        <span className="text-xs text-steel-grey-500">Amazon India</span>
                      </div>
                      <h3 className="mt-1 text-lg font-serif font-medium text-charcoal">
                        Smart LED 55&quot; Display Defect on Delivery
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-lg font-medium text-charcoal tabular-nums">
                        ₹38,990.00
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200 mt-1">
                        Return window: 3 days left
                      </span>
                    </div>
                  </div>

                  {/* Evidence & Hash Integrity Seal */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-steel-grey-500 block">
                      Compiled evidence pack
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-steel-grey-600">
                      <div className="p-2.5 rounded-lg bg-steel-grey-50 border border-steel-grey-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
                          <span className="truncate">tax_invoice.pdf</span>
                        </div>
                        <span className="text-[10px] text-steel-grey-400">92 KB</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-steel-grey-50 border border-steel-grey-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
                          <span className="truncate">unboxing_clip.mp4</span>
                        </div>
                        <span className="text-[10px] text-steel-grey-400">14 MB</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-steel-grey-500 pt-1">
                      <Fingerprint className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Local SHA-256 integrity seal: sha256:8f2a...c014</span>
                    </div>
                  </div>

                  {/* Priority Next Step Box */}
                  <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-coral">
                        Priority next step
                      </span>
                      <span className="text-[11px] text-steel-grey-500 font-mono">Day 4 of 7</span>
                    </div>
                    <p className="text-xs sm:text-sm text-charcoal font-medium">
                      Copy formal CPA Section 35 escalation letter into Amazon Grievance Officer portal.
                    </p>
                    <p className="text-xs text-steel-grey-600">
                      Standard customer support rejected refund citing courier handover. Statutory notice invokes Consumer Protection (E-Commerce) Rules, 2020.
                    </p>
                  </div>

                  {/* Action row */}
                  <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-steel-grey-500">
                      Zero cloud exposure · Verified on device
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push('/app/overview')}
                      className="shrink-0"
                    >
                      <span>Open this case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Interactive Browser Heuristics Tester */
                <div className="p-6 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-steel-grey-600 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-coral" />
                      <span>Edit or paste your dispute text below</span>
                    </span>
                    <span className="text-[11px] font-mono text-steel-grey-500 px-2 py-0.5 rounded bg-steel-grey-50 border border-steel-grey-200">
                      In-browser regex heuristics
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-steel-grey-200 bg-steel-grey-50/50 text-charcoal text-sm leading-relaxed focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral/30 font-sans transition-colors"
                    placeholder="Type your dispute details..."
                  />

                  {/* Extracted Facts */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-steel-grey-500">
                      Extracted facts
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {parsedDemo.company && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-steel-grey-50 border border-steel-grey-200 text-charcoal">
                          <Building2 className="w-3.5 h-3.5 text-steel-grey-500 shrink-0" />
                          <span>Store: {parsedDemo.company}</span>
                        </span>
                      )}
                      {parsedDemo.issueType && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coral-50 border border-coral-200 text-coral">
                          <Tag className="w-3.5 h-3.5 text-coral shrink-0" />
                          <span>Issue: {parsedDemo.issueType}</span>
                        </span>
                      )}
                      {parsedDemo.amount !== null && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-steel-grey-50 border border-steel-grey-200 text-charcoal font-mono tabular-nums">
                          <IndianRupee className="w-3.5 h-3.5 text-coral shrink-0" />
                          <span>₹{parsedDemo.amount}</span>
                        </span>
                      )}
                      {parsedDemo.orderRef && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-steel-grey-50 border border-steel-grey-200 text-charcoal font-mono">
                          <Hash className="w-3.5 h-3.5 text-steel-grey-500 shrink-0" />
                          <span>Ref: {parsedDemo.orderRef}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-steel-grey-100">
                    <span className="text-xs text-steel-grey-500">
                      Parsing runs completely in memory.
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/app/cases?new=true&store=${encodeURIComponent(parsedDemo.company)}&orderRef=${encodeURIComponent(
                            parsedDemo.orderRef
                          )}&amount=${parsedDemo.amount || ''}&story=${encodeURIComponent(demoText)}`
                        )
                      }
                      className="shrink-0"
                    >
                      <span>Convert to active case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works: 3 Numbered Steps */}
      <section id="how-it-works" className="scroll-mt-20 px-4 sm:px-6 py-20 bg-white border-y border-steel-grey-200">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-charcoal">
              How it works
            </h2>
            <p className="text-sm sm:text-base text-steel-grey-600 max-w-md mx-auto">
              A disciplined, step-by-step workflow for stressful dispute situations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F4] border border-steel-grey-200 space-y-3">
              <div className="font-serif text-2xl font-normal text-coral">
                01
              </div>
              <h3 className="text-base font-medium text-charcoal">Record the dispute in plain words</h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                Describe the problem in plain text or speech. In-browser heuristics extract the company name, order number, claimed amount, and delivery dates into clean chips.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F4] border border-steel-grey-200 space-y-3">
              <div className="font-serif text-2xl font-normal text-coral">
                02
              </div>
              <h3 className="text-base font-medium text-charcoal">Follow one clear next step</h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                No complex 40-step confusion. The engine highlights exactly one action to take next—such as filing an internal escalation before the 7-day return deadline lapses.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F4] border border-steel-grey-200 space-y-3">
              <div className="font-serif text-2xl font-normal text-coral">
                03
              </div>
              <h3 className="text-base font-medium text-charcoal">Export proof pack and escalate</h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                Generate an offline PDF proof pack complete with SHA-256 evidence fingerprints. Copy formal complaint letters directly into NCH 1915 or e-Jagriti portals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Honesty Boundaries Manifesto */}
      <section id="privacy" className="scroll-mt-20 px-4 sm:px-6 py-20 bg-[#FAF8F4] space-y-10">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-steel-grey-100 text-steel-grey-700 text-xs font-normal border border-steel-grey-200">
            <Scale className="w-3.5 h-3.5 text-coral" />
            <span>Honesty manifesto</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-charcoal">
            Four boundaries we never cross
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 max-w-lg mx-auto leading-relaxed">
            Consumer disputes are sensitive. Our architecture protects your privacy and peace of mind by design.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never collects credentials</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              We strictly prohibit asking for passwords, OTPs, session cookies, or banking PINs. You remain in complete control.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never claims phantom AI</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              All text extraction uses honest, deterministic in-browser heuristics. No hallucinations or simulated legal counsel.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never contacts parties on your behalf</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              You review, approve, and send every complaint yourself. RESOLVE-ONE never acts autonomously.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never confuses promises with money</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              &quot;Company says refund initiated&quot; and &quot;Customer confirmed in bank account&quot; are strictly separated until you verify receipt.
            </p>
          </div>
        </div>
      </section>

      {/* Official India Escalation Routes */}
      <section id="rights" className="scroll-mt-20 px-4 sm:px-6 py-20 bg-white border-y border-steel-grey-200">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-charcoal">
              Official escalation channels
            </h2>
            <p className="text-xs sm:text-sm text-steel-grey-600 max-w-lg mx-auto">
              Direct routes to statutory government helplines and regulatory commissions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-[#FAF8F4] border-steel-grey-200">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-charcoal font-medium bg-white px-2 py-0.5 rounded border border-steel-grey-200">
                    Toll Free 1915 / WA 8800001915
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                    Pre-litigation
                  </span>
                </div>
                <h3 className="text-base font-serif font-medium text-charcoal">National Consumer Helpline (NCH)</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Department of Consumer Affairs convergence channel resolving e-commerce and retail disputes through direct company escalations.
                </p>
              </div>
              <a
                href="https://consumerhelpline.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal hover:text-coral transition-colors pt-3 border-t border-steel-grey-200"
              >
                <span>Visit consumerhelpline.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5 text-coral" />
              </a>
            </Card>

            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-[#FAF8F4] border-steel-grey-200">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-charcoal font-medium bg-white px-2 py-0.5 rounded border border-steel-grey-200">
                    e-jagriti.gov.in
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-200">
                    Formal commission
                  </span>
                </div>
                <h3 className="text-base font-serif font-medium text-charcoal">e-Jagriti Consumer Commission</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Online consumer court filing before District, State, and National Commissions under CPA 2019 without requiring an advocate.
                </p>
              </div>
              <a
                href="https://e-jagriti.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal hover:text-coral transition-colors pt-3 border-t border-steel-grey-200"
              >
                <span>Visit e-jagriti.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5 text-coral" />
              </a>
            </Card>

            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4 bg-[#FAF8F4] border-steel-grey-200">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-charcoal font-medium bg-white px-2 py-0.5 rounded border border-steel-grey-200">
                    Toll Free 14448
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-900 border border-indigo-200">
                    Banking regulatory
                  </span>
                </div>
                <h3 className="text-base font-serif font-medium text-charcoal">RBI Integrated Ombudsman</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Turnaround resolution for failed UPI refunds, net banking debits, or card reversal discrepancies when reference IDs are disputed.
                </p>
              </div>
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal hover:text-coral transition-colors pt-3 border-t border-steel-grey-200"
              >
                <span>Visit cms.rbi.org.in</span>
                <ExternalLink className="w-3.5 h-3.5 text-coral" />
              </a>
            </Card>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="scroll-mt-20 px-4 sm:px-6 py-20 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-charcoal">
            Frequently asked questions
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 max-w-md mx-auto">Clear answers on privacy, storage, and procedures</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-steel-grey-200 rounded-2xl bg-white overflow-hidden transition-colors shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-medium text-sm sm:text-base text-charcoal hover:text-coral transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 shrink-0 text-coral" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0 text-steel-grey-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-steel-grey-600 leading-relaxed border-t border-steel-grey-100 pt-3 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pre-Footer Action Banner */}
      <section className="px-4 sm:px-6 py-16 bg-[#FAF8F4] border-t border-steel-grey-200">
        <div className="max-w-4xl mx-auto rounded-3xl bg-white p-8 sm:p-12 text-center space-y-5 shadow-xs border border-steel-grey-200">
          <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-charcoal">
            Ready to organize your dispute?
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 max-w-lg mx-auto leading-relaxed">
            Zero signups required. 100% private and on-device. Turn order numbers and frustration into structured resolution.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/app/cases?new=true')}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <span>Start your case</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/app/overview')}
              className="w-full sm:w-auto"
            >
              Open workspace
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-steel-grey-200 py-10 px-4 text-center text-xs text-steel-grey-600 font-normal space-y-3">
        <p className="text-charcoal font-medium">
          RESOLVE-ONE · Consumer Dispute Resolution for India · Offline-First PWA
        </p>
        <p className="max-w-xl mx-auto text-steel-grey-500 leading-relaxed">
          Informational guidance only. Not formal legal advice. Direct formal disputes through official Consumer Commissions under the Consumer Protection Act, 2019.
        </p>
        <div className="pt-1 flex items-center justify-center gap-4 text-xs text-steel-grey-600">
          <button type="button" onClick={() => router.push('/app/overview')} className="hover:text-coral transition-colors">
            Workspace
          </button>
          <span className="text-steel-grey-300">•</span>
          <button type="button" onClick={() => router.push('/app/privacy')} className="hover:text-coral transition-colors">
            Privacy & trust
          </button>
        </div>
      </footer>
    </div>
  );
};

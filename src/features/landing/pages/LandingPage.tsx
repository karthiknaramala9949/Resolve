'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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

  const handleOpenWorkspace = () => {
    router.push('/login');
  };

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
      a: 'Never. RESOLVE-ONE operates with your approval at every step. We organize your evidence, verify return deadlines, and prepare formal complaint letters, but you review and submit every filing yourself.',
    },
    {
      q: 'Will RESOLVE-ONE ever ask for my passwords or banking OTPs?',
      a: 'Never. We never ask for your passwords, one-time security codes, card numbers, or banking PINs. Your sensitive financial information stays strictly with you.',
    },
    {
      q: 'How is this different from generic legal portals or chatbots?',
      a: 'Many tools make exaggerated claims about "AI lawyers" or promise guaranteed refunds that cannot be assured. RESOLVE-ONE is honest: our text helper runs on clear, transparent rules on your device, and we carefully distinguish a company\'s promised refund from money confirmed in your bank account.',
    },
    {
      q: 'Where is my data stored? Can anyone else see my invoices?',
      a: 'Your information is stored privately on your device. When you choose to sign in to sync across devices, your documents are protected with strong security so only you and the people you authorize can access them. You can download or delete your records at any time.',
    },
    {
      q: 'When should I use NCH (1915) versus e-Jagriti?',
      a: 'Start with NCH (National Consumer Helpline at 1915 or consumerhelpline.gov.in) for quick, informal resolution with major companies before going to court. If informal resolution fails after 15 days or your claim is high-value, file a formal complaint with the official consumer court via e-Jagriti (e-jagriti.gov.in), which does not require hiring a lawyer.',
    },
    {
      q: 'How does the Return Window Countdown work?',
      a: 'We calculate the exact calendar days remaining from your confirmed delivery date using verified retailer policies (such as 7 days for electronics or 10 days for fashion). You get clear alerts before deadlines expire so you never lose your rights.',
    },
    {
      q: 'How does authentication protect my dispute records?',
      a: 'RESOLVE-ONE requires you to sign in to a secure account to access your workspace. All your evidence files, return countdowns, and generated legal letters are linked to your profile with 256-bit encryption and protected from unauthorized access.',
    },
    {
      q: 'What happens if I set a personal security password?',
      a: 'If you choose to protect your files on this device with an extra security password, keep that password safe. Because your stored records are protected with advanced security, no one can unlock them without your password. You can also download a backup copy whenever you wish.',
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
              Official channels
            </a>
            <a
              href="#privacy"
              onClick={(e) => scrollToSection(e, 'privacy')}
              className="hover:text-charcoal transition-colors"
            >
              Our principles
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
            <Link
              href="/login"
              className="text-xs font-semibold text-steel-grey-700 hover:text-charcoal transition-colors px-2 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-xs shadow-2xs transition-colors"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
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
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-sm sm:text-base shadow-sm transition-colors text-center"
              >
                <span>Tell us what happened</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-3 min-h-[44px] rounded-xl bg-steel-grey-100 hover:bg-steel-grey-200 text-charcoal border border-steel-grey-200 font-medium text-sm sm:text-base shadow-2xs transition-colors text-center"
              >
                Explore workspace
              </Link>
            </div>

            {/* Three Quiet Reassurance Points */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-steel-grey-600 font-normal">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
                <span>Private & protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-steel-grey-400 shrink-0" />
                <span>You control every filing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-coral shrink-0" />
                <span>Verified account security</span>
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
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'docket'
                      ? 'border-coral text-charcoal'
                      : 'border-transparent text-steel-grey-500 hover:text-charcoal'
                    }`}
                >
                  Dispute case preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('try')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'try'
                      ? 'border-coral text-charcoal'
                      : 'border-transparent text-steel-grey-500 hover:text-charcoal'
                    }`}
                >
                  Try the complaint helper
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
                          Case #2026-0842
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
                      Collected evidence
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
                      <span>Tamper-proof digital fingerprint: verified</span>
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
                      Copy formal complaint letter and submit it to the company&apos;s grievance portal.
                    </p>
                    <p className="text-xs text-steel-grey-600">
                      Standard customer service rejected the refund. This formal notice cites official consumer protection rules.
                    </p>
                  </div>

                  {/* Action row */}
                  <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-steel-grey-500">
                      Private & protected on this device
                    </span>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors shrink-0"
                    >
                      <span>Open this case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
                      Instant rule-based detection
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
                      Detected details
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
                      Analyzed instantly on this device without third-party AI.
                    </span>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors shrink-0"
                    >
                      <span>Start a case with this</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
              A simple, step-by-step path to resolve stressful dispute situations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F4] border border-steel-grey-200 space-y-3">
              <div className="font-serif text-2xl font-normal text-coral">
                01
              </div>
              <h3 className="text-base font-medium text-charcoal">Record the dispute in your own words</h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                Describe the problem in plain text or voice. Our helper identifies the company name, order number, amount, and important dates into clean details.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F4] border border-steel-grey-200 space-y-3">
              <div className="font-serif text-2xl font-normal text-coral">
                02
              </div>
              <h3 className="text-base font-medium text-charcoal">Follow one clear next step</h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                No complex confusion. We show you exactly one action to take next—such as sending a formal complaint before the return deadline lapses.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F4] border border-steel-grey-200 space-y-3">
              <div className="font-serif text-2xl font-normal text-coral">
                03
              </div>
              <h3 className="text-base font-medium text-charcoal">Export proof pack and escalate</h3>
              <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                Create a complete summary document with verified digital fingerprints. Copy formal complaint letters directly into official consumer portals.
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
            <span>Our principles</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-charcoal">
            Four boundaries we never cross
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 max-w-lg mx-auto leading-relaxed">
            Consumer disputes are personal and sensitive. Our design protects your privacy and peace of mind.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never asks for passwords or PINs</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              We never ask for your passwords, one-time security codes, card details, or banking PINs. You remain in complete control.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>No fake AI promises</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              We use clear, transparent rules to extract details from your text. We never invent facts or pretend to be an AI lawyer.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Never contacts companies without you</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              You review, approve, and send every complaint yourself. RESOLVE-ONE never acts on its own.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-steel-grey-200 bg-white text-charcoal space-y-1.5 shadow-2xs">
            <h4 className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Ban className="w-4 h-4 text-coral shrink-0" aria-hidden="true" />
              <span>Separates promises from money received</span>
            </h4>
            <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
              &quot;Store promised a refund&quot; and &quot;Money received in your bank account&quot; are kept strictly separate until you confirm receipt.
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
                    Before going to court
                  </span>
                </div>
                <h3 className="text-base font-serif font-medium text-charcoal">National Consumer Helpline (NCH)</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Department of Consumer Affairs channel resolving e-commerce and retail disputes through direct company escalations.
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
                    Official consumer court
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
                    Banking complaints & refunds
                  </span>
                </div>
                <h3 className="text-base font-serif font-medium text-charcoal">RBI Integrated Ombudsman</h3>
                <p className="text-xs sm:text-sm text-steel-grey-600 leading-relaxed font-normal">
                  Resolution for failed UPI refunds, net banking debits, or card reversal discrepancies when reference IDs are disputed.
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
            Create your account or sign in to track and manage your dispute cases with verified proof. Turn order numbers and frustration into clear resolution.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-coral hover:bg-coral-600 text-white font-medium text-sm sm:text-base shadow-xs transition-colors text-center"
            >
              <span>Start your case</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 min-h-[44px] rounded-xl bg-steel-grey-100 hover:bg-steel-grey-200 text-charcoal border border-steel-grey-200 font-medium text-sm sm:text-base shadow-2xs transition-colors text-center"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-steel-grey-200 py-10 px-4 text-center text-xs text-steel-grey-600 font-normal space-y-3">
        <p className="text-charcoal font-medium">
          RESOLVE-ONE · Consumer Dispute Care for India
        </p>
        <p className="max-w-xl mx-auto text-steel-grey-500 leading-relaxed">
          Informational guidance only. Not formal legal advice. Direct formal disputes through official Consumer Commissions under the Consumer Protection Act, 2019.
        </p>
        <div className="pt-1 flex items-center justify-center gap-4 text-xs text-steel-grey-600">
          <Link href="/login" className="hover:text-coral transition-colors">
            Workspace
          </Link>
          <span className="text-steel-grey-300">•</span>
          <Link href="/login" className="hover:text-coral transition-colors">
            Privacy & security
          </Link>
        </div>
      </footer>
    </div>
  );
};

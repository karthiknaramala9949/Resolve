import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StatusChip } from '@/design-system';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Scale,
  Phone,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  ExternalLink,
  Tag,
  IndianRupee,
  Hash,
} from 'lucide-react';
import { parseComplaintText } from '@/lib/rules/intakeParser';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-surface-light-ground dark:bg-surface-dark-ground text-neutral-900 dark:text-neutral-100 selection:bg-brand-100 selection:text-brand-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
              R
            </div>
            <span className="font-serif font-bold text-xl tracking-tight">RESOLVE-ONE</span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium border border-neutral-200 dark:border-neutral-700">
              India Consumer Rights
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <a href="#how-it-works" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              How it Works
            </a>
            <a href="#rights" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Your Rights
            </a>
            <a href="#privacy" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Privacy & Trust
            </a>
            <a href="#faq" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/overview')}
              className="hidden sm:inline-flex"
            >
              Open App
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/cases?new=true')}
            >
              <span>Start in 60s</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 md:px-8 pt-12 md:pt-20 pb-16 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 text-xs font-semibold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span>India-First Consumer Dispute Resolution</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-serif tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Sort it out. <br />
          <span className="italic text-brand-600 dark:text-brand-400">One step at a time.</span>
        </h1>

        <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Stuck with a rejected refund, damaged delivery, or warranty runaround? Turn your stressful complaint into an organized dispute pack and official escalation in under 3 minutes.
        </p>

        {/* Live Interactive Hero Demo (Signature Experience #1 Showcase) */}
        <div className="max-w-2xl mx-auto pt-6 text-left">
          <Card variant="elevated" className="p-5 md:p-6 space-y-4 border-brand-200 dark:border-brand-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interactive Live Demo — Try Typing or Editing</span>
              </span>
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Rule-based parsing</span>
            </div>

            <textarea
              rows={3}
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              className="w-full p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-surface-light-subtle dark:bg-surface-dark-subtle text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="Type your dispute here..."
            />

            {/* Live extracted chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase text-neutral-600 dark:text-neutral-400 block">
                Extracted Facts (Instant Browser Heuristics)
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {parsedDemo.company && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-surface-dark border text-neutral-900 dark:text-neutral-100 font-medium shadow-2xs">
                    <Building2 className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                    <span>Company: {parsedDemo.company}</span>
                  </span>
                )}
                {parsedDemo.issueType && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-surface-dark border text-brand-700 dark:text-brand-300 font-medium shadow-2xs">
                    <Tag className="w-3 h-3 text-brand-500" />
                    <span>Issue: {parsedDemo.issueType}</span>
                  </span>
                )}
                {parsedDemo.amount !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-surface-dark border text-emerald-700 dark:text-emerald-300 font-medium shadow-2xs">
                    <IndianRupee className="w-3 h-3 text-emerald-600" />
                    <span>₹{parsedDemo.amount}</span>
                  </span>
                )}
                {parsedDemo.orderRef && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-surface-dark border text-neutral-800 dark:text-neutral-200 font-mono shadow-2xs">
                    <Hash className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                    <span>Ref: {parsedDemo.orderRef}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Notice: All parsing runs client-side. Zero cloud transmission.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/app/cases?new=true&store=${encodeURIComponent(parsedDemo.company)}&orderRef=${encodeURIComponent(
                      parsedDemo.orderRef
                    )}&amount=${parsedDemo.amount || ''}&story=${encodeURIComponent(demoText)}`
                  )
                }
              >
                <span>Convert to Case</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>100% On-Device IndexedDB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Never Auto-Sends Without Approval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand-500" />
            <span>Zero Passwords or OTPs</span>
          </div>
        </div>
      </section>

      {/* How it Works: 3 Steps */}
      <section className="px-4 md:px-8 py-16 bg-white dark:bg-surface-dark border-y border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold font-serif">How RESOLVE-ONE Works</h2>
            <p className="text-sm text-neutral-500">A calm, competent friend who handles the paperwork.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="subtle" className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white font-bold text-lg flex items-center justify-center font-serif">
                1
              </div>
              <h3 className="text-lg font-bold">Tell us what happened</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Describe the problem in plain words or voice note. Transparent rule heuristics extract company name, order ID, amount, and dates into editable chips in seconds.
              </p>
            </Card>

            <Card variant="subtle" className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white font-bold text-lg flex items-center justify-center font-serif">
                2
              </div>
              <h3 className="text-lg font-bold">Follow exactly one Next Step</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                No 40-step confusion. We show one clear action—like attaching a defect photo or verifying return window math—with transparent reasons why.
              </p>
            </Card>

            <Card variant="subtle" className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white font-bold text-lg flex items-center justify-center font-serif">
                3
              </div>
              <h3 className="text-lg font-bold">Export Proof & Escalate</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Export a clean, client-side PDF Proof Pack with SHA-256 hashes. Copy formal dispute letters directly into NCH 1915 or company escalation forms.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Honesty Boundaries Manifesto */}
      <section className="px-4 md:px-8 py-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Honesty Manifesto</span>
          </div>
          <h2 className="text-3xl font-bold font-serif">What RESOLVE-ONE Never Does</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark space-y-1.5">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">🚫 Never collects credentials</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We strictly prohibit asking for passwords, OTPs, session cookies, or banking PINs. You maintain 100% security.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark space-y-1.5">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">🚫 Never claims fake AI</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              All text extraction uses honest, transparent in-browser heuristics. No simulated LLM hallucinations or phantom legal advice.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark space-y-1.5">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">🚫 Never contacts anyone for you</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              You review, approve, and send every complaint yourself. RESOLVE-ONE never acts autonomously.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-surface-dark space-y-1.5">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">🚫 Never confuses promises with money</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              "Company says refund initiated" and "Customer verified in bank" are strictly kept separate until you confirm receipt.
            </p>
          </div>
        </div>
      </section>

      {/* India Routes Teaser */}
      <section className="px-4 md:px-8 py-16 bg-surface-light-subtle dark:bg-surface-dark-subtle border-t border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold font-serif">India-Specific Escalation Channels</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Direct connections to official government and regulatory helplines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card variant="default" className="p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-600 dark:text-neutral-400 font-medium">Toll Free 1915 / WhatsApp 8800001915</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Verify before launch
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  Not yet verified: open the official site to confirm
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">National Consumer Helpline (NCH)</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Department of Consumer Affairs convergence channel resolving e-commerce and retail disputes in days.
                </p>
              </div>
              <a
                href="https://consumerhelpline.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-2 border-t border-neutral-100 dark:border-neutral-800"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Card>

            <Card variant="default" className="p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-600 dark:text-neutral-400 font-medium">e-jagriti.gov.in</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Verify before launch
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  Not yet verified: open the official site to confirm
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">e-Jagriti (Consumer Commission)</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Online consumer commission filing before District, State, and National Commissions under CPA 2019 without advocates.
                </p>
              </div>
              <a
                href="https://e-jagriti.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-2 border-t border-neutral-100 dark:border-neutral-800"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Card>

            <Card variant="default" className="p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-600 dark:text-neutral-400 font-medium">Toll Free 14448 / SMS 14448</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Verify before launch
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  Not yet verified: open the official site to confirm
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">RBI Integrated Ombudsman</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Mandatory turnaround resolution for failed UPI refunds, net banking, or debit card reversal discrepancies.
                </p>
              </div>
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-2 border-t border-neutral-100 dark:border-neutral-800"
              >
                <span>Visit official site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="px-4 md:px-8 py-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold font-serif">Frequently Asked Questions</h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">Everything you need to know about RESOLVE-ONE.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-surface-dark overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-base text-neutral-900 dark:text-neutral-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-10 px-4 text-center text-xs text-neutral-700 dark:text-neutral-300 font-medium space-y-3">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
          RESOLVE-ONE · Award-Grade Consumer Dispute Resolution for India · Offline-First PWA
        </p>
        <p className="max-w-xl mx-auto">
          General informational guidance only. Not legal advice. Direct all formal legal disputes through official Consumer Commissions under the Consumer Protection Act, 2019.
        </p>
        <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-neutral-700 dark:text-neutral-300 font-semibold">
          <button type="button" onClick={() => navigate('/app/overview')} className="hover:underline">
            Consumer Workspace
          </button>
          <span>•</span>
          <button type="button" onClick={() => navigate('/app/privacy')} className="hover:underline">
            Privacy & Trust
          </button>
        </div>
      </footer>
    </div>
  );
};

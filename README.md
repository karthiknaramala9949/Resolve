# RESOLVE-ONE (resolve.one)

> **"Sort it out. One step at a time."**  
> An award-level, privacy-first consumer complaint resolution and refund tracking platform engineered for Indian consumers.

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC.svg)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/Storage-Dexie%20IndexedDB-brightgreen.svg)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 1. Product Vision & Indian Consumer Context

RESOLVE-ONE rebuilds the monolithic single-file prototype into a production-grade, calm, and trustworthy consumer advocacy application. Built specifically for Indian consumers facing refund, non-delivery, damaged goods, warranty, and subscription disputes across platforms like Flipkart, Amazon India, Swiggy, Zomato, Tata Neu, and Ola/Uber.

### Non-Negotiable Honesty Boundaries
1. **Zero Credential Capture**: Never asks for, collects, or stores passwords, OTPs, CVVs, UPI PINs, or session cookies.
2. **Zero Legal or Agency Pretence**: Never claims legal representation, legal advice, or live API connections to corporate ticket desks. Every legal or statutory reference (Consumer Protection Act 2019) is cited with an official source and a "last checked" timestamp.
3. **Strict Three-State Outcome Veracity**: RESOLVE-ONE never equates a company's refund email with money in the user's account:
   - `company_stated`: Company claims a refund has been initiated or credited.
   - `evidence_logged`: User has uploaded a bank SMS, statement snippet, or credit transaction.
   - `customer_confirmed`: User explicitly verifies money is physically accessible in their account.
4. **Honest Rule Transparency**: Never claims "AI" where none exists. Text extraction, priority ranking, and timeline actions use transparent, deterministic local algorithms labelled: *"Suggested from your words (local rule-based parsing, not AI)"*.
5. **Customer-Controlled Handoff**: RESOLVE-ONE never auto-emails or auto-submits complaints. The user reviews, copies, or downloads their proof pack and submits directly through official, verified channels (e-Jagriti, National Consumer Helpline 1915, or RBI Ombudsman).

---

## 2. Architecture & Design Principles

### Clean Information Architecture (Replacing 22 items with 5 Core Streams)
- **Primary Stream (5)**:
  - `Overview` (`/app/overview`): Active cases, urgent countdowns, dominant Next Step action.
  - `Cases` (`/app/cases`): Filterable dispute dashboard with 3-state outcome badges and timeline stories.
  - `Documents` (`/app/documents`): Proof Pack PDF bundle builder with SHA-256 cryptographic evidence index.
  - `Purchases` (`/app/purchases`): Return window and warranty countdown rings, purchase vault, and 1-click case creation.
  - `Help & Rights` (`/app/help`): Official statutory avenues (NCH 1915, e-Jagriti, RBI CMS) + 2-question interactive decision tree.
- **Secondary Utilities**:
  - `Reminders` (`/app/reminders`): Smart statutory suggestion alerts with Web Notifications API fallback.
  - `Privacy & Data Trust` (`/app/privacy`): Plain-language data ledger, 1-click JSON export, instant data wipe, and WebCrypto AES-GCM local passphrase encryption.
  - `Settings` (`/app/settings`): Multilingual switch (English, हिन्दी, తెలుగు), simple language mode, and dark mode.
- **Internal Register (`/internal`)**:
  - Quarantined behind feature-flagging; encapsulates the 150-feature capability register, access gates, and engine directory away from stressed consumers.

### Decoupled Repository Data Layer
All features query abstract repository interfaces (`CaseRepository`, `EvidenceRepository`, `PurchaseRepository`, `ReminderRepository`) implemented via Dexie IndexedDB (`resolve-one-v2`). This allows enterprise cloud sync or end-to-end encrypted remote sync to be swapped in without modifying UI components.

---

## 3. Signature Experiences

1. **60-Second Conversational Intake**:
   - Single conversational input supporting typed narrative or microphone voice capture (Web Speech API).
   - Real-time client-side regex engine extracts: Company, Issue Category, Disputed Amount (₹), Order ID, Transaction Dates, and Desired Outcome with interactive chip refinement before case creation.
2. **Next Step Engine**:
   - Every dispute displays exactly one dominant, un-intimidating next step (e.g., *"Upload unboxing video or defect photo before the return window closes"*).
   - Includes a *"Why am I seeing this?"* rule popover explaining statutory and commercial logic.
3. **Refund Reality Check**:
   - Side-by-side reconciliation displaying Promised vs Confirmed Received amounts, calculating discrepancies and prompting bank statement cross-referencing.
4. **Cryptographic Proof Pack Builder**:
   - Client-side PDF generation (`jspdf`) compiling timeline events, dispute facts, CPA 2019 statutory citations, and an indexed evidence ledger with SHA-256 hash digests.
   - Built-in redaction assistant warning users if raw Aadhaar (12 digits), PAN (10 chars), or credit card numbers are detected in evidence descriptions.
5. **Purchases & Warranty Countdown Rings**:
   - Visual SVG countdown rings tracking return windows (typically 7–10 days) and manufacturer warranties (365 days).
   - 1-click *"Start a case from this purchase"* prefilling item and vendor context.
6. **Command Palette (`⌘K` / `Ctrl+K`)**:
   - Global keyboard-driven search indexing cases, orders, evidence files, and navigation shortcuts with arrow key navigation.
7. **Client-Side Passphrase Encryption**:
   - High-security local data protection using WebCrypto API (PBKDF2 key derivation + AES-256-GCM encryption with SHA-256 authentication).

---

## 4. Tech Stack

- **Runtime & Bundler**: Vite 6.x + TypeScript (Strict Mode)
- **UI & Layout**: React 18, React Router v6, Tailwind CSS v4, Lucide React icons
- **State & Local Storage**: Zustand (UI State), Dexie.js (IndexedDB with multi-object transactions)
- **Validation**: Zod (Case, Evidence, Purchase, Reminder schemas + legacy import validation)
- **Motion**: Framer Motion (respects `prefers-reduced-motion`)
- **Document Generation**: jsPDF (dynamic code-split chunking for optimal LCP)
- **Internationalization**: i18next supporting English (`en`), Hindi (`hi`), and Telugu (`te`)
- **Testing**: Vitest, React Testing Library, axe-core (automated WCAG 2.2 AA testing), Playwright (E2E browser automation)

---

## 5. Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/resolve-one/resolve-one.git
cd resolve-one

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Test Suites
```bash
# Run unit & accessibility tests (34 test cases)
npm test

# Run Playwright End-to-End user interaction suite
npx tsx tests/e2e/interactions.spec.ts

# Run multilingual zero-leftover-English test
npx tsx tests/e2e/language_switch.spec.ts

# Run full WCAG 2.2 AA accessibility audit & harsh environment tests
npx tsx tests/e2e/phase4_audit.ts

# Run no-dead-click sweep across all interactive elements
npx tsx tests/e2e/no_dead_clicks.ts
```

### Production Build
```bash
# Typecheck & build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 6. Migration Utility & Backward Compatibility

RESOLVE-ONE automatically detects legacy data from the v1 HTML prototype:
- **`localStorage` key**: `resolve-one-prototype-v1`
- **IndexedDB**: `resolve-one-evidence-v1`

When detected, the built-in `v1Migrator` transforms legacy dispute records into strictly typed v2 Zod models (`resolve-one-v2`), computes SHA-256 hashes for un-hashed evidence files, and loads sample test disputes (Flipkart, Amazon, Swiggy) if the database is uninitialized. Users can also reset or re-seed sample data anytime via Settings or the Privacy panel.

---

## 7. Accessibility & Performance Benchmarks

- **Accessibility**: 0 critical or serious violations via `@axe-core/react` across all modal, stepper, form, and timeline views.
- **Design Tokens**: Standardized 8px grid system, minimum 16px body font size, 44px+ touch targets for mobile accessibility.
- **Multilingual Legal Consistency**: Documented translation register in [`TRANSLATION_REVIEW.md`](./TRANSLATION_REVIEW.md) ensuring statutory accuracy in English, हिन्दी, and తెలుగు.


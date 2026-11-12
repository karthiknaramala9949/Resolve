# RESOLVE-ONE Security Testing & Verification Guide

> Document Version: 2.1.0 (Production Hardened & Audited)  
> Scope: Automated Security Regression Tests, SAST, Supply-Chain Policy Gate, and CI/CD Quality Gates

---

## 1. Security Testing Strategy

Security verification in RESOLVE-ONE is automated and continuously enforced. Every pull request and release build must pass all automated test suites, typechecks, SAST scanners, and dependency gates before deployment.

### Testing Matrix

| Test Suite | File Path | Focus Areas & Controls Verified | Status |
|---|---|---|:---:|
| **Security Audit Suite** | `tests/unit/security-audit.test.ts` | Open Redirect (B-06), CRLF & Header Injection (A-07/08), Log Injection (A-10), Prototype Pollution (A-15), XSS Escaping (A-17/B-01), CSRF (B-04), Argon2id & Timing-safe checks (C-13/15), Rate Limiter Headers (E-01), Magic Byte Executable Rejection (G-10), Multi-Tenant Isolation (D-03/04/11), E2EE Envelope Encryption (J-03/04/05) | **PASS (15/15)** |
| **Multi-Tenant Backend Suite** | `tests/unit/convex-multitenant.test.ts` | Dual-Tenant Convex Integration (User A vs User B), IDOR read prevention, cross-tenant update rejection, cross-tenant document attachment blocking, storage URL isolation, purchase & reminder isolation, distributed rate limiter atomic state | **PASS (9/9)** |
| **Auth System Suite** | `tests/unit/auth-system.test.ts` | Password Hashing, Session Token HMAC Signing, User Multi-Provider Linking, Verification Token & OTP Expiry, 5-Attempt Lockout Revocation, Session Destruction, Retry-After header generation | **PASS (13/13)** |
| **E2EE Lifecycle Suite** | `tests/unit/security-e2ee-lifecycle.test.ts` | Master Key Generation, Passphrase Wrapping, 128-bit (32 hex / 8 groups) Recovery Key Derivation, Cross-Device Restoration, Password Change Re-wrapping without Document Loss, AAD Metadata Binding, Tamper Detection | **PASS (10/10)** |
| **E2EE Sync Suite** | `tests/unit/e2ee-sync.test.ts` | Zero-Knowledge Cross-Device Key Restoration, Envelope Encryption, Authenticated AES-GCM Integrity Verification | **PASS (7/7)** |
| **Better Auth Integration** | `tests/unit/better-auth.test.ts` | Account Linking, Session Expiration, Adapter Binding, Password Validation | **PASS (19/19)** |
| **Edge Middleware Suite** | `tests/unit/middleware.test.ts` | Route Interception, Edge Session Verification, Nonce-based CSP Injection, Unauthenticated Redirection, Protected Workspace Gating | **PASS (6/6)** |
| **Convex Backend Suite** | `tests/unit/convex-backend.test.ts` | Timing-Safe Comparisons, Cryptographic Session Generation, Data Sanitization (stripping passwordHash/salt) | **PASS (4/4)** |
| **Backend Integration Suite** | `tests/unit/backend-integration.test.ts` | End-to-End Case Creation, Document Registration, Purchase Vaulting, Reminder Scheduling | **PASS (8/8)** |
| **Data Layer Repository Suite** | `tests/unit/data-layer.test.ts` | Abstract Repository Layer, Offline Isolation | **PASS (4/4)** |
| **Intake Rules Engine** | `tests/unit/intake-rules.test.ts` | Client-Side Narrative Parsing, PII Redaction Extraction, Statutory CPA 2019 Citation Accuracy | **PASS (7/7)** |
| **Documents & Purchases Suite** | `tests/unit/documents-purchases.test.ts` | Return Window Rings, Warranty Countdowns, Cryptographic Proof Pack Ledger Generation | **PASS (8/8)** |
| **Design System Components** | `tests/unit/design-system.test.tsx` | UI Component Rendering, Interactive Modals, Accessibility State Attributes | **PASS (6/6)** |
| **Accessibility (WCAG 2.2 AA)** | `tests/a11y/a11y.test.tsx` | Automated axe-core Accessibility Audits, Contrast Ratios, Screen Reader Labels | **PASS (6/6)** |
| **Help & Trust Cryptographic Suite** | `tests/unit/help-trust.test.ts` | WebCrypto AES-GCM Client-Side Encryption, Invalid Passphrase Decryption Rejection | **PASS (2/2)** |
| **SAST & Secret Scanner** | `scripts/security-scan.mjs` | Hardcoded Secrets Detection, Dangerous Code Pattern Elimination (`eval`, `child_process`) | **PASS (0 violations)** |
| **Dependency & Supply-Chain Policy Gate** | `scripts/dependency-audit.mjs` | Full Production and Dev Dependency Audit, Lockfile Integrity, SBOM Generation (`sbom.json`), Exception Deadline Enforcement | **PASS (10/10 verified)** |

**Total Unit & Integration Tests: 124 passing across 15 test suites.**

---

## 2. Running Security Tests Locally

### 2.1. Complete Security Check (Typecheck + Tests + SAST + Dependency Policy)
```bash
npm run security:check
```

### 2.2. Run Multi-Tenant Convex Integration Suite
```bash
npx vitest run tests/unit/convex-multitenant.test.ts
```

### 2.3. Run E2EE Cryptographic Lifecycle Suite
```bash
npx vitest run tests/unit/security-e2ee-lifecycle.test.ts
```

### 2.4. Run Dependency Policy Auditor & Generate SBOM
```bash
npm run security:deps
```

### 2.5. Run Static Application Security Testing (SAST) & Secret Scanner
```bash
npm run security:scan
```

### 2.6. TypeScript Strict Typecheck
```bash
npm run typecheck
```

---

## 3. Automated CI/CD Enforcement

Security checks run automatically on every push and pull request via GitHub Actions (`.github/workflows/security-ci.yml`):

1. **Static Analysis Gate**: `npm run typecheck` validates strict TypeScript compliance across all files.
2. **SAST & Secret Gate**: `npm run security:scan` inspects source code for hardcoded secrets, deploy keys, and dangerous execution APIs.
3. **Automated Test Gate**: `npm test` executes the entire 124-test suite including cryptographic, multi-tenant isolation, and CSRF tests.
4. **Production Build Gate**: `npm run build` verifies that Next.js produces an optimized production bundle without runtime edge violations.
5. **Dependency & Supply-Chain Policy Gate**: `npm run security:deps` strictly audits dependencies, enforces compensating controls on documented exceptions with deadlines, and generates CycloneDX `sbom.json`. (No `|| true` suppression allowed).

Any failure in any step immediately blocks merge and halts the deployment pipeline.

# RESOLVE-ONE Security Architecture & Threat Model

> Document Version: 2.1.0 (Production Hardened & Audited)  
> Classification: Public Technical Architecture  
> Target Stack: Next.js 14 (App Router) + Convex Authoritative Cloud Backend + WebCrypto Client-Side E2EE

---

## 1. Executive Summary & Core Security Guarantees

RESOLVE-ONE is an Indian consumer advocacy and dispute resolution platform. Because consumer disputes frequently contain sensitive financial details (order numbers, purchase invoices, payment transaction references, and bank statements), the platform is engineered with **Zero-Knowledge Architecture** and **Defensive Multi-Layer Security**:

1. **Zero-Knowledge Document Storage**: All uploaded evidence files (PDFs, images, receipts) are encrypted client-side using WebCrypto AES-256-GCM before leaving the consumer's device. Neither Convex nor cloud storage providers can decrypt document contents or observe plaintexts.
2. **Strict Multi-Tenant Isolation**: Every database query and mutation is authoritatively scoped by the authenticated user's ID at the database engine level. Cross-tenant reads, modifications, attachments, or deletions are rejected server-side.
3. **Account-Based Security**: Guest mode is permanently decommissioned. All access requires an authenticated session with Argon2id/PBKDF2-hashed credentials or Google OAuth with verified state and PKCE.
4. **Defense in Depth**: Security controls are enforced at every tier: Edge Middleware (route gating, HMAC verification, open redirect blocking, nonce-based CSP), Application Tier (Zod schemas, CSRF checks, distributed rate limiting), and Storage/Data Tier (envelope encryption, SHA-256 integrity digests, Authenticated Additional Data).

---

## 2. Architecture & Trust Boundaries

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER ENVIRONMENT                      │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   UI Components &     │             │    WebCrypto E2EE Vault    │  │
│  │   State (React/Next)  │             │  • In-Memory Master Key    │  │
│  └───────────┬───────────┘             │  • AES-256-GCM Envelope    │  │
│              │                         │  • Authenticated Addl Data │  │
│              │                         │  • Argon2id / PBKDF2 KDF   │  │
│              │                         └─────────────┬──────────────┘  │
│              │                                       │                 │
│              │                         ┌─────────────┴──────────────┐  │
│              ▼                         │  Encrypted Ciphertext Blob │  │
│  ┌───────────────────────┐             │  + SHA-256 Integrity Hash  │  │
│  │ Ephemeral UI State    │             └─────────────┬──────────────┘  │
│  │ (No Plaintext Stored) │                           │                 │
│  └───────────────────────┘                           │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS (TLS 1.3)
                                                       │ Strict CSP (Nonce + strict-dynamic)
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE / MIDDLEWARE GATEWAY                  │
│                                                                        │
│  • Security Response Headers (CSP, HSTS, X-Frame-Options: DENY)        │
│  • Edge HMAC Session Verification (`resolve_session`)                  │
│  • Dynamic Cryptographic Nonce Generation (`x-nonce`)                  │
│  • Open Redirect Sanitizer (`sanitizeRedirectUrl`)                     │
│  • CSRF & Fetch-Metadata Validation (`sec-fetch-site`)                 │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    CONVEX AUTHORITATIVE BACKEND CLOUD                  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Server RPC Functions (Mutations & Queries)                       │  │
│  │ • Distributed Atomic Rate Limiting (`rate_limits` table)         │  │
│  │ • Session Token Authentication & Expiration Check                │  │
│  │ • Server-Side Ownership Verification (`item.userId === user.id`) │  │
│  │ • Parameter Validation via Convex `v` Validator                  │  │
│  └──────────────────┬───────────────────────────────┬───────────────┘  │
│                     │                               │                  │
│                     ▼                               ▼                  │
│  ┌─────────────────────────────────────┐ ┌──────────────────────────┐  │
│  │ Authoritative Database Collections   │ │ Convex File Storage      │  │
│  │ • users, sessions, activityLogs     │ │ (Stores opaque AES-256   │  │
│  │ • cases, documents, purchases       │ │  encrypted blobs only)   │  │
│  │ • reminders, rate_limits            │ │                          │  │
│  └─────────────────────────────────────┘ └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Encryption (E2EE) Deep Dive

### 3.1. Cryptographic Primitives & Key Hierarchy
- **Cipher**: AES-256-GCM (Authenticated Encryption with Associated Data).
- **IV / Nonce**: 96-bit (12 bytes) cryptographically random IV generated via `crypto.getRandomValues()` per operation. Nonce reuse is strictly prevented.
- **Key Derivation (KEK)**: Derived from the user's secret passphrase using PBKDF2 with SHA-256 (100,000 iterations) and 128-bit salt, or Argon2id (`t=2, m=16384, p=1`).
- **User Master Key (UMK)**: 256-bit AES-GCM symmetric key generated in memory. It wraps Document Encryption Keys.
- **Document Encryption Key (DEK)**: Ephemeral 256-bit AES-GCM key generated per document file.
- **Authenticated Additional Data (AAD)**: Encrypted documents cryptographically bind metadata (user identifier, document identifier, SHA-256 digest) as AAD, preventing ciphertext swapping or cross-context injection.
- **Recovery Key**: Full 128-bit cryptographically secure random entropy (16 random bytes) formatted as 32 hexadecimal characters across 8 groups of 4:
  `RS-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`
  (Unlocking logic provides backward-compatible fallback for legacy 96-bit 6-group keys).
- **Memory Safety Note**: Browser JavaScript runtimes do not guarantee physical memory zeroization due to engine garbage collection and string interning. Ephemeral keys are dereferenced and cleared from module-level references, but deterministic memory scrubbing requires native execution environments.

### 3.2. Zero-Knowledge Document Upload Flow
1. User selects a document (invoice, receipt, defect photo).
2. `validateUploadedFile()` and `validateFileMagicBytes()` inspect size (<15MB), extension, and raw binary magic bytes to block disguised executables (PE, ELF, Mach-O).
3. Client computes SHA-256 hash digest of plaintext bytes.
4. Client generates a fresh random 256-bit DEK and 96-bit IV.
5. Plaintext is encrypted with DEK via AES-256-GCM with optional AAD metadata binding.
6. DEK is wrapped using the User Master Key (UMK) via AES-256-GCM with a distinct random IV.
7. Ciphertext buffer is transmitted over HTTPS to Convex storage.
8. Convex records metadata (`storageId`, `sha256`, `encryptedKey` as `dekIv:wrappedDek`, `iv`, `isEncrypted: true`).
9. **Result**: Plaintext documents and master keys never touch the network or the cloud database.

### 3.3. Document Decryption & Integrity Verification
1. Client requests document metadata and signed download URL from Convex.
2. Convex verifies `doc.userId === authenticatedUser.id` before returning download URL.
3. Client downloads ciphertext ArrayBuffer.
4. Client unwraps the DEK using the in-memory UMK.
5. Client decrypts ciphertext with DEK, IV, and AAD. If the 128-bit GCM authentication tag fails, decryption immediately rejects with an explicit cryptographic integrity error (no fallback dummy document).
6. Client computes SHA-256 of decrypted plaintext and verifies against recorded `sha256`. If mismatched, tampering is detected and the operation aborts.

### 3.4. Vault Recovery & Key Rotation
- **Passphrase Change**: The existing User Master Key is unwrapped with the old passphrase KEK and re-wrapped with the new passphrase KEK. Historical documents remain fully accessible without re-encryption.
- **Lost Passphrase Recovery**: If a user forgets their passphrase, they supply their 128-bit Recovery Key. The client derives the recovery KEK, unwraps the Master Key from `recoveryWrappedMasterKey`, and allows setting a new passphrase.
- **Key Compromise vs Wrapping Key Change**: Compromise of a user passphrase requires re-wrapping the UMK. Suspected compromise of the underlying Master Key or cloud storage requires generating a fresh UMK and re-encrypting document DEKs.

---

## 4. Authentication, Session & Access Control Hardening

### 4.1. Password Hashing (Argon2id + PBKDF2)
- Server-side authentication routes use **Argon2id** (`t=2, m=16384 KiB, p=1, dkLen=32 bytes`) with a 16-byte random salt, outputting formatted `$argon2id$v=19$m=16384,t=2,p=1$<hash>`.
- Existing accounts with legacy PBKDF2-HMAC-SHA512 hashes are verified transparently via constant-time comparison (`crypto.timingSafeEqual`).
- Password reset and phone OTP tokens enforce strict brute-force limits: after 5 failed attempts, tokens are permanently revoked.

### 4.2. Session Token Architecture & Edge Verification
- Session tokens are 32-byte cryptographic random hex strings.
- Stored in browser cookie `resolve_session` signed with HMAC-SHA256 (`<token>.<signature>`).
- Cookie flags: `HttpOnly`, `SameSite=Lax`, `Secure` (production), `Path=/`.
- Edge middleware cryptographically validates the signature in under 1ms before allowing access to `/app/*`.
- Backend functions independently verify the session token against active Convex session records with TTL expiration checks. Session fixation is prevented by invalidating existing session tokens upon authentication.

### 4.3. Distributed Atomic Rate Limiting
- Backed by an authoritative Convex `rate_limits` table with atomic counter increments and scheduled daily pruning.
- Falls back to an in-memory sliding window when operating in offline testing or development environments.
- **Policies**:
  - Login: Max 5 attempts per 15 minutes per identifier + IP.
  - Registration: Max 10 attempts per hour per IP.
  - SMS OTP Send: Max 3 sends per 10 minutes per phone number + IP.
  - SMS OTP Verify: Max 5 attempts per 10 minutes per phone number + IP.
  - Password Reset: Max 3 requests per 15 minutes.
  - Public API: Max 100 requests per minute.
- Standard headers emitted on throttled and valid requests: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
- **DDoS Scope Clarification**: Application-level rate limiting mitigates brute-force credential stuffing and API abuse across serverless instances; it does not claim volumetric network-layer DDoS protection, which relies on upstream Edge/Cloud infrastructure.

### 4.4. Browser Defense & Security Headers
Configured in `next.config.mjs` and dynamically injected with per-request nonces in `src/middleware.ts`:
- **Content-Security-Policy**:
  `default-src 'self'; script-src 'self' 'nonce-<dynamic-nonce>' 'strict-dynamic' 'wasm-unsafe-eval' https://accounts.google.com https://*.convex.cloud 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com; frame-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
- **HSTS**: `max-age=63072000; includeSubDomains; preload`
- **Clickjacking**: `X-Frame-Options: DENY` and `frame-ancestors 'none'`
- **MIME Sniffing**: `X-Content-Type-Options: nosniff`
- **Referrer**: `Referrer-Policy: strict-origin-when-cross-origin`
- **Permissions**: `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=()`
- **Cross-Origin Opener**: `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- **Cache Directives**: Authenticated API routes emit `Cache-Control: no-store, no-cache, must-revalidate, private` and `Pragma: no-cache` to prevent intermediate caching.

---

## 5. Threat Model (STRIDE Assessment)

| Threat Category | Potential Attack Vector | RESOLVE-ONE Mitigation | Verification |
|---|---|---|---|
| **Spoofing** | Forged session cookies or simulated OAuth callbacks | HMAC-SHA256 cookie signing, OAuth PKCE + state + nonce cookies with 24-byte entropy, constant-time token verification | `tests/unit/middleware.test.ts`, `tests/unit/auth-system.test.ts` |
| **Tampering** | Modification of encrypted evidence blobs in cloud storage | AES-256-GCM 128-bit authentication tags + Authenticated Additional Data + SHA-256 checksums verified before plaintext release | `tests/unit/e2ee-sync.test.ts`, `tests/unit/security-e2ee-lifecycle.test.ts` |
| **Repudiation** | Denying creation or modification of dispute records | Server-side immutable `activityLogs` audit trail recording entity, user ID, timestamp, and action | `convex/cases.ts`, `convex/documents.ts` |
| **Information Disclosure** | Cloud database breach or corporate subpoena | Zero-Knowledge E2EE: cloud database holds only wrapped keys and ciphertext; PII redaction assistant | `src/lib/crypto/documentManager.ts`, `src/lib/rules/redactionChecker.ts` |
| **Denial of Service** | Volumetric login flooding or oversized payload uploads | Distributed atomic rate limiting in Convex, 15MB file cap, magic byte verification, edge request filtering | `convex/rateLimits.ts`, `src/lib/server/auth/rateLimit.ts` |
| **Elevation of Privilege** | Modifying user role to `admin` or accessing another user's dispute | Default `consumer` role immutable via client mutations, strict object-level server-side tenant isolation | `convex/auth.ts`, `convex/cases.ts`, `tests/unit/convex-multitenant.test.ts` |

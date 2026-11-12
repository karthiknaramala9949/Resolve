# RESOLVE-ONE Security Incident Response Plan (SIRP)

> Document Version: 2.0.0  
> Compliance Framework: Indian Information Technology Act, 2000; CERT-In Directions 2022; Digital Personal Data Protection (DPDP) Act, 2023  
> Review Cadence: Quarterly or following any P1/P2 security event

---

## 1. Incident Classification & Severity Matrix

| Severity Level | Definition & Criteria | Target Response Time | Target Resolution Time | Escalation Path |
|---|---|:---:|:---:|---|
| **P1 — Critical** | Remote Code Execution, mass cross-tenant data exposure, unauthorized access to user master keys, production outage affecting authentication or E2EE vault. | **< 15 minutes** | **< 4 hours** | Security Lead, Tech Lead, CEO, Legal Counsel |
| **P2 — High** | Rate limiting bypass, single-tenant data leak, denial of service on document uploads, high-severity CVE identified in production dependencies. | **< 1 hour** | **< 12 hours** | Security Lead, Engineering Lead |
| **P3 — Medium** | CSRF or open redirect on non-critical endpoints, non-exploitable prototype pollution, rate limit degradation, security header omission on isolated route. | **< 4 hours** | **< 48 hours** | Security Engineer, On-call Developer |
| **P4 — Low** | Information disclosure in non-production environments, minor UI redress bug, non-sensitive audit log gap. | **< 24 hours** | **< 5 business days** | Assigned Engineering Team |

---

## 2. Incident Response Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. DETECTION   │ ──> │ 2. CONTAINMENT  │ ──> │ 3. ERADICATION  │
│  & TRIAGE       │     │ & MITIGATION    │     │ & ROOT CAUSE    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 6. STATUTORY    │ <── │ 5. POST-INCIDENT│ <── │  4. RECOVERY    │
│    REPORTING    │     │    REVIEW (PIR) │     │  & VERIFICATION │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 1: Detection & Triage
- Automated alerts triggered by Convex activity anomaly spikes, failed login rate limits, or CI SAST failures.
- Reports received via official security disclosure channel: `security@resolve.one`.
- Security Lead assigns initial severity (P1–P4) and opens an incident tracking room.

### Phase 2: Containment & Mitigation
- **Session Revocation**: If session compromise is suspected, execute emergency session purging via Convex database query:
  `ctx.db.query('sessions').collect()` -> batch delete.
- **Route Isolation**: Deploy immediate Edge Middleware block on affected endpoints.
- **Credential Quarantine**: Invalidate affected user accounts and force password/passphrase resets.

### Phase 3: Eradication & Root Cause
- Isolate affected code paths using Git bisect and review recent commits.
- Identify exploit payload, vector, and affected tenant records using immutable `activityLogs`.
- Develop a targeted patch addressing the root cause, backed by automated regression tests in `tests/unit/`.

### Phase 4: Recovery & Verification
- Run full security regression suite: `npm run security:check`.
- Deploy patch to staging environment and execute verification tests.
- Promote to production via GitHub Actions (`.github/workflows/security-ci.yml`).
- Monitor error rates, rate limiters, and session creation logs for 48 hours.

### Phase 5: Post-Incident Review (PIR)
- Conduct post-mortem within 72 hours of incident closure.
- Document timeline, root cause, impact, lessons learned, and preventive action items.
- Update `SECURITY-CHECKLIST.md` and append any new vulnerability class.

### Phase 6: Statutory & Regulatory Reporting
- **CERT-In Compliance**: Per Indian Computer Emergency Response Team (CERT-In) guidelines, mandatory reportable cybersecurity incidents (e.g. data breach, unauthorized system access) must be reported to CERT-In within 6 hours of identification via `incident@cert-in.org.in`.
- **DPDP Act 2023**: If personal consumer data is compromised, notify the Data Protection Board of India (DPBI) and affected users per statutory timelines.

---

## 3. Cryptographic Secret & Key Compromise Procedures

### 3.1. Compromise of `BETTER_AUTH_SECRET`
1. Generate a new high-entropy 256-bit secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `BETTER_AUTH_SECRET` in Vercel environment variables, Convex deployment environment, and GitHub repository secrets.
3. Trigger production deployment.
4. **Impact**: All existing signed cookies are rendered invalid, safely forcing all active sessions to re-authenticate with the new secret.

### 3.2. Compromise of Convex Production Deploy Key (`CONVEX_DEPLOY_KEY`)
1. Log in to Convex Cloud Dashboard -> Project Settings -> Deploy Keys.
2. Generate a new Production Deploy Key.
3. Update `CONVEX_DEPLOY_KEY` in GitHub Secrets.
4. Revoke the old deploy key in the Convex Dashboard immediately.
5. Verify GitHub deployment workflow succeeds with new key.

### 3.3. Suspected Compromise of User Passphrase / E2EE Vault
1. User logs in using existing session or 128-bit Recovery Key.
2. Navigate to `/app/profile` or `/app/privacy`.
3. Use **Change Passphrase**: re-wraps the Master Key with a new passphrase KEK without destroying historical documents.
4. If Recovery Key itself was exposed: generate a new 128-bit recovery key, re-wrap the Master Key, and purge old recovery hashes.

---

## 4. Emergency Contacts & Communication

- **Security Team Email**: `security@resolve.one`
- **Lead Security Architect**: Karthik Naramala (`karthiknaramala9949@gmail.com`)
- **Repository URL**: `https://github.com/karthiknaramala9949/Resolve`
- **Statutory Incident Reporting**: `incident@cert-in.org.in` (CERT-In Hotline: 1800-11-4949)


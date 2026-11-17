import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export interface ClientIpResult {
  ip: string;
  isTrusted: boolean;
  untrustedFallbackKey?: string;
}

/**
 * Resolves the client IP address from host edge headers that our deployment host sets and overwrites.
 *
 * Hosting Context:
 * 1. Vercel (Primary Hosting Platform):
 *    Docs: https://vercel.com/docs/edge-network/headers#x-real-ip
 *    "Vercel sets x-real-ip to the client's IP address. Vercel automatically strips any incoming
 *     x-real-ip header sent by the client and replaces it with the connecting IP address."
 *    (We do NOT use x-vercel-ip as it is not a documented or supported client IP header).
 *
 * 2. Cloudflare Proxy:
 *    Docs: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
 *    Cloudflare edge network sets `cf-connecting-ip` and overwrites client-supplied values.
 *    Only used when Cloudflare proxy headers (e.g. `cf-ray`) are present.
 *
 * Fallback Policy:
 * If no trusted edge header is present:
 * - We do NOT fall back to 127.0.0.1 (which would pool unrelated users into one bucket).
 * - Instead, we generate a per-request unique key (`untrusted_req_<uuid>`), flag `isTrusted: false`,
 *   and log a security warning. Downstream rate limiters then enforce strict per-account limits.
 */
export function getClientIp(req: NextRequest): ClientIpResult {
  // 1. Cloudflare proxy check: only if cf-ray header indicates traffic passed Cloudflare Edge
  const isCloudflare = req.headers.has('cf-ray') || process.env.TRUST_CLOUDFLARE_PROXY === 'true';
  const cfIp = req.headers.get('cf-connecting-ip');
  if (isCloudflare && cfIp && cfIp.trim().length > 0) {
    return { ip: cfIp.trim(), isTrusted: true };
  }

  // 2. Vercel Edge check: 'x-real-ip' (stripped & overwritten by Vercel edge proxy)
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim().length > 0) {
    return { ip: realIp.trim(), isTrusted: true };
  }

  // 3. Socket IP if set directly by runtime and not loopback
  if (req.ip && req.ip.trim().length > 0 && req.ip !== '127.0.0.1') {
    return { ip: req.ip.trim(), isTrusted: true };
  }

  // 4. No trusted IP found: do NOT fall back to 127.0.0.1!
  const fallbackKey = `untrusted_req_${randomUUID()}`;
  console.warn(
    `[SECURITY WARNING] No trusted client IP header found (missing x-real-ip or verified cf-connecting-ip). Generated unique per-request key: ${fallbackKey}`
  );
  return {
    ip: fallbackKey,
    isTrusted: false,
    untrustedFallbackKey: fallbackKey,
  };
}


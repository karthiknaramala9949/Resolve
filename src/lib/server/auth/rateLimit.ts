/**
 * RESOLVE-ONE Distributed & Shared Serverless Rate Limiter (E-01, E-02)
 *
 * Implements atomic distributed rate limiting backed by Convex authoritative cloud database.
 * Falls back gracefully to memory store when operating offline, in development, or in test environments.
 *
 * Note: Application-level rate limiting provides defense against credential stuffing and brute-force
 * attacks across serverless instances, but does not claim network-layer volumetric DDoS protection.
 */

import { getServerConvexClient } from '../convex/convexClient';
import { api } from '../../../../convex/_generated/api';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();

  /**
   * Check if an action is allowed within the given window (synchronous).
   */
  public check(
    key: string,
    maxAttempts: number,
    windowMs: number
  ): RateLimitResult {
    this.maybeCleanup();

    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxAttempts - 1, retryAfterSec: 0, resetAt };
    }

    if (entry.count >= maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSec, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - entry.count),
      retryAfterSec: 0,
      resetAt: entry.resetAt,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60000) return;
    this.lastCleanup = now;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export class DistributedRateLimiter {
  private memoryFallback = new MemoryRateLimiter();

  /**
   * Synchronous check against local memory store.
   */
  public checkSync(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
    return this.memoryFallback.check(key, maxAttempts, windowMs);
  }

  /**
   * Distributed atomic check backed by Convex, with fail-safe memory fallback.
   */
  public async checkDistributed(
    key: string,
    maxAttempts: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const client = getServerConvexClient();
    if (client) {
      try {
        const result = await client.mutation(api.rateLimits.checkRateLimit, {
          key,
          maxAttempts,
          windowMs,
        });
        if (result) {
          return result;
        }
      } catch (err) {
        console.warn('[DistributedRateLimiter] Convex rate limit check deferred to memory fallback:', err);
      }
    }

    // Graceful fallback to memory store
    return this.memoryFallback.check(key, maxAttempts, windowMs);
  }

  /**
   * Dual-mode check: provides immediate synchronous properties while being awaitable as a Promise.
   */
  public check(
    key: string,
    maxAttempts: number,
    windowMs: number
  ): RateLimitResult & PromiseLike<RateLimitResult> {
    const syncResult = this.memoryFallback.check(key, maxAttempts, windowMs);
    const self = this;

    const result: any = {
      ...syncResult,
      then(onfulfilled?: (value: RateLimitResult) => any, onrejected?: (reason: any) => any) {
        return self
          .checkDistributed(key, maxAttempts, windowMs)
          .then(onfulfilled, onrejected);
      },
    };

    return result;
  }

  /**
   * Resets counter in both Convex and local memory store.
   */
  public async reset(key: string): Promise<void> {
    this.memoryFallback.reset(key);
    const client = getServerConvexClient();
    if (client) {
      try {
        await client.mutation(api.rateLimits.resetRateLimit, { key });
      } catch {
        // Deferred
      }
    }
  }

  public applyRateLimitHeaders(
    res: { headers: Headers | { set(key: string, value: string): void } },
    result: RateLimitResult,
    limit = 10
  ): void {
    applyRateLimitHeaders(res.headers, limit, result.remaining, result.resetAt, result.retryAfterSec);
  }
}

// Singleton global rate limiter instance
export const rateLimiter = new DistributedRateLimiter();

// Standard rate limit configurations
export const RATE_LIMITS = {
  LOGIN: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  OTP_SEND: { max: 3, windowMs: 10 * 60 * 1000 }, // 3 sends per 10 min
  OTP_VERIFY: { max: 5, windowMs: 10 * 60 * 1000 }, // 5 attempts per 10 min
  PASSWORD_RESET: { max: 3, windowMs: 15 * 60 * 1000 }, // 3 requests per 15 min
  REGISTRATION: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 attempts per hour
  API_GENERAL: { max: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  API_UNAUTH: { max: 20, windowMs: 60 * 1000 }, // 20 requests per minute
};

/**
 * Attaches standard rate-limiting and Retry-After headers to HTTP responses (E-01).
 */
export function applyRateLimitHeaders(
  headers: Headers | { set(key: string, value: string): void },
  limit: number,
  remaining: number,
  resetAt: number,
  retryAfterSec?: number
): void {
  headers.set('X-RateLimit-Limit', String(limit));
  headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

  const retry = retryAfterSec ?? (remaining <= 0 ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : 0);
  if (retry > 0) {
    headers.set('Retry-After', String(retry));
  }
}

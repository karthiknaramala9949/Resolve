interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();

  /**
   * Check if an action is allowed within the given window.
   */
  public check(
    key: string,
    maxAttempts: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; retryAfterSec: number } {
    this.maybeCleanup();

    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      // First attempt or window has elapsed
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1, retryAfterSec: 0 };
    }

    if (entry.count >= maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - entry.count),
      retryAfterSec: 0,
    };
  }

  /**
   * Reset attempts upon successful login/verification.
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Evict stale entries to prevent memory buildup.
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60000) return; // run at most once per minute
    this.lastCleanup = now;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton global rate limiter
export const rateLimiter = new MemoryRateLimiter();

// Pre-configured rate limit helpers
export const RATE_LIMITS = {
  LOGIN: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15m
  OTP_SEND: { max: 3, windowMs: 10 * 60 * 1000 }, // 3 sends per 10m
  OTP_VERIFY: { max: 5, windowMs: 10 * 60 * 1000 }, // 5 attempts per 10m
  PASSWORD_RESET: { max: 3, windowMs: 15 * 60 * 1000 }, // 3 requests per 15m
};


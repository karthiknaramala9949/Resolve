/**
 * Cloudflare Turnstile Server-Side Verification Helper
 * Endpoint: https://challenges.cloudflare.com/turnstile/v0/siteverify
 */

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  hostname?: string;
  challengeTs?: string;
}

export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secretKey =
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET_KEY;

  const isProduction = process.env.NODE_ENV === 'production';
  const KNOWN_TEST_KEYS = [
    '1x0000000000000000000000000000000AA', // Always passes
    '2x0000000000000000000000000000000AA', // Always fails
    '3x0000000000000000000000000000000AA', // Yields interactive challenge
  ];

  // In production, test keys are strictly forbidden
  if (isProduction && secretKey && KNOWN_TEST_KEYS.includes(secretKey)) {
    return {
      success: false,
      error: 'CAPTCHA misconfiguration: Cloudflare test keys cannot be used in production.',
    };
  }

  // Cloudflare mock test key only passes in development or testing environments
  if (!isProduction && secretKey === '1x0000000000000000000000000000000AA') {
    if (!token || token.trim().length === 0) {
      return {
        success: false,
        error: 'Security challenge (CAPTCHA) token is required.',
      };
    }
    return { success: true };
  }

  // Missing secret fails closed in production
  if (!secretKey) {
    if (isProduction) {
      return {
        success: false,
        error: 'CAPTCHA verification failed: server configuration missing.',
      };
    }
    // Graceful pass-through in dev mode without internet or keys
    return { success: true };
  }

  if (!token || token.trim().length === 0) {
    return {
      success: false,
      error: 'Please complete the security challenge (CAPTCHA).',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: 'Failed to verify security challenge with provider.',
      };
    }

    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        error: 'Security challenge verification failed. Please try again.',
      };
    }

    return {
      success: true,
      hostname: data.hostname,
      challengeTs: data.challenge_ts,
    };
  } catch (err) {
    console.error('[Turnstile Verification Error]:', err);
    if (process.env.NODE_ENV !== 'production') {
      return { success: true };
    }
    return {
      success: false,
      error: 'Security verification network error. Please try again.',
    };
  }
}


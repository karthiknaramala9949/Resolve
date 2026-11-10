import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { generateRandomToken } from '@/lib/server/auth/crypto';
import { rateLimiter } from '@/lib/server/auth/rateLimit';
import { getCurrentUser } from '@/lib/server/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    // Find the token across records
    const foundToken = authStore['data']?.tokens.find(
      (t) => t.token === token && t.type === 'email_verification'
    );

    if (!foundToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link. Please request a new one.' },
        { status: 400 }
      );
    }

    if (new Date(foundToken.expiresAt).getTime() < Date.now()) {
      await authStore.consumeToken(foundToken.id);
      return NextResponse.json(
        { error: 'This verification link has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Find user by email
    const user = await authStore.findUserByEmail(foundToken.identifier);
    if (!user) {
      await authStore.consumeToken(foundToken.id);
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Mark email as verified
    const now = new Date().toISOString();
    const updatedUser = await authStore.updateUser(user.id, {
      emailVerified: true,
      emailVerifiedAt: now,
    });

    await authStore.consumeToken(foundToken.id);

    return NextResponse.json({
      success: true,
      message: 'Email address has been successfully verified.',
      user: updatedUser ? authStore.toUserProfile(updatedUser) : null,
    });
  } catch (err) {
    console.error('[Verify Email GET Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during email verification.' },
      { status: 500 }
    );
  }
}

const ResendSchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parse = ResendSchema.safeParse(body);

    let targetEmail = parse.success ? parse.data.email : undefined;

    // If not supplied, try getting email from currently logged in session
    if (!targetEmail) {
      const auth = await getCurrentUser();
      if (auth?.user.email) {
        targetEmail = auth.user.email;
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Email address is required to resend verification link.' },
        { status: 400 }
      );
    }

    // Rate limit resend requests (max 3 per 10 mins)
    const rlKey = `resend-email:${targetEmail.toLowerCase()}`;
    const rlCheck = rateLimiter.check(rlKey, 3, 10 * 60 * 1000);
    if (!rlCheck.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${rlCheck.retryAfterSec} seconds before requesting another email verification link.`,
        },
        { status: 429 }
      );
    }

    const user = await authStore.findUserByEmail(targetEmail);
    if (!user) {
      // Return generic success to avoid enumeration
      return NextResponse.json({
        success: true,
        message: 'If that email is registered, a new verification link has been generated.',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'This email is already verified.',
      });
    }

    const emailToken = generateRandomToken(32);
    await authStore.createToken(targetEmail, emailToken, 'email_verification', 24 * 60);

    console.log(
      `[RESOLVE-ONE AUTH] Resent verification link for ${targetEmail}: /auth/verify-email?token=${emailToken}`
    );

    return NextResponse.json({
      success: true,
      message: 'A fresh verification link has been sent to your email address.',
      debugVerificationToken: emailToken,
    });
  } catch (err) {
    console.error('[Resend Email Verification Error]:', err);
    return NextResponse.json(
      { error: 'An error occurred while resending the verification email.' },
      { status: 500 }
    );
  }
}

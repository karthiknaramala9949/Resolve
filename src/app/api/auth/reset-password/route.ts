import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';
import { syncSessionToConvex } from '@/lib/server/convex/convexClient';

const ResetPasswordSchema = z.object({
  identifier: z.string().min(3, 'Email or phone number is required'),
  token: z.string().min(6, 'Reset token or code is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const parse = ResetPasswordSchema.safeParse(body);

    if (!parse.success) {
      const msg = parse.error.issues[0]?.message || 'Invalid input data.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { identifier, token, newPassword } = parse.data;
    const cleanId = identifier.trim().toLowerCase();
    const isEmail = cleanId.includes('@');

    const tokenType = isEmail ? 'password_reset_email' : 'password_reset_phone';

    // Verify token
    const tokenRecord = await authStore.findToken(
      isEmail ? cleanId : identifier.trim(),
      token.trim(),
      tokenType
    );

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token/code. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find the user
    let user = null;
    if (isEmail) {
      user = await authStore.findUserByEmail(cleanId);
    } else {
      user = await authStore.findUserByPhone(identifier);
    }

    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Hash new password
    const { hash, salt } = hashPassword(newPassword);

    // Update user password
    const updatedUser = await authStore.updateUser(user.id, {
      passwordHash: hash,
      passwordSalt: salt,
    });

    // Invalidate token
    await authStore.consumeToken(tokenRecord.id);

    // Security requirement: Invalidate previous sessions to prevent session hijacking
    await authStore.deleteUserSessions(user.id);

    // Issue a fresh session
    const session = await authStore.createSession(user.id, {
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: ip,
    });

    // Synchronize session with Convex cloud database
    await syncSessionToConvex(
      updatedUser || user,
      session.token,
      req.headers.get('user-agent') || undefined,
      ip
    );

    const response = NextResponse.json({
      success: true,
      message: 'Password has been successfully updated. You are now logged in.',
      user: updatedUser ? authStore.toUserProfile(updatedUser) : null,
    });

    setSessionCookie(response, session.token);
    return response;
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}


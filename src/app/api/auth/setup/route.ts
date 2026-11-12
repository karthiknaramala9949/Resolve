import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, setSessionCookie } from '@/lib/server/auth/session';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword, verifyPassword } from '@/lib/server/auth/crypto';
import { syncSessionToConvex, getServerConvexClient } from '@/lib/server/convex/convexClient';
import { validateCsrf } from '@/lib/server/auth/csrf';
import { api } from '../../../../../convex/_generated/api';

const SetupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phoneNumber: z.string().min(10, 'Valid phone number is required').optional().nullable(),
  currentPassword: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
  preferences: z
    .object({
      notificationsEnabled: z.boolean().optional(),
      simpleLanguageMode: z.boolean().optional(),
    })
    .optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const csrfCheck = validateCsrf(req);
    if (!csrfCheck.valid && csrfCheck.errorResponse) {
      return csrfCheck.errorResponse;
    }

    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parse = SetupSchema.safeParse(body);

    if (!parse.success) {
      const msg = parse.error.issues[0]?.message || 'Invalid input data.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, phoneNumber, currentPassword, password, preferences } = parse.data;

    // 1. Authoritative Convex Cloud update
    const client = getServerConvexClient();
    if (client) {
      try {
        const updatedConvexUser = await client.mutation(api.auth.updateProfile, {
          sessionToken: auth.sessionToken,
          name: name ? name.trim() : undefined,
          phoneNumber: phoneNumber !== undefined ? (phoneNumber ? phoneNumber.trim() : null) : undefined,
          currentPassword,
          password,
          preferences,
        });

        if (updatedConvexUser) {
          // Keep in-memory store in sync if user also exists there
          try {
            await authStore.updateUser(auth.rawUser.id, {
              ...(name ? { name: name.trim() } : {}),
              ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber ? phoneNumber.trim() : null } : {}),
              ...(preferences ? { preferences } : {}),
            });
          } catch {
            // Non-blocking
          }

          const response = NextResponse.json({
            success: true,
            message: 'Account profile updated successfully.',
            user: updatedConvexUser,
          });

          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          response.headers.set('Pragma', 'no-cache');
          return response;
        }
      } catch (convexErr: any) {
        console.warn('[Convex Update Profile Error]:', convexErr?.data || convexErr?.message || convexErr);
        const errMsg =
          convexErr?.data ||
          convexErr?.message ||
          'Failed to update profile in Convex.';
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    // 2. In-memory fallback for local mock / unit testing
    const updates: Parameters<typeof authStore.updateUser>[1] = {};

    if (name) {
      updates.name = name.trim();
    }

    if (phoneNumber !== undefined) {
      if (phoneNumber && phoneNumber.trim().length >= 10) {
        const cleanPhone = phoneNumber.trim();
        const existing = await authStore.findUserByPhone(cleanPhone);
        if (existing && existing.id !== auth.rawUser.id) {
          return NextResponse.json(
            { error: 'This phone number is already linked to another account.' },
            { status: 409 }
          );
        }
        updates.phoneNumber = cleanPhone;
        updates.providers = [...auth.rawUser.providers, 'phone'];
      } else if (phoneNumber === null || phoneNumber === '') {
        updates.phoneNumber = null;
      }
    }

    if (password) {
      // If user already has a password, verify currentPassword first
      if (auth.rawUser.passwordHash && auth.rawUser.passwordSalt) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required to change your password.' },
            { status: 400 }
          );
        }
        const isCurrentValid = verifyPassword(
          currentPassword,
          auth.rawUser.passwordHash,
          auth.rawUser.passwordSalt
        );
        if (!isCurrentValid) {
          return NextResponse.json(
            { error: 'Current password does not match.' },
            { status: 400 }
          );
        }
      }

      const { hash, salt } = hashPassword(password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
      updates.providers = Array.from(new Set([...auth.rawUser.providers, 'email']));
    }

    if (preferences) {
      updates.preferences = preferences;
    }

    let updatedUser = await authStore.updateUser(auth.rawUser.id, updates);
    if (!updatedUser && auth.rawUser.email) {
      const fallback = await authStore.findUserByEmail(auth.rawUser.email);
      if (fallback) {
        updatedUser = await authStore.updateUser(fallback.id, updates);
      }
    }

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Synchronize changes to Convex authoritative cloud database if possible
    await syncSessionToConvex(updatedUser, auth.sessionToken);

    const response = NextResponse.json({
      success: true,
      message: 'Account profile updated successfully.',
      user: authStore.toUserProfile(updatedUser),
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (err) {
    console.error('[Account Setup Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}



import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/auth/session';
import { authStore } from '@/lib/server/db/authStore';
import { hashPassword } from '@/lib/server/auth/crypto';

const SetupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phoneNumber: z.string().min(10, 'Valid phone number is required').optional().nullable(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
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

    const { name, phoneNumber, password } = parse.data;
    const updates: Parameters<typeof authStore.updateUser>[1] = {};

    if (name) {
      updates.name = name.trim();
    }

    if (phoneNumber) {
      const cleanPhone = phoneNumber.trim();
      const existing = await authStore.findUserByPhone(cleanPhone);
      if (existing && existing.id !== auth.rawUser.id) {
        return NextResponse.json(
          { error: 'This phone number is already linked to another account.' },
          { status: 409 }
        );
      }
      updates.phoneNumber = cleanPhone;
      // Also add 'phone' to providers
      updates.providers = [...auth.rawUser.providers, 'phone'];
    }

    if (password) {
      const { hash, salt } = hashPassword(password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
    }

    const updatedUser = await authStore.updateUser(auth.rawUser.id, updates);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account profile updated successfully.',
      user: authStore.toUserProfile(updatedUser),
    });
  } catch (err) {
    console.error('[Account Setup Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}


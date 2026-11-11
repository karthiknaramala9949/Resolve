import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ user: null, sessionToken: null }, { status: 200 });
    }

    return NextResponse.json({
      user: auth.user,
      sessionToken: auth.sessionToken,
    });
  } catch (err) {
    console.error('[Auth Me API Error]:', err);
    return NextResponse.json({ user: null, sessionToken: null }, { status: 200 });
  }
}

import { NextResponse } from 'next/server';

/**
 * Guest mode endpoint - permanently disabled.
 * All users must create an account or sign in to use RESOLVE-ONE.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Guest mode has been disabled. Please create an account or sign in to continue.' },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Guest mode has been disabled. Please create an account or sign in to continue.' },
    { status: 403 }
  );
}

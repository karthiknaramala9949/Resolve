import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { UserRecord } from '../db/types';

let convexClient: ConvexHttpClient | null = null;

export function getServerConvexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  if (!convexClient) {
    convexClient = new ConvexHttpClient(url);
  }
  return convexClient;
}

/**
 * Executes a Convex mutation with error handling.
 */
export async function convexMutation<Args extends Record<string, any>, Result>(
  mutationRef: any,
  args: Args
): Promise<Result | null> {
  const client = getServerConvexClient();
  if (!client) return null;
  try {
    return (await client.mutation(mutationRef, args)) as Result;
  } catch (err: any) {
    console.warn('[ConvexServerClient] Mutation failed or deferred:', err?.message || err);
    throw err;
  }
}

/**
 * Executes a Convex query with error handling.
 */
export async function convexQuery<Args extends Record<string, any>, Result>(
  queryRef: any,
  args: Args
): Promise<Result | null> {
  const client = getServerConvexClient();
  if (!client) return null;
  try {
    return (await client.query(queryRef, args)) as Result;
  } catch (err: any) {
    console.warn('[ConvexServerClient] Query failed:', err?.message || err);
    return null;
  }
}

/**
 * Synchronizes an active user session to the Convex database.
 */
export async function syncSessionToConvex(
  user: UserRecord,
  sessionToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const client = getServerConvexClient();
  if (!client) return;

  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await client.mutation(api.auth.syncExternalSession, {
      userId: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      providers: user.providers,
      sessionToken,
      expiresAt,
      userAgent,
      ipAddress,
    });
  } catch (err: any) {
    console.warn('[ConvexSync] Cloud session registration deferred (offline or network unavailable):', err?.message || err);
  }
}

/**
 * Destroys a session in the Convex database on logout.
 */
export async function deleteSessionFromConvex(sessionToken: string): Promise<void> {
  const client = getServerConvexClient();
  if (!client) return;

  try {
    await client.mutation(api.auth.logout, { sessionToken });
  } catch (err: any) {
    console.warn('[ConvexSync] Cloud logout deferred:', err?.message || err);
  }
}



import { createAuthClient } from 'better-auth/react';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000');

export const authClient = createAuthClient({
  baseURL: appUrl,
  plugins: [convexClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  revokeSession,
  revokeSessions,
  listSessions,
} = authClient;


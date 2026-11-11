import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  'https://generous-falcon-999.convex.cloud';

const convexSiteUrl =
  process.env.CONVEX_SITE_URL ||
  (process.env.NEXT_PUBLIC_CONVEX_URL
    ? process.env.NEXT_PUBLIC_CONVEX_URL.replace('.convex.cloud', '.convex.site')
    : 'https://generous-falcon-999.convex.site');

export const nextAuth = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});

export const {
  handler,
  getToken,
  isAuthenticated,
  preloadAuthQuery,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = nextAuth;


import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'resolve_session';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Has validly formed session cookie
  const isAuthenticated = Boolean(sessionCookie && sessionCookie.includes('.'));

  const isProtectedRoute = pathname.startsWith('/app');
  const isAuthPage =
    pathname.startsWith('/auth/signin') ||
    pathname.startsWith('/auth/signup') ||
    pathname === '/login' ||
    pathname === '/signup';

  // 1. Unauthenticated user trying to access protected workspace routes
  if (isProtectedRoute && !isAuthenticated) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const redirectUrl = new URL(`/auth/signin?next=${returnUrl}`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Authenticated user trying to access sign-in or sign-up pages
  if (isAuthPage && isAuthenticated) {
    const nextParam = req.nextUrl.searchParams.get('next');
    const redirectTarget = nextParam || '/app/overview';
    return NextResponse.redirect(new URL(redirectTarget, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg
     * - public manifest or icons
     * - api routes
     */
    '/app/:path*',
    '/app',
    '/auth/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/verify-phone',
    '/account-setup',
  ],
};


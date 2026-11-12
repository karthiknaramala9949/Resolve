/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = isDev
  ? `'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.convex.cloud`
  : `'self' 'unsafe-inline' 'wasm-unsafe-eval' https://accounts.google.com https://*.convex.cloud`;

const connectSrc = isDev
  ? `'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com ws: wss:`
  : `'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com`;

const ContentSecurityPolicy = `
  default-src 'self';
  script-src ${scriptSrc};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  connect-src ${connectSrc};
  frame-src 'self' https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), payment=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Statische Assets: CORS auf eigene Domain beschränken
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://btb-app.vercel.app' },
        ],
      },
      {
        // Auth-Seiten: nie cachen (kein Proxy-Cache, kein Browser-Cache)
        source: '/(login|register|reset-password|reset-password/new)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CORS explizit einschränken (überschreibt Vercels CDN-Default Access-Control-Allow-Origin: *)
          { key: 'Access-Control-Allow-Origin', value: 'https://btb-app.vercel.app' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // CSP: 'unsafe-inline' in script-src ist eine bekannte Next.js App Router Limitation.
            // Next.js benötigt inline scripts für den RSC-Payload (Hydration).
            // Eine saubere Lösung wäre Nonces via Middleware – aktuell nicht implementiert.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://*.supabase.co`,
              `img-src 'self' data: blob: https://*.supabase.co`,
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;

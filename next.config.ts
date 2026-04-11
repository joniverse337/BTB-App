import type { NextConfig } from "next";

// NEXT_PUBLIC_APP_URL muss für jedes Deployment gesetzt sein (z.B. https://btb-app.vercel.app)
// Lokal: http://localhost:3000 (in .env.local setzen)
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://btb-app.vercel.app'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Statische Assets: CORS auf eigene Domain beschränken
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
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
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // CSP wird dynamisch per Request in middleware.ts gesetzt (mit Nonce)
        ],
      },
    ]
  },
};

export default nextConfig;

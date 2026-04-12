import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from 'sonner'
import { Inter, IBM_Plex_Sans } from 'next/font/google'
import { headers } from 'next/headers'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-ibm-plex-sans',
})

export const metadata: Metadata = {
  title: "BTB – Bautagesbericht",
  description: "Dein Bautagesbericht – schnell erstellt, perfekt dokumentiert, einfach gemanagt",
}

// Async Layout: headers() lesen macht die Seite dynamisch und gibt Next.js
// die Nonce aus dem x-nonce Request-Header. Next.js wendet die Nonce automatisch
// auf seine eigenen Inline-<script>-Tags an (Hydration, Chunks, etc.).
// In der Middleware CSP sorgt 'strict-dynamic' dafür, dass alle dynamisch
// nachgeladenen Scripts (Lazy-Loading, Code-Splitting) ebenfalls erlaubt sind.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="de" className={`dark ${inter.variable} ${ibmPlexSans.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster theme="dark" />
        </Providers>
      </body>
    </html>
  )
}

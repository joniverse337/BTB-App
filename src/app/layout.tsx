import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from 'sonner'
import { Inter, IBM_Plex_Sans } from 'next/font/google'

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`dark ${inter.variable} ${ibmPlexSans.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  )
}

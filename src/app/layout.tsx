import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "BTB – Bautagesbericht",
  description: "Dein Bautagesbericht – schnell erstellt, perfekt dokumentiert, einfach gemanagt",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  )
}

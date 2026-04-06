import Image from 'next/image'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Shared layout for auth pages (login, register, reset-password).
 * Full-screen hero background with dark overlay and a centered glassmorphic card.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background image */}
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <Image
          src="/images/hero-1.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Dark overlay */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden="true"
        style={{ background: 'rgba(14, 17, 24, 0.70)' }}
      />

      {/* Glassmorphic card container */}
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        {children}
      </div>

      {/* Legal footer */}
      <div className="absolute bottom-4 flex gap-4 text-xs text-white/40">
        <Link href="/impressum" className="hover:text-white/70 transition-colors">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-white/70 transition-colors">Datenschutz</Link>
      </div>
    </div>
  )
}

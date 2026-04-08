import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-extrabold text-white">404</h1>
      <p className="text-white/60">Diese Seite wurde nicht gefunden.</p>
      <Link href="/projekte" className="text-primary hover:underline text-sm">
        Zurück zur Übersicht
      </Link>
    </div>
  )
}

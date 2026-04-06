import Image from 'next/image'
import Link from 'next/link'

export default function ImpressumPage() {
  return (
    <div className="relative min-h-screen flex items-start justify-center px-4 py-12">
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
        style={{ background: 'rgba(14, 17, 24, 0.75)' }}
      />

      {/* Content card */}
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight text-white">Impressum</h1>
          <Link href="/login" className="text-sm text-white/50 hover:text-white/80 transition-colors">
            ← Zurück
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-white/60">

          <section>
            <h2 className="mb-2 font-semibold text-white/90">Angaben gemäß § 5 TMG</h2>
            <p>
              Jonas Schoenegge<br />
              Markt 3<br />
              17153 Stavenhagen
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">Kontakt</h2>
            <p>
              E-Mail: jonas.schoenegge@posteo.de
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>
              Jonas Schoenegge<br />
              Markt 3<br />
              17153 Stavenhagen
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">Haftungsausschluss</h2>
            <p>
              Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
          </section>

        </div>

        <div className="mt-8 flex gap-4 border-t border-white/10 pt-6 text-xs text-white/30">
          <Link href="/impressum" className="hover:text-white/60 transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-white/60 transition-colors">Datenschutz</Link>
        </div>
      </div>
    </div>
  )
}

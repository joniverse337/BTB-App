import Link from 'next/link'

export default function ImpressumPage() {
  return (
    <div className="min-h-screen text-foreground" style={{ background: 'hsl(222, 25%, 9%)' }}>

      {/* Navbar */}
      <header
        className="sticky top-0 z-50"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'hsla(222, 25%, 9%, 0.75)',
          borderBottom: '1px solid hsla(222, 15%, 100%, 0.07)',
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-baseline gap-0.5" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            <span className="text-lg font-extrabold tracking-tight text-foreground">btb</span>
            <span className="text-lg font-bold text-primary">.online</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Zurück
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1
          className="mb-10 font-extrabold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}
        >
          Impressum
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="mb-2 font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
            <p>
              Jonas Schoenegge<br />
              Markt 3<br />
              17153 Stavenhagen
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">Kontakt</h2>
            <p>
              E-Mail: jonas.schoenegge@posteo.de
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>
              Jonas Schoenegge<br />
              Markt 3<br />
              17153 Stavenhagen
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">Haftungsausschluss</h2>
            <p>
              Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid hsla(222, 15%, 100%, 0.07)' }}>
        <div className="mx-auto max-w-3xl px-6 py-8">
          <nav className="flex flex-wrap gap-6 text-xs text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}

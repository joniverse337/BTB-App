import Link from 'next/link'

export default function DatenschutzPage() {
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
          Datenschutzerklärung
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="mb-2 font-semibold text-foreground">1. Verantwortlicher</h2>
            <p>
              {/* ⚠️ HIER DEINEN NAMEN / FIRMA EINTRAGEN */}
              Verantwortlicher im Sinne der DSGVO:<br />
              Jonas Schoenegge<br />
              Markt 3<br />
              17153 Stavenhagen<br />
              E-Mail: jonas.schoenegge@posteo.de
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">2. Welche Daten wir erheben</h2>
            <p>
              Bei der Nutzung von BTB.online werden folgende personenbezogene Daten verarbeitet:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>E-Mail-Adresse (für die Registrierung und den Login)</li>
              <li>Name (optional, für das Nutzerprofil)</li>
              <li>Firmenname und Adresse (für die Firmenverwaltung)</li>
              <li>Projektdaten und Bautagesberichte (von dir eingegebene Inhalte)</li>
              <li>Technische Daten: IP-Adresse, Browser, Zugriffszeiten (Server-Logs)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">3. Zweck der Verarbeitung</h2>
            <p>
              Die erhobenen Daten werden ausschließlich zur Bereitstellung des Dienstes verwendet:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Authentifizierung und Zugriffskontrolle</li>
              <li>Speicherung und Anzeige deiner Bautagesberichte</li>
              <li>Technischer Betrieb und Fehlerdiagnose</li>
            </ul>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">4. Hosting & Datenübertragung</h2>
            <p>
              Die App wird über <strong className="text-foreground">Vercel</strong> (Vercel Inc., San Francisco, USA) gehostet.
              Die Datenbank wird von <strong className="text-foreground">Supabase</strong> (Supabase Inc.) betrieben,
              wobei der Datenbankserver in der <strong className="text-foreground">EU (Frankfurt, Deutschland)</strong> liegt.
            </p>
            <p className="mt-2">
              Vercel nutzt für den EU-Betrieb europäische Rechenzentren. Für USA-Datenübertragungen bestehen
              Standardvertragsklauseln gemäß Art. 46 DSGVO.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">5. Cookies & Sessions</h2>
            <p>
              Zur Aufrechterhaltung deiner Sitzung (Login-Status) setzt BTB.online technisch notwendige Session-Cookies.
              Diese Cookies sind für den Betrieb des Dienstes erforderlich und werden nicht für Werbung oder Tracking genutzt.
              Sie werden beim Abmelden oder nach Ablauf der Sitzung gelöscht.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">6. Deine Rechte</h2>
            <p>Du hast das Recht auf:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Anfragen bitte an: jonas.schoenegge@posteo.de
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">7. Beschwerderecht</h2>
            <p>
              Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren.
              Die zuständige Behörde richtet sich nach deinem Wohnsitz.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">8. Änderungen</h2>
            <p>
              Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden. Letzte Änderung: März 2026.
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

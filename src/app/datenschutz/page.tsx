import Image from 'next/image'
import Link from 'next/link'

export default function DatenschutzPage() {
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
          <h1 className="text-xl font-extrabold tracking-tight text-white">Datenschutzerklärung</h1>
          <Link href="/login" className="text-sm text-white/50 hover:text-white/80 transition-colors">
            ← Zurück
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-white/60">

          <section>
            <h2 className="mb-2 font-semibold text-white/90">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der DSGVO:<br />
              Jonas Schoenegge<br />
              Markt 3<br />
              17153 Stavenhagen<br />
              E-Mail: jonas.schoenegge@posteo.de
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">2. Welche Daten wir erheben</h2>
            <p>Bei der Nutzung von BTB.online werden folgende personenbezogene Daten verarbeitet:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>E-Mail-Adresse (für die Registrierung und den Login)</li>
              <li>Name (optional, für das Nutzerprofil)</li>
              <li>Firmenname und Adresse (für die Firmenverwaltung)</li>
              <li>Projektdaten und Bautagesberichte (von dir eingegebene Inhalte)</li>
              <li>Technische Daten: IP-Adresse, Browser, Zugriffszeiten (Server-Logs)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">3. Zweck der Verarbeitung</h2>
            <p>Die erhobenen Daten werden ausschließlich zur Bereitstellung des Dienstes verwendet:</p>
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
            <h2 className="mb-2 font-semibold text-white/90">4. Hosting & Datenübertragung</h2>
            <p>
              Die App wird über <strong className="text-white/90">Vercel</strong> (Vercel Inc., San Francisco, USA) gehostet.
              Die Datenbank wird von <strong className="text-white/90">Supabase</strong> (Supabase Inc.) betrieben,
              wobei der Datenbankserver in der <strong className="text-white/90">EU (Irland)</strong> liegt.
            </p>
            <p className="mt-2">
              Vercel nutzt für den EU-Betrieb europäische Rechenzentren. Für USA-Datenübertragungen bestehen
              Standardvertragsklauseln gemäß Art. 46 DSGVO.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">5. Cookies & Sessions</h2>
            <p>
              Zur Aufrechterhaltung deiner Sitzung (Login-Status) setzt BTB.online technisch notwendige Session-Cookies.
              Diese Cookies sind für den Betrieb des Dienstes erforderlich und werden nicht für Werbung oder Tracking genutzt.
              Sie werden beim Abmelden oder nach Ablauf der Sitzung gelöscht.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">6. Deine Rechte</h2>
            <p>Du hast das Recht auf:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">Anfragen bitte an: jonas.schoenegge@posteo.de</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">7. Beschwerderecht</h2>
            <p>
              Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren.
              Die zuständige Behörde richtet sich nach deinem Wohnsitz.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-white/90">8. Änderungen</h2>
            <p>
              Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden. Letzte Änderung: März 2026.
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

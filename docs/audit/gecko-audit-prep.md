# Audit-Vorbereitung — BTB-App (Firma Gecko)

> Vorbereitungs-Checkliste für den externen Audit durch Firma Gecko.
> Scope: technischer Pentest + Code-/Architektur-Review + DSGVO + Prozess-/ISO-Audit.
> Erstellt: 2026-04-23

## Status-Legende

- `[ ]` offen
- `[~]` in Arbeit
- `[x]` erledigt
- `[-]` nicht zutreffend / bewusst ausgeklammert

---

## 0. Organisatorisches (zuerst klären)

- [ ] Scope & Prüfobjekte schriftlich mit Gecko vereinbaren (URLs, API-Endpoints, Staging vs. Produktion)
- [ ] Zeitfenster des Pentests festlegen (Wartungsfenster? Zeit, in der auffällige Logs erwartet werden)
- [ ] NDA mit Gecko unterschrieben
- [ ] Auftrag / Angebot / Leistungsbeschreibung vorliegen
- [ ] Technischer Ansprechpartner bei BTB benannt (Eskalationskette bei Incident während Test)
- [ ] Test-Accounts bereitstellen: mind. 2 separate Companies × 2 Rollen (Admin + Bauleiter) für Cross-Tenant-Tests
- [ ] "Out of Scope"-Liste definiert (z. B. DoS, Social Engineering, Supabase-Infrastruktur)
- [ ] Abgrenzung Hosting-Provider: klarstellen, dass Supabase und Vercel **nicht** mitgeprüft werden, sondern nur die BTB-App darauf
- [ ] Klärung: darf Gecko eigene Auth-Bypass-Versuche machen? Rate-Limits erhöhen während des Tests?

---

## 1. Artefakte / Dokumente, die der Prüfer sehen will

Diese Dokumente sollten **vor Audit-Beginn** fertig in einem Data-Room (z. B. geteilter Ordner mit Leserechten) liegen.

### 1.1 Architektur & Betrieb

- [ ] **Architektur-Diagramm** (Next.js ↔ Supabase ↔ Vercel ↔ Externals)
- [ ] **Datenflussdiagramm** mit Klassifizierung (welche PII fließt wo)
- [ ] **Bedrohungsmodell** (STRIDE oder ähnlich) für die Top-5-Datenflüsse: Login, BTB-Erstellung, Druckrouten, Einladungen (PROJ-12), Company-Wechsel
- [ ] **Tech-Stack-Dokumentation** (Versionen, Hosting-Regionen, Umgebungen dev/staging/prod)
- [ ] **Backup- und Recovery-Plan** (Supabase PITR aktiv? RTO/RPO? getesteter Restore?)
- [ ] **Monitoring-/Alerting-Übersicht** (Vercel Analytics, Supabase Logs, Sentry o. ä.)

### 1.2 Sicherheit

- [ ] **RLS-Policy-Matrix** — Tabellen × Rollen × Operationen, mit zitierter Policy-Bedingung (Basis: Abfrage aus `pg_policies`)
- [ ] **Berechtigungskonzept** — Rollen (Firmen-Admin, Bauleiter, Polier, Gast) × Ressourcen × erlaubte Aktionen
- [ ] **Secrets-Management-Policy** (wer hat Zugriff auf service_role, Vercel-Env, Supabase-Dashboard)
- [ ] **Incident-Response-Plan** (Eskalationswege, Kontaktdaten, Meldepflichten)
- [ ] **Change-Management-Prozess** (wie kommen Änderungen nach Prod, wer reviewt)
- [ ] **Penetration-Test-Historie** (falls frühere Tests existieren)

### 1.3 DSGVO

- [ ] **Datenschutzerklärung** — aktuell, mit allen Empfängern, Drittländern, Rechtsgrundlagen
- [ ] **Verzeichnis von Verarbeitungstätigkeiten (VVT)** nach Art. 30 DSGVO
- [ ] **TOM-Dokumentation** (technische und organisatorische Maßnahmen)
- [ ] **AVV mit Supabase** (unterschrieben, Version dokumentiert)
- [ ] **AVV mit Vercel**
- [ ] **AVV mit allen weiteren Subprozessoren** (Mail-Versand, Error-Tracking, Analytics)
- [ ] **DSFA** (Datenschutz-Folgenabschätzung) — bei Arbeitnehmerdaten oft Pflicht, dokumentieren oder begründet ausschließen
- [ ] **Löschkonzept / Retention-Policy** (Wie lange werden BTBs/Schichten aufbewahrt? Wann gelöscht?)
- [ ] **Prozess für Betroffenenrechte** (Auskunft, Löschung, Portabilität) — dokumentiert und technisch umsetzbar
- [ ] **Cookie-/Tracking-Konzept** (falls eingesetzt)

### 1.4 Rechtliches

- [ ] **Impressum** vollständig (TMG / DDG)
- [ ] **AGB / Nutzungsbedingungen** B2B
- [ ] **Lizenzen eingesetzter Open-Source-Pakete** dokumentiert
- [ ] **Versicherungsschutz** (Cyber, Berufshaftpflicht) aktuell

---

## 2. Technischer Pentest — Selbstchecks vorher

Der Prüfer wird all das testen — besser wir finden es zuerst.

### 2.1 Broken Access Control (OWASP #1) — **höchste Priorität für Multi-Tenant**

- [ ] IDOR-Test auf allen API-Routen mit ID-Parametern:
  - [ ] `/api/projects/[id]` — Cross-Company
  - [ ] `/api/shifts/[id]`, `/api/shifts/[id]/workers`, `/api/shifts/[id]/equipment`
  - [ ] Druck-Routen: `/api/btb/[id]/print` o. ä.
  - [ ] Arbeitsanmeldung-Routen (PROJ-7)
  - [ ] Gasteinladungs-Routen (PROJ-12)
  - [ ] Company/Profile-Routen (PROJ-5)
  - [ ] Projekteinstellungen (PROJ-6)
- [ ] Direkter Angriff auf Supabase PostgREST (Bypass des Next.js-Layers): anon-Key + beliebige IDs probieren → RLS muss trotzdem greifen
- [ ] Test: User A verschiebt seine Ressource in Company B (Update von `company_id` / `project_id`) — muss von `WITH CHECK` abgefangen werden
- [ ] Role-Escalation-Test: Normaler Bauleiter versucht Admin-Endpoints
- [ ] Gast-Escalation-Test (PROJ-12): Gasteingeladener User manipuliert Zugriffsumfang
- [ ] Deaktivierte Company (`is_active = false`) — kann ein User der deaktivierten Company noch lesen/schreiben? Muss blockiert sein

### 2.2 Authentifizierung

- [ ] Passwort-Policy (Mindestlänge, Common-Password-Check, Rotation bei Leak)
- [ ] MFA (TOTP) verfügbar und für Admin-Accounts erzwungen
- [ ] Account-Enumeration bei Login: identische Fehlermeldung für "User existiert nicht" und "Passwort falsch"
- [ ] Account-Enumeration bei Passwort-Reset: identische Bestätigung unabhängig davon, ob E-Mail existiert
- [ ] Passwort-Reset-Token: Entropie, Single-Use, Ablaufzeit (z. B. 15–60 min)
- [ ] Session-Invalidation nach Logout (Supabase-Session wirklich weg?)
- [ ] Session-Invalidation nach Passwort-Änderung (alle anderen Devices ausloggen)
- [ ] Brute-Force-Schutz: Rate-Limit auf Login (z. B. Upstash Ratelimit)
- [ ] CAPTCHA oder Abwehr nach X fehlgeschlagenen Versuchen
- [ ] E-Mail-Verifizierung erzwungen vor erster Nutzung

### 2.3 Session & Cookies

- [ ] Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (oder `Strict`)
- [ ] JWT-Expiry sinnvoll (nicht > 1 h ohne Refresh)
- [ ] Refresh-Token-Rotation aktiv
- [ ] CSRF-Schutz auf state-changing API-Routen (Next.js App Router liefert das nicht automatisch)

### 2.4 Input Validation & Injection

- [ ] Zod-Schemas **auch server-seitig** in allen API-Routen (nicht nur im Formular)
- [ ] Prüfung aller RPC-Calls (`supabase.rpc(...)`): keine String-Konkatenation in SQL
- [ ] XSS-Tests auf allen freien Textfeldern (BTB-Bemerkungen, Arbeiter-Notizen, Projektnamen, Firmennamen) — besonders wichtig, weil in PDFs gerendert
- [ ] HTML-Injection in PDF-Renderer (PaperEngine, PROJ-8): versucht `<script>`, `<img onerror=...>`, `<iframe>`, externe `<img src="http://attacker">` (SSRF)
- [ ] File-Upload: MIME-Sniffing, Magic-Bytes, Größenlimit, Dateinamen-Escaping, doppelte Extensions (`.jpg.html`)
- [ ] Storage-Bucket-Policies: nicht öffentlich, nur über signed URLs
- [ ] SQL-Injection via Supabase-`filter`-Params (`.eq`, `.or`) — ja, geht bei unsauberem Einbau von User-Input

### 2.5 HTTP-Header

- [ ] `Strict-Transport-Security` (HSTS) gesetzt, `max-age >= 31536000`, `includeSubDomains`
- [ ] `Content-Security-Policy` restriktiv (keine `unsafe-inline` für Scripts, wenn vermeidbar)
- [ ] `X-Frame-Options: DENY` oder CSP `frame-ancestors 'none'` (Clickjacking auf Login)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` (Kamera, Mikrofon, Geo nur wo nötig)
- [ ] Keine Server-Header, die Version verraten
- [ ] CORS-Config: keine `*` bei state-changing Routen

### 2.6 Business Logic

- [ ] Rückdatieren von BTBs (`report_date`) — erlaubt oder gesperrt?
- [ ] Doppelte BTBs für gleichen Tag + Projekt verhindert
- [ ] Race Condition beim gleichzeitigen Abschluss einer Schicht (zwei Nutzer, zwei Tabs)
- [ ] Nachträgliches Editieren von abgeschlossenen / gedruckten BTBs (Audit-Trail!)
- [ ] Manipulation von Arbeitszeiten in der Arbeitsanmeldung (PROJ-7) — Historie?
- [ ] Company-Wechsel: Kann ein User durch Profiländerung plötzlich in einer anderen Company auftauchen?

### 2.7 Transport

- [ ] TLS-Version ≥ 1.2, besser nur 1.3 auf eigener Domain
- [ ] SSL-Labs-Score ≥ A (https://www.ssllabs.com/ssltest/)
- [ ] Redirects von `http://` automatisch auf `https://`
- [ ] E-Mail-Domain SPF, DKIM, DMARC (falls eigener Versand)

### 2.8 Dependencies

- [ ] `npm audit` — kritische Findings auf 0
- [ ] Dependabot / Renovate aktiviert
- [ ] `package-lock.json` committet, keine floating Ranges bei security-kritischen Paketen
- [ ] Supabase-Client aktuell
- [ ] Next.js aktuell (Security Advisories https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)

---

## 3. Code- / Architektur-Review

### 3.1 Secrets & Konfiguration

- [ ] `.env.local` **nicht** im Repo (per `.gitignore`) — aktueller Stand prüfen
- [ ] Keine Secrets in Commit-History (`gitleaks` o. ä. laufen lassen)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nur in Server-Code / Edge Functions referenziert, nie im `"use client"`-Code
- [ ] `NEXT_PUBLIC_*`-Variablen nur für wirklich öffentliche Werte
- [ ] Rotation-Plan für alle Keys (Supabase, Vercel, OAuth)

### 3.2 Server vs. Client

- [ ] Alle Server-only-Funktionen mit `import "server-only"` markiert
- [ ] Keine Verwendung des Service-Role-Keys in "use client"-Komponenten
- [ ] API-Routen prüfen Session **immer**, nicht nur RLS (defense in depth)
- [ ] Middleware (`middleware.ts`) prüft Auth auf geschützten Routen

### 3.3 TypeScript & Linting

- [ ] `strict: true` in `tsconfig.json`
- [ ] Keine `any` / `@ts-ignore` in sicherheitsrelevanten Pfaden
- [ ] ESLint Security-Plugins (`eslint-plugin-security`, `eslint-plugin-no-secrets`)
- [ ] CI bricht bei Lint-/Typecheck-Fehlern

### 3.4 Datenbank

- [ ] Alle Tabellen haben RLS aktiviert
- [ ] Für jede Tabelle mindestens eine Policy — sonst ist der Default deny (ok) oder es fehlen Policies (Fehler)
- [ ] Supabase Advisors (Security + Performance) durchgelaufen, offene Findings geschlossen oder dokumentiert
- [ ] Indizes auf häufig gefilterten Spalten (auch aus Security-Sicht: langsame Queries → DoS)
- [ ] Foreign Keys mit `ON DELETE` konsistent (keine Waisen)
- [ ] Sensitive Spalten verschlüsselt / pgsodium (nur wenn nötig)

### 3.5 Audit-Trail

- [ ] Audit-Log-Tabelle für sicherheitsrelevante Aktionen: Anlage/Änderung/Löschung von BTBs, Schichten, Usern, Permissions
- [ ] Logs unveränderlich (append-only, eigener RLS-Policy-Satz)
- [ ] Felder: `timestamp`, `user_id`, `company_id`, `action`, `resource_type`, `resource_id`, `before`/`after` (ggf.)

---

## 4. DSGVO / Datenschutz

### 4.1 Rechtsgrundlagen & Rollen

- [ ] Rolle von BTB geklärt: **Auftragsverarbeiter** für das Bauunternehmen (Kunde = Verantwortlicher)
- [ ] Muster-AVV zwischen BTB und Kunden (Bauunternehmen) vorhanden
- [ ] Rechtsgrundlage für jede Verarbeitung dokumentiert (Art. 6 DSGVO)
- [ ] Beschäftigtendaten: zusätzliche Rechtsgrundlage nach § 26 BDSG prüfen
- [ ] Ggf. Betriebsvereinbarung mit Betriebsrat beim Kunden notwendig

### 4.2 Datenminimierung & Retention

- [ ] Arbeiter-Daten (Name, ggf. Nationalität, Qualifikationen): wirklich nötig? minimieren
- [ ] Löschfristen definieren:
  - [ ] BTBs: 5 Jahre Gewährleistung + ggf. 10 Jahre steuerlich vs. DSGVO-Minimierung
  - [ ] Arbeitszeit-Dokumentation: MiLoG §17 (2 Jahre Mindestaufbewahrung)
  - [ ] Logs: max. 90 Tage (nach Standard-TOM)
- [ ] Automatische Löschjobs implementiert (oder manuelles Verfahren dokumentiert)

### 4.3 Betroffenenrechte (Art. 15–22 DSGVO)

- [ ] Auskunftsprozess definiert (Wer bearbeitet? Wie wird verifiziert?)
- [ ] Technischer Export ("Datenportabilität") möglich
- [ ] Löschprozess getestet (wirklich alle Daten weg? Backups?)
- [ ] Berichtigungsprozess
- [ ] Widerspruch / Einschränkung

### 4.4 Datenschutz durch Technikgestaltung (Art. 25)

- [ ] Pseudonymisierung wo möglich
- [ ] Verschlüsselung in Transit (TLS) und at Rest (Supabase-Default)
- [ ] Zugriffsbeschränkung auf Need-to-know (RLS, Rollen)
- [ ] Privacy by Default bei neuen Features

### 4.5 Drittland-Transfers

- [ ] Supabase-Projekt **Region klären**: `eu-west-1` (Ireland) — EU, aber US-Mutterkonzern → Schrems-II-Problematik. Prüfen, ob ein strenger Auditor `eu-central-1` (Frankfurt) verlangen würde
- [ ] Vercel: Edge-Regionen/Deployment-Regionen dokumentieren
- [ ] Subprozessoren-Liste aktuell
- [ ] Standardvertragsklauseln (SCCs) wo nötig

### 4.6 Meldepflichten & Dokumentation

- [ ] Data-Breach-Meldeprozess (72h an Aufsichtsbehörde)
- [ ] Vorlagen für Breach-Notification an Kunden
- [ ] Datenschutzbeauftragter (intern/extern) benannt, wenn > 20 Personen mit PII-Verarbeitung beschäftigt

---

## 5. Prozess- / ISO-Audit

Auch wenn keine volle ISO-27001-Zertifizierung ansteht: Ein Prüfer erwartet die Kontrollen im Kern.

### 5.1 Informationssicherheits-Management

- [ ] IT-Sicherheitsleitlinie schriftlich (1–2 Seiten reichen für Start-Size)
- [ ] Verantwortlichkeiten zugewiesen (wer ist für Security verantwortlich?)
- [ ] Risikobewertung / Risiko-Register (Top-10-Risiken mit Maßnahmen)

### 5.2 Zugriffskontrolle

- [ ] Least-Privilege-Prinzip dokumentiert und umgesetzt
- [ ] Offboarding-Prozess (Accounts werden deaktiviert, Keys rotiert)
- [ ] Regelmäßige Access-Reviews (wer hat Supabase-Dashboard-Zugang?)

### 5.3 Betrieb

- [ ] Backup-Strategie dokumentiert (Supabase PITR + ggf. externes Backup)
- [ ] Patch-Management (wie schnell werden Security-Updates eingespielt?)
- [ ] Change-Management (Git-Flow, PR-Reviews, Deploy-Logs)

### 5.4 Lieferantenmanagement

- [ ] Liste aller externen Dienstleister (Supabase, Vercel, Domain-Registrar, Mail, ggf. Sentry, ggf. Stripe, ggf. Support-Tools)
- [ ] Für jeden: Security- und Datenschutzniveau bewertet
- [ ] Exit-Strategie (was wenn Supabase plötzlich weg ist?)

### 5.5 Incident Management

- [ ] Prozess dokumentiert (Erkennung → Eindämmung → Behebung → Lessons learned)
- [ ] Kommunikations-Templates (intern, Kunden, Behörden)
- [ ] Kontaktliste aktuell (24/7?)

### 5.6 Business Continuity

- [ ] Worst-Case-Szenarien durchdacht (Supabase-Ausfall, Vercel-Ausfall, Account-Kompromittierung)
- [ ] Restore-Procedure min. 1× getestet und protokolliert

---

## 6. BTB-spezifisch (Bau-Branche)

### 6.1 Rechtssichere Ersetzung von Papier-BTBs

- [ ] Nachweis, dass digitale BTBs vor deutschen Behörden und Gerichten Bestand haben
- [ ] Revisionssicherheit / Unveränderbarkeit abgeschlossener BTBs
- [ ] Audit-Trail jeder Änderung (wer, wann, was, warum)
- [ ] Zeitstempel manipulationssicher (Server-Zeit, nicht Client-Zeit)

### 6.2 MiLoG / SOKA-BAU

- [ ] Arbeitszeit-Dokumentation erfüllt MiLoG §17 (Dauer, Beginn, Ende, mind. 2 Jahre Aufbewahrung)
- [ ] Export für Zollprüfung / SOKA-BAU-Prüfung nutzbar
- [ ] Unveränderbarkeit nach Eingabe (mind. nach Abschluss)

### 6.3 GoBD (Steuerrecht)

- [ ] GoBD-Konformität bewertet (sofern BTBs als steuerlich relevante Dokumente gelten können)
- [ ] Unveränderbarkeit, Vollständigkeit, Richtigkeit, Zeitgerechtigkeit, Ordnung, Nachvollziehbarkeit

### 6.4 Branchen-Kundenanforderungen

- [ ] Große Bau-Kunden haben oft eigene Security-Fragebögen (VDA ISA / TISAX bei Automotive-Nähe, BSI bei öffentlichen Auftraggebern) — vorbereiten

---

## 7. Quick Wins — sofort umsetzbar

Low-effort, high-impact. Vor dem Audit zuerst angehen:

- [ ] `npm audit` + kritische Updates einspielen
- [ ] Security-Header via `next.config.ts` setzen (HSTS, CSP, X-Frame-Options, …)
- [ ] Rate-Limit auf `/api/auth/*` (z. B. Upstash Ratelimit)
- [ ] Alle `"use client"`-Dateien grep'en auf `SUPABASE_SERVICE_ROLE_KEY` — muss 0 Treffer sein
- [ ] `gitleaks` auf Commit-Historie laufen lassen
- [ ] Supabase Advisors (Security + Performance) durchlaufen
- [ ] Zwei Test-Companies mit je 2 Usern anlegen und per Hand Cross-Tenant-Zugriffe durchtesten
- [ ] Datenschutzerklärung Review (aktuell auf den Seiten? alle Subprozessoren genannt?)
- [ ] Impressum Review (TMG/DDG-konform?)
- [ ] Backup einmal einspielen in Test-Projekt

---

## 8. Nützliche Befehle / Queries

### Supabase — alle RLS-Policies dumpen

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Supabase — Tabellen ohne aktivierte RLS finden

```sql
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity;
```

### Supabase — Tabellen mit RLS aber ohne Policies (= effektiv deny all, prüfen ob gewollt)

```sql
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  );
```

### npm Audit

```bash
npm audit --audit-level=high
npm outdated
```

### Header-Check (extern)

- https://securityheaders.com/?q=<deine-domain>
- https://www.ssllabs.com/ssltest/
- https://observatory.mozilla.org/

### Secrets-Scan

```bash
# gitleaks einmalig ausführen
brew install gitleaks
gitleaks detect --source . --verbose
```

---

## 9. Projekt-interne Follow-ups

- [ ] Ergebnisse des Self-Pentests in `features/` neues Ticket `PROJ-X-security-hardening.md`
- [ ] Jeden Befund mit Schweregrad (Critical/High/Medium/Low) priorisieren
- [ ] Nach Audit: Gecko-Befunde gleich strukturiert anlegen, damit Abarbeitung trackbar bleibt

---

## Zeitplan-Template

| Woche | Fokus |
|---|---|
| Woche 1 | Quick Wins + Dokumente sichten (AVV, Datenschutzerklärung, Impressum) |
| Woche 2 | Self-Pentest (IDOR + Auth + Input Validation) |
| Woche 3 | RLS-Matrix, Threat Model, Audit-Log-Tabelle |
| Woche 4 | DSGVO-Paket (VVT, TOMs, Löschkonzept) |
| Woche 5 | Generalprobe: alle Artefakte im Data-Room, Test-Accounts bereit, letzte Lücken schließen |
| Woche 6 | Audit-Start |

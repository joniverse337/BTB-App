# PROJ-1: Authentifizierung

## Status: In Review
**Created:** 2026-03-12
**Last Updated:** 2026-03-13

## Dependencies
- None (Basis für alle anderen Features)

## User Stories
- Als neuer Nutzer möchte ich mich mit E-Mail und Passwort registrieren, damit ich die App nutzen kann.
- Als bestehender Nutzer möchte ich mich einloggen, damit ich meine Projekte und Berichte sehe.
- Als eingeloggter Nutzer möchte ich mich ausloggen, damit mein Account auf fremden Geräten geschützt ist.
- Als Nutzer der sein Passwort vergessen hat, möchte ich eine Reset-E-Mail anfordern können.
- Als eingeloggter Nutzer werde ich nach Browser-Schließen automatisch wieder eingeloggt (Session-Persistenz).

## Acceptance Criteria

### Login & Register Design
- [ ] `/login` und `/register` haben das Hintergrundbild aus PROJ-0 als Seitenhintergrund
- [ ] Das Login-/Register-Formular sitzt in einer leicht transparenten Box (analog zur Logo-Box der alten Landing Page)
- [ ] Eingeloggte Nutzer die `/` aufrufen werden direkt zu `/projekte` weitergeleitet
- [ ] Nicht eingeloggte Nutzer die `/` aufrufen werden zu `/login` weitergeleitet (keine Landing Page mehr)

### Registrierung & Login
- [x] Registrierung mit E-Mail + Passwort (min. 8 Zeichen) ist möglich
- [x] Nach Registrierung wird eine Bestätigungs-E-Mail via Supabase verschickt
- [x] Login mit korrekten Daten leitet auf die Projektübersicht weiter
- [x] Fehlermeldung bei falschen Login-Daten (kein Hinweis ob E-Mail oder Passwort falsch – Security)
- [x] Passwort-Reset per E-Mail funktioniert
- [x] Logout löscht die Session und leitet auf Login-Seite weiter
- [x] Nicht eingeloggte Nutzer werden bei Zugriff auf geschützte Seiten auf /login weitergeleitet
- [x] Eingeloggte Nutzer werden bei /login direkt auf die App weitergeleitet
- [x] Session bleibt nach Browser-Neustart erhalten (Supabase SSR Cookies)

## Edge Cases
- E-Mail bereits registriert → Fehlermeldung "Diese E-Mail ist bereits vergeben"
- Passwort zu kurz → Inline-Validierung vor dem Absenden
- Ungültige E-Mail-Adresse → Inline-Validierung
- Reset-Link abgelaufen → Fehlermeldung mit Hinweis, neuen Link anzufordern
- Supabase nicht erreichbar → Fehlermeldung "Verbindungsfehler, bitte später erneut versuchen"

## Technical Requirements
- Supabase Auth (Email + Password Provider)
- Next.js Middleware für Route-Protection
- Kein OAuth / Social Login in MVP
- Session via Supabase SSR Client (nicht nur Client-Side)
- Formularvalidierung mit react-hook-form + Zod

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure

```
/                         (Landing Page – public)
+-- HeroSection
|   +-- Headline + Tagline ("Dein Bautagesbericht...")
|   +-- Button: "Jetzt starten" → /register
|   +-- Button: "Einloggen" → /login

/register                 (public)
+-- RegisterForm
|   +-- Email Input
|   +-- Password Input (min. 8 Zeichen)
|   +-- Submit Button
|   +-- Link: "Bereits registriert? → /login"
|   +-- Inline Validation Messages (Zod)
|   +-- Supabase Error Display

/login                    (public)
+-- LoginForm
|   +-- Email Input
|   +-- Password Input
|   +-- Submit Button
|   +-- Link: "Passwort vergessen? → /reset-password"
|   +-- Link: "Noch kein Konto? → /register"
|   +-- Generic Error Display (kein Hinweis ob E-Mail/PW falsch)

/reset-password           (public)
+-- ResetPasswordForm
|   +-- Email Input
|   +-- Submit Button
|   +-- Bestätigung (E-Mail versandt)

/auth/callback            (Supabase magic link landing, kein UI)

/projekte                 (geschützt – Ziel nach Login)
```

### Datenmodell

Kein eigenes Datenbankschema nötig – Supabase Auth verwaltet alles intern.

```
User (von Supabase verwaltet):
- ID (UUID, eindeutig)
- E-Mail
- Passwort (gehasht, nie lesbar)
- E-Mail bestätigt? (ja/nein)
- Erstellt am
- Letzter Login

Session (im Browser gespeichert via Cookies):
- Access Token (kurzlebig, ~1 Stunde)
- Refresh Token (langlebig, erneuert den Access Token automatisch)
→ Session überlebt Browser-Neustart dank Cookie-Persistenz
```

### Tech-Entscheidungen

| Entscheidung | Wahl | Warum |
|---|---|---|
| Auth-Anbieter | Supabase Auth | Fertige E-Mail/Passwort-Lösung, kein eigenes Backend nötig |
| Session-Strategie | Supabase SSR (Cookies) | Session auch server-seitig lesbar → sichere Route-Protection |
| Route Protection | Next.js Middleware | Läuft vor jeder Anfrage, schützt alle Seiten zentral |
| Formularvalidierung | react-hook-form + Zod | Inline-Fehler, kein unnötiges Re-Rendering |
| Passwort-Reset | Supabase E-Mail-Flow | Eingebaut, kein eigener E-Mail-Server nötig |

Route Protection Logic:
- Nicht eingeloggt + geschützte Route → redirect zu /login
- Eingeloggt + /login oder /register → redirect zu /projekte
- / → wenn eingeloggt: redirect zu /projekte, sonst: Landing Page

### Dependencies

| Paket | Zweck |
|---|---|
| @supabase/supabase-js | Supabase Client (Auth, DB) |
| @supabase/ssr | Session-Handling in Next.js SSR/Middleware |
| react-hook-form | Formular-State-Management |
| zod | Schema-Validierung |
| @hookform/resolvers | Verbindet Zod mit react-hook-form |

## Implementation Notes (Frontend)
**Erstellt:** 2026-03-13

**Gebaut:**
- `src/app/page.tsx` – Landing Page mit Tagline, "Jetzt starten" + "Einloggen" Buttons und Stats-Grid
- `src/app/login/page.tsx` – Login-Formular mit generischer Fehlermeldung (Security)
- `src/app/register/page.tsx` – Registrierung mit E-Mail-Bestätigungs-Flow
- `src/app/reset-password/page.tsx` – Passwort-Reset per E-Mail
- `src/app/auth/callback/route.ts` – Supabase Auth Callback Handler
- `src/app/projekte/page.tsx` – Geschützte Platzhalter-Seite mit Logout
- `middleware.ts` – Route Protection (alle Weiterleitungsregeln aus der Spec)
- `src/lib/supabase.ts` – Browser Client via @supabase/ssr
- `src/app/globals.css` – BTB Dark Theme (#0e1118 bg, #e8c547 Gelb)

**Theme:** Dark-only via `class="dark"` auf `<html>`. `#0e1118` → `hsl(222 26% 7%)`, `#e8c547` → `hsl(47 78% 59%)` als `--primary`.

**Stack:** react-hook-form + Zod, @supabase/ssr für SSR-sichere Sessions, Next.js Middleware für Route Protection.

## QA Test Results
**Getestet:** 2026-03-13 | **Build:** PASS

### Ergebnis: 13/13 Acceptance Criteria bestanden

### Behobene Bugs
- **BUG-7 (behoben):** Login-Seite zeigt jetzt eine Fehlermeldung wenn `?error=auth_callback_failed` im Query-Parameter enthalten ist

### Bekannte offene Punkte (kein Blocker)
- **BUG-3:** In-Memory Rate-Limiter nicht persistent über Serverless-Instanzen (Supabase-eigenes Rate-Limiting greift als primäre Absicherung)
- **BUG-4:** IP-Erkennung via `x-forwarded-for` manipulierbar (in Vercel-Produktion durch Header-Handling abgemildert)
- **BUG-5:** CSP enthält `'unsafe-inline'` und `'unsafe-eval'` (Next.js-Limitation, Security-Hardening vor Public Launch)
- **BUG-2:** `/reset-password/new` für eingeloggte Nutzer erreichbar (kein Sicherheitsrisiko, leichte UX-Verbesserung möglich)

### Spec-Abweichung (bewusste Entscheidung)
- Doppelte E-Mail-Registrierung zeigt bewusst keinen Fehler "Diese E-Mail ist bereits vergeben", sondern einen generischen Erfolgsscreen → verhindert User-Enumeration-Angriffe

## QA Re-Test Results (2026-03-22)

**Tested:** 2026-03-22 | **Tester:** QA Engineer (AI) | **Build:** PASS

### Acceptance Criteria Re-Test

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-1 | Landing Page (/) oeffentlich mit 3 Saetzen | PASS | `page.tsx` zeigt "Schnell erstellt, perfekt dokumentiert, einfach gemanagt." |
| AC-2 | "Jetzt starten" Button -> /register | PASS | `Link href="/register"` vorhanden |
| AC-3 | "Einloggen" Button -> /login | PASS | `Link href="/login"` vorhanden |
| AC-4 | Eingeloggte Nutzer / -> /projekte Redirect | PASS | `middleware.ts:79-82` prueft User und leitet um |
| AC-5 | Registrierung mit E-Mail + Passwort (min 8) | PASS | Zod-Schema `min(8)` in `register/page.tsx:16` |
| AC-6 | Bestaetigungs-E-Mail via Supabase | PASS | `signUp()` in Zeile 39 loest Supabase-eigene E-Mail aus |
| AC-7 | Login mit korrekten Daten -> /projekte | PASS | `router.push('/projekte')` nach erfolgreichem `signInWithPassword` |
| AC-8 | Fehlermeldung bei falschen Login-Daten (generisch) | PASS | "E-Mail oder Passwort ist falsch." (Zeile 49) -- kein Hinweis ob E-Mail/PW |
| AC-9 | Passwort-Reset per E-Mail | PASS | `resetPasswordForEmail` in `reset-password/page.tsx:34`, Callback -> `/reset-password/new` |
| AC-10 | Logout loescht Session -> /login | PASS | `signOut()` + `router.push('/login')` in `projekte/page.tsx:136-138` |
| AC-11 | Nicht-eingeloggte -> /login Redirect | PASS | `middleware.ts:92-93` leitet nicht-auth auf /login |
| AC-12 | Eingeloggte bei /login -> /projekte | PASS | `middleware.ts:87-88` leitet eingeloggte von Auth-Routen zu /projekte |
| AC-13 | Session-Persistenz nach Browser-Neustart | PASS | Supabase SSR Cookies via `@supabase/ssr`, Middleware refreshed Token |

### Edge Cases Re-Test

| Edge Case | Status | Anmerkung |
|-----------|--------|-----------|
| E-Mail bereits registriert | PASS (bewusste Abweichung) | Generischer Erfolgsscreen statt "bereits vergeben" -- verhindert Enumeration |
| Passwort zu kurz | PASS | Zod `min(8)` mit Fehlermeldung |
| Ungueltige E-Mail | PASS | Zod `.email()` Validierung |
| Reset-Link abgelaufen | PASS | `new/page.tsx:45` zeigt "Der Reset-Link ist abgelaufen" |
| Supabase nicht erreichbar | PASS | `login/page.tsx:46` und `register/page.tsx:45` pruefen auf fetch/network Fehler |

### Neue Findings (2026-03-22)

#### BUG-AUTH-1: CSP enthaelt 'unsafe-inline' aber nicht mehr 'unsafe-eval'
- **Severity:** Medium
- **Datei:** `next.config.ts:21`
- **Beschreibung:** `script-src 'self' 'unsafe-inline'` -- `unsafe-eval` wurde entfernt seit letztem QA, aber `unsafe-inline` bleibt bestehen. Dies schwaecht XSS-Schutz. Kombiniert mit dem Stored-XSS-Vektor in shift-card (SEC-3a aus PROJ-5) ist dies ein exploitbarer Pfad.
- **Status:** BEKANNT (BUG-5 aus vorherigem QA), Prioritaet: Vor Public Launch fixen

#### BUG-AUTH-2: Reset-Password-Formular zeigt Supabase-Fehlermeldung direkt an
- **Severity:** Low
- **Datei:** `src/app/reset-password/page.tsx:42`
- **Beschreibung:** Im else-Zweig wird `error.message` direkt angezeigt (`setServerError(error.message)`). Dies koennte Supabase-interne Fehlertexte (z.B. Rate-Limiting-Meldungen, interne Fehlercodes) an den Nutzer leaken. Im Login-Formular wird korrekt eine generische Meldung gezeigt.
- **Reproduktion:** Supabase Rate-Limiting ausloesen, Fehlermeldung beobachten.
- **Erwartetes Verhalten:** Generische Fehlermeldung anzeigen.

### Security Re-Audit

| Check | Status | Anmerkung |
|-------|--------|-----------|
| Auth-Bypass | PASS | `getUser()` (server-seitige JWT-Validierung) in Middleware |
| Route Protection | PASS | Middleware schuetzt alle Nicht-Auth-Routen |
| Session via Cookies | PASS | Supabase SSR Cookies, kein localStorage fuer Tokens |
| Rate Limiting Auth | PASS (mit Einschraenkung) | In-Memory Map, nicht persistent ueber Serverless |
| Open Redirect | PASS | `redirectTo` in `resetPasswordForEmail` nutzt `window.location.origin`, nicht User-Input |
| Enumeration | PASS | Register zeigt immer generischen Erfolg, Login zeigt generischen Fehler |

### Zusammenfassung

- **Acceptance Criteria:** 13/13 PASS
- **Edge Cases:** 5/5 PASS
- **Neue Bugs:** 1 Medium (CSP, bekannt), 1 Low (Reset-Error-Leak)
- **Production Ready:** JA (keine neuen High/Critical)

## Deployment
_To be added by /deploy_

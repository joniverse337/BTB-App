---
id: PROJ-0
title: Landing Page
status: In Review
created: 2026-03-22
updated: 2026-03-25
---

# PROJ-0: Landing Page (Redesign)

## Overview
Öffentliche Einstiegsseite für BTB.online. Hero-Design mit Vollbild-Baustellenfotos-Karussell im Hintergrund, Logo-Box links und interaktiver BTB-Demo-Card rechts. Die Demo-Card ist rein frontend-seitig – kein Backend-Bezug, keine gespeicherten Daten.

## Dependencies
Keine (steht vor allen anderen Features, kein Auth erforderlich)

## Layout-Überblick

```
┌─────────────────────────────────────────────────────────┐
│  Navbar: BTB.online Logo | [Einloggen] [Kostenlos starten] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Hintergrundbild – Baustelle, wechselt per Karussell]  │
│                                                         │
│  ┌──────────────────┐        ┌─────────────────────┐   │
│  │  btb.online      │        │   BTB-Demo-Card      │   │
│  │  (fett, groß)    │        │   (interaktiv,       │   │
│  │                  │        │    gelber Rahmen)    │   │
│  │  Deine Baustelle,│        │                      │   │
│  │  dein Bautages-  │        │                      │   │
│  │  bericht.        │        │                      │   │
│  └──────────────────┘        └─────────────────────┘   │
│                                                         │
│  ◀ ▶  (Karussell-Navigation, gefüllte Kreise, gelber Pfeil) │
└─────────────────────────────────────────────────────────┘
```

## User Stories

1. Als **Besucher** möchte ich sofort verstehen, was BTB.online ist, damit ich entscheiden kann, ob ich mich registriere.
2. Als **Besucher** möchte ich eine echte BTB-Card interaktiv ausprobieren, damit ich verstehe, wie die App funktioniert.
3. Als **Besucher** möchte ich Wetter, Arbeitszeiten, Personal und Texte in der Demo-Card eintragen können, ohne mich anmelden zu müssen.
4. Als **Besucher** möchte ich die Demo-Card als scrollbares, gebundenes Formular sehen, damit es wie ein echter BTB wirkt.
5. Als **Besucher** möchte ich durch mehrere Baustellenfotos klicken können, damit die Seite lebendig wirkt.
6. Als **Besucher** möchte ich direkt zu Login oder Registrierung navigieren können.
7. Als **Besucher** möchte ich Impressum und Datenschutz im Footer finden.

## Sections im Detail

### Navbar (sticky)
- Logo: „BTB" (fett) + „.online" (gelb, Primärfarbe)
- Rechts: Ghost-Button „Einloggen" → `/login`, Filled-Button „Kostenlos starten" → `/register`
- Hintergrund: Backdrop-Blur mit leichter Transparenz

### Hero – Vollbild mit Karussell
- Hintergrund: Vollbild-Foto einer Baustelle (wechselt automatisch oder per Klick)
- Bilder liegen in `/public/images/` (jpg/webp)
- Leichtes dunkles Overlay damit Text und Card lesbar bleiben
- Karussell-Navigation: 2 gefüllte Kreise mit gelbem Pfeil-Icon unten links (`◀ ▶`)
- Autoplay optional (z. B. alle 6 Sekunden), pausiert bei Hover

### Logo-Box (links im Hero)
- Hintergrund: leicht halbtransparenter dunkler Container (passend zum Dark Theme)
- Inhalt:
  - „btb.online" – sehr groß, fett, Syne-Schrift
  - Tagline darunter: „Deine Baustelle, dein Bautagesbericht."
- Keine Buttons in der Box (CTAs sind in der Navbar)

### BTB-Demo-Card (rechts im Hero)
- Rahmen/Schatten in Brandfarbe (#e8c547) damit sie sich vom Hintergrundbild abhebt
- Weißer Hintergrund (wie echtes DIN-A4-Dokument)
- Scrollbar innerhalb ihres Containers falls Inhalt zu lang
- **Rein frontend-seitig**: kein API-Call, kein Supabase, keine Authentifizierung
- Daten leben ausschließlich in React-State (useState), werden nirgends gespeichert

#### Vorausgefüllte Felder (gesperrt, nicht editierbar)
Diese Felder simulieren was aus Firmen- und Projekteinstellungen käme:
- Firmenname: „Musterbau GmbH"
- Adresse: „Musterstraße 12 · 10115 Berlin"
- Projektname: „A1 Gleisbau"
- Kostenstelle: „KST-2026-04"
- Auftraggeber: „DB Netz AG"
- Datum: aktuelles Datum (dynamisch via `new Date()`)
- Schicht: „Tagschicht" (fest)

#### Editierbare Felder (Demo-Interaktion)
Alle Felder sind sofort klickbar ohne Anmeldung:

**Wetter**
- Temperatur (°C): Zahlenfeld
- Witterung: Dropdown (Sonnig, Bedeckt, Regen, Schnee, Nebel)
- Bodenzustand: Dropdown (Trocken, Feucht, Nass, Gefroren)

**Arbeitszeit**
- Beginn (HH:MM): Zeitfeld
- Ende (HH:MM): Zeitfeld
- Pause (Min): Zahlenfeld mit Preset-Buttons (30, 60)
- Nettostunden: berechnet sich automatisch (Ende - Beginn - Pause)

**Örtlichkeit**
- Freitextfeld: „Strecke / Gleis / Bauteil …"
- km von – bis: zwei Zahlenfelder

**Personal** (Tabelle)
- Vordefinierte Rollen: Bauleiter, Polier, Vorarbeiter, Facharbeiter
- Je Rolle: Anzahl (Zahlenfeld) + Stunden (Zahlenfeld)
- Button „+ Individuell" → öffnet Freitext-Eingabe für eigene Rolle

**Maschinen & Gerät** (Tabelle)
- Vordefinierte Einträge: ZWB, Wanne + Wagen, Kettenbagger, Radlader
- Je Eintrag: Anzahl (Zahlenfeld) + Stunden (Zahlenfeld)
- Button „+ Individuell" → Freitext-Eingabe

**Ausgeführte Arbeiten**
- Textarea, Placeholder: „Beschreibung der durchgeführten Arbeiten…"

**Vorkommnisse / Behinderungen**
- Textarea, Placeholder: „Behinderungen, Zwischenfälle…"

#### Card-Footer
- Unterschriftenzeile: Auftragnehmer | Auftraggeber (statisch, kein Input)
- Firmenlogo-Platzhalter links (statisch)

### Footer
- Logo: „BTB" + „.online"
- Links: Impressum → `/impressum`, Datenschutz → `/datenschutz`
- Copyright: © 2026 BTB.online

## Acceptance Criteria

- [ ] Navbar ist sticky und erscheint über dem Hintergrundbild
- [ ] Hintergrundbild füllt den gesamten Viewport (Hero-Section)
- [ ] Dunkles Overlay auf dem Hintergrundbild macht Text und Card lesbar
- [ ] Karussell-Navigation (◀ ▶) ist sichtbar und wechselt das Bild
- [ ] Logo-Box mit „btb.online" und Tagline ist links im Hero sichtbar
- [ ] BTB-Demo-Card erscheint rechts mit gelbem Rahmen/Schatten
- [ ] Alle editierbaren Felder sind ohne Login befüllbar
- [ ] Nettostunden berechnen sich korrekt aus Beginn, Ende und Pause
- [ ] „+ Individuell"-Buttons funktionieren für Personal und Geräte
- [ ] Keine API-Calls beim Interagieren mit der Demo-Card (DevTools → Network leer)
- [ ] Card ist scrollbar wenn der Inhalt den Container übersteigt
- [ ] Responsive: Auf Mobile stapeln Logo-Box und BTB-Card vertikal
- [ ] Footer mit Impressum und Datenschutz vorhanden und verlinkend
- [ ] `npm run build` läuft ohne TypeScript- oder Lint-Fehler

## Edge Cases

- **Kein Bild vorhanden**: Fallback-Hintergrund in Brandfarbe (#0e1118 mit leichtem Verlauf)
- **Nur 1 Bild**: Karussell-Buttons werden ausgeblendet oder deaktiviert
- **Ungültige Zeitangabe** (Ende vor Beginn): Nettostunden zeigen „–" oder 0, kein Absturz
- **Mobile < 768px**: BTB-Card stapelt unter Logo-Box, beide nehmen volle Breite
- **Sehr kleine Viewports < 375px**: Schrift in der Card bleibt lesbar durch clamp()
- **Benutzer bereits eingeloggt**: kein automatischer Redirect (Out of Scope für MVP)

## Nicht in Scope

- Echte Impressum-/Datenschutz-Texte (separate PROJ-X Features wenn gewünscht)
- Auth-Redirect-Logik für eingeloggte Nutzer
- Speichern der Demo-Card-Daten (kein localStorage, kein Backend)
- Drucken der Demo-Card
- Animations / komplexe Scroll-Effekte
- Mehrsprachigkeit

## Bilder

Baustellenfotos werden in `/public/images/` abgelegt.
Empfohlenes Format: WebP oder JPG, mindestens 1920×1080px.
Dateinamen Beispiel: `hero-baustelle-1.jpg`, `hero-baustelle-2.jpg`, etc.

---

## QA Test Results

**Tested:** 2026-03-26
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### AC-1: Navbar ist sticky und erscheint ueber dem Hintergrundbild
- [x] Navbar uses `fixed top-0 left-0 z-50` positioning, appears above hero image
- [x] Backdrop-blur effect applied
- [x] "Einloggen" links to `/login`, "Kostenlos starten" links to `/register`
- Note: Navbar uses `fixed` rather than `sticky`, and only covers left portion (logo + nav links), not full width. This is intentional for the morphing logo animation effect.

**PASS**

#### AC-2: Hintergrundbild fuellt den gesamten Viewport (Hero-Section)
- [x] Hero section uses `min-h-screen` and images use `fill` + `object-cover`
- [x] 5 hero images loaded from `/public/images/`
- [x] Transition between images via opacity with 1000ms duration

**PASS**

#### AC-3: Dunkles Overlay auf dem Hintergrundbild macht Text und Card lesbar
- [x] `bg-black/60` overlay div present over hero images

**PASS**

#### AC-4: Karussell-Navigation ist sichtbar und wechselt das Bild
- [x] Previous/Next buttons with ChevronLeft/ChevronRight icons present
- [x] Dot indicators for each image with active state highlighting
- [x] Autoplay at 6000ms interval implemented
- [x] Autoplay pauses on hover (`onMouseEnter`/`onMouseLeave`)
- [x] Clicking dots navigates to specific image

**PASS**

#### AC-5: Logo-Box mit "btb.online" und Tagline ist links im Hero sichtbar
- [x] Logo box with semi-transparent dark background present
- [x] "btb.online" text in Syne font, large size with `clamp(2.2rem, 5vw, 4rem)`
- [x] Tagline "Deine Baustelle, dein Bautagesbericht." below logo
- [x] Morphing scroll animation moves logo to navbar on scroll

**PASS**

#### AC-6: BTB-Demo-Card erscheint rechts mit gelbem Rahmen/Schatten
- [x] Card present at `width: 430px` on desktop with golden border/shadow (`#e8c547`)
- [x] White background simulating DIN A4 document
- [x] Scaled from 210mm to 430px width using CSS transform

**PASS**

#### AC-7: Alle editierbaren Felder sind ohne Login befuellbar
- [x] Temperature number input editable
- [x] Witterung dropdown editable
- [x] Bodenzustand dropdown editable
- [x] Beginn/Ende time inputs with custom time picker
- [x] Pause with number input and preset buttons (0, 30, 60)
- [x] Oertlichkeit text input editable
- [x] km von/bis inputs editable
- [x] Personal table: beruf, Anzahl, Stunden all editable
- [x] Equipment table: Typ, Anzahl, Stunden all editable
- [x] "Ausgefuehrte Arbeiten" rich text area editable
- [x] "Vorkommnisse" rich text area editable
- [x] No login required (page is public for unauthenticated users via middleware)

**PASS**

#### AC-8: Nettostunden berechnen sich korrekt aus Beginn, Ende und Pause
- [x] `calculateNetHours` correctly computes: (Ende - Beginn - Pause) in hours
- [x] Default values: 07:00 to 18:00, 60 min pause = 10 h (correct)
- [ ] BUG: Edge case "Ende vor Beginn" does not show "--" or 0 as spec requires (see BUG-3)

**PARTIAL PASS** (core calculation correct, edge case deviates from spec)

#### AC-9: "+ Individuell"-Buttons funktionieren fuer Personal und Geraete
- [x] "+ Individuell" button present for Personal table, adds empty row
- [x] "+ Individuell" button present for Maschinen & Geraet table, adds empty row
- [x] Category chip buttons also present for quick-adding predefined roles/equipment
- [x] Delete (x) button on each row to remove entries

**PASS**

#### AC-10: Keine API-Calls beim Interagieren mit der Demo-Card
- [x] Code review confirms: no fetch, no Supabase calls, no API routes referenced
- [x] All state managed via `useState` hooks
- [x] Imports only validation constants and utility functions (no network code)

**PASS**

#### AC-11: Card ist scrollbar wenn der Inhalt den Container uebersteigt
- [ ] BUG: Card container has `overflow: hidden` on both the outer wrapper and inner content div, preventing scroll (see BUG-1)

**FAIL**

#### AC-12: Responsive -- Auf Mobile stapeln Logo-Box und BTB-Card vertikal
- [ ] BUG: BTB-Demo-Card is completely hidden on screens below `lg` (1024px) via `hidden lg:block`. The card does not stack vertically on mobile/tablet -- it disappears entirely (see BUG-2)

**FAIL**

#### AC-13: Footer mit Impressum und Datenschutz vorhanden und verlinkend
- [x] Footer present with "btb.online" logo
- [x] Impressum link to `/impressum`
- [x] Datenschutz link to `/datenschutz`
- [x] Copyright "2026 BTB.online"
- [ ] BUG: `/impressum` and `/datenschutz` pages are blocked by middleware for unauthenticated users (see BUG-4)

**PARTIAL PASS** (links present but targets inaccessible without login)

#### AC-14: `npm run build` laeuft ohne TypeScript- oder Lint-Fehler
- [x] Build completes successfully: "Compiled successfully in 1912.5ms"
- [x] All 16 pages generated without errors
- [x] No TypeScript or lint errors

**PASS**

### Edge Cases Status

#### EC-1: Kein Bild vorhanden -- Fallback-Hintergrund
- [ ] NOT IMPLEMENTED: No fallback handling. If HERO_IMAGES array were empty, the page would render with no background. However, since the array is hardcoded with 5 images, this is not a runtime issue. Low priority.

#### EC-2: Nur 1 Bild -- Karussell-Buttons werden ausgeblendet
- [x] Correctly handled: `{imageCount > 1 && (...)}` conditionally renders carousel navigation

**PASS**

#### EC-3: Ungueltige Zeitangabe (Ende vor Beginn) -- Nettostunden zeigen "--" oder 0
- [ ] BUG: When Ende < Beginn (e.g., Ende=06:00, Beginn=07:00), `calculateNetHours` treats it as an overnight shift (adds 24h), returning 22h instead of "--" or 0 as spec requires (see BUG-3)

**FAIL**

#### EC-4: Mobile < 768px -- BTB-Card stapelt unter Logo-Box
- [ ] BUG: Same as AC-12 -- card is hidden entirely below `lg` breakpoint, not stacked (see BUG-2)

**FAIL**

#### EC-5: Sehr kleine Viewports < 375px -- Schrift bleibt lesbar
- [x] Logo uses `clamp(2.2rem, 5vw, 4rem)` for responsive sizing
- [x] Card uses fixed `9pt` font size but is scaled via CSS transform, so remains proportional
- Note: Cannot fully verify without browser testing, but code approach is reasonable

**PASS** (code review)

#### EC-6: Benutzer bereits eingeloggt -- kein automatischer Redirect
- [ ] BUG: Middleware redirects logged-in users from `/` to `/projekte` (middleware.ts line 79-82). Spec says this is "Out of Scope" / not expected, but it was implemented anyway. This contradicts the spec but may be intentional. (see BUG-6)

**FAIL** (contradicts spec, though arguably a useful behavior)

### Security Audit Results

- [x] No authentication required for landing page (correctly public)
- [x] No API calls from demo card -- no data leakage risk
- [x] Rate limiting on auth routes present in middleware (20 requests / 15 min)
- [x] Security headers configured in next.config.ts (X-Frame-Options, CSP, HSTS, etc.)
- [ ] BUG: CSP `font-src 'self'` blocks Google Fonts loaded from `fonts.gstatic.com`. Also `style-src` does not include `fonts.googleapis.com`. Fonts (Syne, IBM Plex Sans, DM Mono) will be blocked by CSP in production (see BUG-5)
- [x] No secrets exposed in client-side code
- [x] Demo card uses `contentEditable` with `innerHTML` but data is never persisted or sent to server -- XSS risk is theoretical only (no backend storage)
- [x] Middleware correctly protects authenticated routes
- [ ] BUG: `/impressum` and `/datenschutz` are not excluded from middleware auth protection, blocking unauthenticated access to legally required pages (see BUG-4)
- [x] `document.execCommand('underline')` is deprecated but not a security risk

### Cross-Browser Notes
- Code uses standard CSS (`grid`, `flex`, `clamp`, `backdrop-filter`) with `-webkit-` prefixes for Safari
- `backdrop-filter` has WebKit prefix present
- `contentEditable` and `document.execCommand` are deprecated but still functional across browsers
- No browser-specific issues identified in code review

### Responsive Notes
- 375px: Logo-Box visible, Demo-Card hidden (BUG-2)
- 768px: Logo-Box visible, Demo-Card hidden (BUG-2)
- 1440px (desktop): Full layout with Logo-Box left, Demo-Card right -- works as designed

### Bugs Found

#### BUG-1: Demo-Card overflow hidden prevents scrolling
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Go to landing page on desktop (1440px+)
  2. Add many personal/equipment rows via "+ Individuell" buttons
  3. Content exceeds card height
  4. Expected: Card content scrolls within container
  5. Actual: Content is clipped/hidden, no scroll available
- **Root Cause:** Outer wrapper (line 333) has `overflow: 'hidden'` and inner card div (line 375) also has `overflow: 'hidden'`
- **Priority:** Fix before deployment

#### BUG-2: BTB-Demo-Card hidden on mobile/tablet instead of stacking vertically
- **Severity:** High
- **Steps to Reproduce:**
  1. Go to landing page
  2. Resize browser to < 1024px (or use mobile/tablet device)
  3. Expected: Demo-Card stacks below Logo-Box, both full width
  4. Actual: Demo-Card is completely invisible (`hidden lg:block` on line 328)
- **Root Cause:** `hidden lg:block` class hides the card container below `lg` (1024px) breakpoint
- **Priority:** Fix before deployment

#### BUG-3: "Ende vor Beginn" treated as overnight shift instead of showing 0
- **Severity:** Low
- **Steps to Reproduce:**
  1. Go to landing page, find demo card
  2. Set Beginn to 18:00 and Ende to 06:00
  3. Expected: Nettostunden shows "--" or 0 (per spec)
  4. Actual: Shows 11 h (overnight shift calculation: 12h - 60min pause)
- **Root Cause:** `calculateNetHours` in `kw-utils.ts` adds 24*60 minutes when result is negative (overnight shift logic)
- **Note:** This behavior might be intentionally correct for the real app (night shifts are common on construction sites). The spec edge case may need revisiting. Changing this would also affect PROJ-3/PROJ-4 shift functionality.
- **Priority:** Discuss with product -- may be intentional

#### BUG-4: /impressum and /datenschutz blocked by middleware for unauthenticated users
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Open browser in private/incognito mode (not logged in)
  2. Navigate to `/impressum` or `/datenschutz`
  3. Expected: Page loads with legal content
  4. Actual: Redirected to `/login`
- **Root Cause:** Middleware (line 92-94) redirects all non-auth routes for unauthenticated users. Only `/`, `/login`, `/register`, `/reset-password`, and `/auth/callback` are excluded. `/impressum` and `/datenschutz` are not in the exception list.
- **Legal Note:** Impressum and Datenschutz pages are legally required to be publicly accessible in Germany (TMG / DSGVO).
- **Priority:** Fix immediately -- legal compliance issue

#### BUG-5: CSP blocks Google Fonts in production
- **Severity:** High
- **Steps to Reproduce:**
  1. Deploy to production (or test with production build + security headers)
  2. Open browser DevTools console
  3. Expected: Syne, IBM Plex Sans, DM Mono fonts load correctly
  4. Actual: CSP blocks font loading from `fonts.gstatic.com` and stylesheet from `fonts.googleapis.com`
- **Root Cause:** `next.config.ts` CSP has `font-src 'self'` (missing `https://fonts.gstatic.com`) and `style-src 'self' 'unsafe-inline'` (missing `https://fonts.googleapis.com`)
- **Priority:** Fix before deployment

#### BUG-6: Logged-in users redirected from landing page (contradicts spec)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Log in to BTB.online
  2. Navigate to `/` (landing page)
  3. Expected per spec: Landing page loads (no redirect, "Out of Scope")
  4. Actual: Redirected to `/projekte`
- **Root Cause:** Middleware line 79-82 explicitly redirects authenticated users
- **Note:** This is arguably good UX and was likely a deliberate decision. The spec listed it as "Nicht in Scope" (out of scope) rather than "should not happen". Recommend updating the spec to reflect the actual behavior.
- **Priority:** Nice to have (update spec to match implementation)

#### BUG-7: Missing Firmenlogo-Platzhalter in Card-Footer
- **Severity:** Low
- **Steps to Reproduce:**
  1. Go to landing page, scroll to demo card footer area
  2. Expected per spec: "Firmenlogo-Platzhalter links (statisch)" in footer
  3. Actual: Only signature lines (Auftragnehmer / Auftraggeber) present, no logo placeholder
- **Priority:** Nice to have

#### BUG-8: Unused components (dead code)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Check `src/components/landing-feature-card.tsx` -- not imported anywhere
  2. Check `src/components/landing-kw-nav.tsx` -- not imported anywhere
- **Note:** These appear to be leftover from a previous design iteration
- **Priority:** Nice to have (cleanup)

### Summary
- **Acceptance Criteria:** 10/14 passed (4 failed or partial)
- **Edge Cases:** 3/6 passed (3 failed)
- **Bugs Found:** 8 total (1 critical, 2 high, 1 medium, 4 low)
- **Security:** Issues found (CSP font blocking, middleware blocking legal pages)
- **Production Ready:** NO
- **Recommendation:** Fix BUG-4 (critical -- legal compliance), BUG-5 (high -- fonts broken in production), and BUG-2 (high -- demo card invisible on mobile) before deployment. BUG-1 (medium) should also be addressed. Remaining low-severity bugs can be deferred.

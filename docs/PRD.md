# Product Requirements Document

## Vision
BTB (Bautagesbericht) ist eine Web-App für Bauunternehmen, mit der Bauleiter und Poliere ihre täglichen Baustellenberichte digital erfassen, verwalten und drucken können. Die App ersetzt papierbasierte und lokale HTML-Lösungen durch eine zugängliche, cloud-basierte Plattform.

## Target Users
**Bauleiter und Poliere** auf Baustellen (Gleisbau, Tiefbau, Hochbau):
- Erfassen täglich Arbeitszeiten, Wetter, eingesetztes Personal und Geräte
- Drucken fertige DIN-A4-Berichte für Auftraggeber und Archivierung
- Arbeiten oft mit schlechter Internetverbindung, brauchen daher eine schnelle, einfache Oberfläche
- Sind keine IT-Experten – die App muss ohne Einarbeitung bedienbar sein

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | PROJ-1: Authentifizierung | Planned |
| P0 (MVP) | PROJ-2: Projektverwaltung | Planned |
| P0 (MVP) | PROJ-3: Schichtverwaltung | Planned |
| P0 (MVP) | PROJ-4: KW-Grid & Kartenansicht | Planned |
| P0 (MVP) | PROJ-5: Drucken | Planned |
| P1 | PROJ-7: Arbeitsanmeldung (KW-basiert) | Planned |

## Success Metrics
- Nutzer können sich registrieren und innerhalb von 2 Minuten ihren ersten BTB anlegen
- Druckausgabe ist 1:1 mit dem bestehenden HTML-Prototyp kompatibel
- Daten sind nach Browser-Schließen erhalten (kein LocalStorage-Verlust)
- App läuft auf Desktop und Tablet (mobil nice-to-have)

## Constraints
- Solo-Entwicklung / kleines Team
- Tech Stack: Next.js 16, Supabase, Tailwind CSS, shadcn/ui, Vercel
- Design: Dunkles Theme (#0e1118 Hintergrund, #e8c547 Gelb als Akzent)
- Zeitraum: MVP so schnell wie möglich

## Non-Goals
- Mobile App (iOS/Android)
- Offline-Modus / PWA
- Projektfreigabe / Collaboration zwischen Nutzern (MVP)
- Admin-Dashboard zur Nutzerverwaltung (MVP)
- Import/Export von Excel oder anderen Formaten
- Zeiterfassungs- oder ERP-Integration

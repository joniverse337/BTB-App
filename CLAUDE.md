# BTB – Bautagesbericht

Web-App für Bauunternehmen. Bauleiter und Poliere erfassen tägliche Baustellenberichte, drucken DIN-A4-Berichte und verwalten Schichten/Projekte. Ersetzt papierbasierte Lösungen durch eine cloud-basierte Plattform.

**Design:** Dunkles Theme (`#0e1118` Hintergrund, `#e8c547` Gelb als Akzent)
**Zielgruppe:** Keine IT-Experten — einfach, schnell, ohne Einarbeitung bedienbar

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (NEVER recreate installed shadcn components)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel
- **Validation:** Zod + react-hook-form

## Project Structure

```
src/
  app/              Pages (Next.js App Router)
  components/ui/    shadcn/ui components
  hooks/            Custom React hooks
  lib/              supabase.ts, utils.ts
features/           Feature specs (PROJ-X-name.md) + INDEX.md
```

## Conventions

- **Commits:** `feat(PROJ-X): description` / `fix(PROJ-X): description`
- **Feature IDs:** PROJ-1, PROJ-2, ... (nächste freie ID in INDEX.md prüfen)
- Read files before modifying — never assume contents
- Verify imports, component names and API routes before using them

## Build Commands

```bash
npm run dev        # localhost:3000
npm run build      # Production build
npm run lint       # ESLint
```

## Feature Overview

@features/INDEX.md

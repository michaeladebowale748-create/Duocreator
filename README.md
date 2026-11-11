# Duocreator Studio

Responsive React + TypeScript scaffold for the Duocreator design resizing app, based on [`PRD.md`](./PRD.md). Contrast-matched full wordmark and icon variants switch with the app’s persistent light/dark theme; the icon is used for the favicon and workspace avatar.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` to connect the browser app to Supabase. `.env.local` is ignored by Git.

## Included flows

- Figma to Duocreator clipboard paste (`application/vnd.duocreator.figma+json`, schema v1) via keyboard paste or **Paste from Figma**.
- Figma editable-layer and flat-PNG imports, with embedded assets and source metadata.
- PDF, SVG, PNG, JPEG, and WebP upload. PDF pages are imported as flattened background artboards in this scaffold; add object extraction in a later import milestone.
- Four launch presets: Instagram post (1080 × 1350), Instagram story (1080 × 1920), blog thumbnail (1200 × 630), and newsletter thumbnail (1200 × 675), plus custom dimensions.
- Independent variants generated from the protected master, object selection/editing, layer visibility/locking, and layout overflow warnings.
- Email/password sign-in and sign-up, with Supabase autosave for the current project and local recovery cache.
- Undo/redo scaffolding, and export to PDF/JPEG/PNG/SVG/WebP/JSON, including batch export.
- Missing-font metadata and outlined SVG fallback; destination font availability is checked in the browser before text editing is enabled.
- Canva import is identified as pending API access, matching the PRD’s authorized-integration requirement.

## Current boundary

The app persists each authenticated user's current design document as JSONB in Supabase `public.design_projects`; row-level security scopes access to the owning user. Local storage remains as a recovery cache. The schema is in `supabase/migrations/`. AI layout planning is now a product requirement, but the current variant generator still uses geometric fitting; a server-side model provider and structured layout endpoint have not been connected. Source images are currently serialized with the project document; Supabase Storage, document history, job workers, telemetry, production upload scanning, and the approved Canva OAuth flow remain future integrations. The Figma importer maps common node types into the app’s Fabric-based canvas and retains the raw source payload; unsupported Figma semantics are not guaranteed to round-trip.

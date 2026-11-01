# Duocreator Studio

Responsive React + TypeScript scaffold for the Duocreator design resizing app, based on [`PRD.md`](./PRD.md). The full wordmark is used in the top bar; the icon variation is used for the app icon and workspace avatar. The app supports a persistent light/dark interface theme.

## Run locally

```bash
npm install
npm run dev
```

## Included flows

- Figma to Duocreator clipboard paste (`application/vnd.duocreator.figma+json`, schema v1) via keyboard paste or **Paste from Figma**.
- Figma editable-layer and flat-PNG imports, with embedded assets and source metadata.
- PDF, SVG, PNG, JPEG, and WebP upload. PDF pages are imported as flattened background artboards in this scaffold; add object extraction in a later import milestone.
- Searchable social, email, web, marketing, video, and print size presets, plus custom dimensions.
- Independent variants generated from the protected master, object selection/editing, layer visibility/locking, and layout overflow warnings.
- Browser-local autosave, undo/redo scaffolding, and export to PDF/JPEG/PNG/SVG/WebP/JSON, including batch export.
- Missing-font metadata and outlined SVG fallback; destination font availability is checked in the browser before text editing is enabled.
- Canva import is identified as pending API access, matching the PRD’s authorized-integration requirement.

## Current boundary

This is a functional frontend scaffold with local browser persistence. Projects and assets are stored in localStorage; authentication, PostgreSQL, object storage, job workers, telemetry, production upload scanning, and the approved Canva OAuth flow are not wired to services yet. The Figma importer maps common node types into the app’s Fabric-based canvas and retains the raw source payload; unsupported Figma semantics are not guaranteed to round-trip.

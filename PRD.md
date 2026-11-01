# Duocreator — Product Requirements Document

**Status:** Product draft  
**Version:** 1.1  
**Date:** 1 November 2026

## Product name and one-line description

**Duocreator** is a browser-based design resizing studio that turns one source design into multiple independently editable layouts for social, marketing, web, newsletter, video, and print formats.

## Problem statement

Graphic designers and freelancers repeatedly adapt the same campaign design to many publishing dimensions. Manual duplication and rebuilding takes time, and flattened exports prevent separate editing of text, images, and shapes in each output size.

Duocreator should speed up the first pass of resizing while preserving the source master and giving designers full control over final layout decisions. For Figma-origin designs, the existing **Figma to Duocreator** plugin provides a direct handoff that avoids a PDF round trip for supported content.

## Product vision and principles

- **Editable by default:** Keep supported text, images, shapes, lines, and groups as separate objects.
- **Independent variants:** Changes to one size never alter the master or sibling variants.
- **Designer in control:** Automated placement is a starting point, not a final decision.
- **Honest imports:** Identify flattened or unsupported content and retain a visual fallback.
- **Protected source:** Keep the imported master unchanged unless the user explicitly edits it.

## Target user profile

**Primary users:** Graphic design professionals and freelance designers, ages 16–50, creating recurring campaigns or deliverables for multiple channels.

**Needs:** Resize assets quickly; keep each output editable; control typography, crops, hierarchy, and safe areas; and deliver common raster and vector formats.

**Job to be done:** “When a campaign needs to appear in several formats, help me create polished, editable versions quickly while keeping my source design intact.”

## Existing Figma to Duocreator plugin

The existing plugin is the primary Figma-origin import path for v1. It supports Figma Design, FigJam, and Slides, copies one selected frame at a time, and provides two modes:

- **Editable:** Clipboard JSON using `application/vnd.duocreator.figma+json` and `schemaVersion: 1`. It contains the Figma `JSON_REST_V1` layer tree, source frame metadata, embedded image assets, an SVG preview, text/font metadata, and outlined SVG text fallbacks.
- **Flat image:** A PNG of the selected frame, packaged as base64 with frame dimensions and source metadata.

The plugin copies its package to the system clipboard. The v1 web app must accept it when pasted. The plugin does not upload to a Duocreator server or require a signed-in account for the handoff.

### Clipboard integration contract

- Receive paste from the browser’s `text/plain` clipboard payload and provide a visible **Paste from Figma** fallback action.
- Validate the format, schema version, required fields, payload size, node structure, and image records before importing.
- Convert supported Figma nodes into Duocreator’s own versioned document model. Preserve raw Figma JSON and source node IDs as import metadata.
- Resolve embedded image references from `assets`, verify MIME types, and sanitize SVG before rendering.
- Editable mode creates a protected master artboard. Flat mode creates a master containing one PNG image and must not imply the image contents are separately editable.
- Report editable, flattened, unsupported, missing-font, and asset-warning counts after import.
- Preserve text characters and font metadata. Check font availability in Duocreator; when unavailable, show the outlined SVG fallback and disable text editing until the user picks an available typeface. `sourceHasMissingFont` describes the source Figma environment; it does not determine destination availability.
- Reject malformed or over-limit clipboard payloads without crashing or silently truncating the design.

The plugin preserves source structure and supported details; it cannot guarantee that every Figma node, effect, font, or behavior has an identical editable equivalent in Duocreator. Unsupported content must be surfaced clearly.

## Core features for v1 (maximum 5)

### 1. Import and create a master design

Accept clipboard paste from the existing plugin as the preferred editable Figma import route, with support for editable and flat modes. Also accept PDF, SVG, PNG, and JPEG uploads. Add a Canva import connection through authorized APIs if endpoints, scopes, and account access permit it. For non-Figma imports, extract supported objects when reliable and preserve unsupported content as an identified visual background with editable overlays.

**User stories**

- As a Figma, FigJam, or Slides user, I want to copy a selected frame in the plugin and paste it into Duocreator so I can begin without exporting a PDF.
- As a designer, I want to choose editable or flat import so I can prioritize editability or speed.
- As a designer, I want supported layers and embedded images preserved so I can reuse source objects in resized versions.
- As a designer, I want missing-font text to retain its appearance and metadata while remaining read-only until I choose an available typeface.
- As a designer, I want to know what imported as editable, flattened, or unsupported.
- As a designer, I want to upload PDFs and standard image/vector files when my source is outside Figma.
- As a Canva user, I want an authorized import flow when Canva’s APIs and account permissions support it.
- As a designer, I want the imported master protected from variant edits.

### 2. Standard size catalog and custom artboards

Provide searchable presets for major social platforms, marketing placements, newsletters, blog covers, YouTube thumbnails, photo footers, and common print dimensions. Presets include width, height, unit, orientation, and optional safe-area guidance. Support custom dimensions.

**User stories**

- As a designer, I want to search presets by platform or content type.
- As a designer, I want custom dimensions for client-specific requirements.
- As a designer, I want dimensions and safe areas visible while laying out a design.

### 3. Generate independent editable variants

Create one or more copies from the master with scaling, alignment, safe-area rules, and element-aware placement suggestions. Variants have independent document states. Support selecting, moving, resizing, cropping, reordering, grouping, locking, hiding, and deleting supported objects. Flag overflow and likely collisions.

**User stories**

- As a designer, I want to generate multiple sizes from the master in one action.
- As a designer, I want to edit one variant without changing the source or other sizes.
- As a designer, I want to refine supported text, images, lines, shapes, and groups independently.
- As a designer, I want warnings for clipping and collisions before export.
- As a designer, I want to compare a variant with its master.

### 4. Canvas editor and project management

Provide a browser editor with artboard navigation, selection and transform controls, inline text editing, layer list, zoom/pan, undo/redo, autosave, and variant management. Group the master and variants in projects.

**User stories**

- As a designer, I want to edit objects directly on the artboard.
- As a designer, I want a layer list and undo/redo for complex layouts.
- As a designer, I want autosave and recoverable versions.
- As a designer, I want all campaign artboards grouped in one project.
- As a designer with a missing font, I want to replace it before editing the text.

### 5. Export and handoff

Export an artboard or batch as PDF, JPEG, PNG, SVG, WebP, or Duocreator JSON. Provide quality/scale and transparency settings where applicable, and show dimensions and format before download. Duocreator JSON is the editable project format, not a universal interchange standard.

**User stories**

- As a designer, I want to export a single size or a batch of variants.
- As a designer, I want raster and vector formats for different client workflows.
- As a designer, I want to reopen an editable Duocreator project later.
- As a designer, I want dimensions, transparency, and format confirmed before delivery.

## Explicitly out of scope for v1

- Pixel-perfect editable conversion of every Figma, PDF, Canva, or third-party feature.
- Editing the original Figma file or syncing changes back to Figma; plugin import is one-way in v1.
- Parsing proprietary `.canva` files directly or bypassing Canva permissions.
- Multiplayer editing, comments, approval workflows, client portals, brand kits, enterprise SSO, or asset marketplaces.
- AI-generated copy/images or fully autonomous design decisions.
- Video or animation authoring. Slides support imports selected slide frames as static design content.
- Native desktop/mobile apps; the web editor is desktop-focused.
- Guaranteed support for every font, effect, blend mode, mask, variable, component behavior, color profile, or complex PDF feature.
- Direct publishing or scheduling to social platforms.

## Recommended tech stack

### Figma plugin

- Keep the existing plugin as a TypeScript Plugin API main thread with a standalone HTML/CSS/JavaScript UI.
- Use Figma `JSON_REST_V1` export for the layer tree, `SVG_STRING` for visual fallbacks/previews, and PNG export for flat mode.
- Maintain the versioned clipboard envelope as an import protocol, separate from Duocreator’s persistent document schema.
- Keep the v1 handoff local through the clipboard; no plugin network permission or backend endpoint is required.

### Web client

- **TypeScript + React** for the editor interface and typed document model.
- **Vite** for the initial single-page editor; keep the editor separate from any SEO-focused marketing site.
- **Fabric.js** for the interactive 2D canvas: object selection/transforms, editable text, grouping, serialization, and SVG/image output. Duocreator’s own schema remains the persistent source of truth.
- A clipboard import adapter validates the plugin envelope, maps Figma nodes, unpacks assets, and preserves source metadata.
- **PDF.js** for PDF rendering, page inspection, and supported text extraction; it is not a complete PDF-to-native-design converter.
- **Web Workers** for PDF parsing, thumbnailing, SVG sanitation, and heavy imports.

### Backend and storage

- **Node.js + TypeScript API** (Fastify or NestJS) for authentication, projects, document versions, Canva OAuth/API integration, export jobs, and signed URLs.
- **PostgreSQL** for users, projects, artboard metadata, versions, and job status; store versioned design data as JSONB with indexed metadata.
- **S3-compatible storage** for source files, assets, previews, and exports.
- **Redis + a job queue** for large imports, thumbnails, and batch exports. Keep routine editing client-side and save incrementally.

### Export, deployment, and monitoring

- Use Fabric/browser rendering for PNG, JPEG, WebP, SVG, and Duocreator JSON; route large or batch jobs to background workers.
- Select a PDF renderer such as PDFKit or a vetted SVG-to-PDF pipeline after fidelity checks for text, transparency, and vectors.
- Use **Vercel** for client/API hosting if job limits fit; use a worker service for long conversions. Use **Sentry** for errors/traces and **PostHog** for privacy-conscious analytics.
- Validate uploads and clipboard data, sanitize SVG, scan uploads, encrypt traffic and storage, enforce limits, and provide deletion controls.

### Canva integration

Use Canva Connect APIs only for an authorized workflow with available endpoints, scopes, account eligibility, and access approval. Validate the exact flow early and isolate it behind a provider adapter. If unavailable, launch with the Figma plugin and standard file import.

### Stack rationale and trade-offs

The Figma plugin provides a structured source tree and embedded assets, improving Figma-origin import fidelity over PDF extraction. Duocreator still needs a mapping layer because Figma and its canvas editor do not have identical object semantics. Unsupported items need visual fallback or flattening. Fabric.js is a practical v1 object canvas; PDF.js is for non-Figma imports; Canva remains permissioned and API-dependent.

## Document model and variant behavior

- A project contains one imported master and zero or more variants.
- Editable plugin paste creates a master from supported Figma objects; flat paste creates a master containing one PNG.
- Each variant is a deep copy with independent object IDs, edit state, and history.
- Store stable IDs, types, geometry, transforms, styles, z-order, and source metadata in Duocreator’s own schema. Retain the raw plugin payload and source node IDs for traceability.
- Record the source master version for every variant. Master edits never silently overwrite variants.
- Preserve text characters/font metadata even when displaying outlined SVG fallback. Enable text editing only after an available typeface is selected.
- Represent unsupported imported content as an identified locked visual fallback with editable overlays.

## Non-functional requirements

- **Performance:** Open a typical 10-object project in under 3 seconds on a current desktop browser; keep common editing interactions at 30 FPS or better. Set payload, file, page, image, and object limits during beta.
- **Reliability:** Show import progress/results, autosave edits, and recover the last saved version after reload or recoverable failure.
- **Accessibility:** Keyboard-accessible controls, visible focus, labels, and sufficient contrast.
- **Security:** Validate file and clipboard payloads, sanitize SVG, isolate conversion jobs, encrypt traffic and stored data, and use least-privilege tokens.
- **Compatibility:** Support current stable desktop Chrome, Safari, Firefox, and Edge for the web app; the plugin targets Figma Design, FigJam, and Slides.
- **Privacy:** Keep designs private and do not use customer assets to train models.

## Success measures

Establish baselines during private beta. Initial targets:

- 70% of users who start a project create two or more variants.
- Median time from plugin copy to first editable master is under 2 minutes for supported frames.
- At least 90% of valid plugin clipboard imports complete without blocking failure within published limits.
- At least 90% of in-limit export jobs succeed.
- Fewer than 5% of supported file imports require a restart due to blocking failure.
- At least 60% of beta users report faster resizing than their current workflow.
- Track object preservation, missing-font fallback, and flat-mode selection separately.

## Definition of done

1. The existing plugin copies one selected frame in editable or flat mode from Figma Design, FigJam, and Slides.
2. The app accepts a valid `application/vnd.duocreator.figma+json` clipboard payload and provides a visible paste fallback action.
3. The app validates schema version and size limits, maps supported Figma objects, embeds referenced images, and creates a protected master.
4. Import results show editable, flattened, unsupported, missing-font, and asset-warning counts.
5. Missing-font text preserves source characters and metadata, displays the outlined SVG fallback, and remains non-editable until a replacement typeface is chosen.
6. Flat mode creates a PNG-based master without claiming its contents are editable.
7. PDF and standard image/vector imports work with clear fallbacks for unsupported content.
8. The size catalog includes launch-approved presets across stated categories and supports custom dimensions.
9. Variants are independently editable without changing the master or siblings.
10. The editor supports selection, movement, resize, crop, supported text editing, layer order, grouping, undo/redo, and autosave.
11. Users can export individual or batch artboards as PDF, JPEG, PNG, SVG, WebP, and Duocreator JSON.
12. Canva is available through an authorized approved flow or clearly marked unavailable for v1.
13. Import limits, unsupported-content behavior, browser support, privacy, and deletion behavior are documented.
14. No critical security, data-loss, or export-corruption issue remains; monitoring covers import/export failures and latency.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Figma features do not map exactly to Duocreator | Map supported types, retain raw source data, use visual fallbacks, and show import diagnostics. |
| Clipboard payloads are large | Define limits, show progress/errors, optimize redundant preview data, and consider authenticated upload later. |
| Missing fonts change appearance/editing | Preserve font metadata and outlined fallback; check availability in Duocreator and require a replacement before editing. |
| Clipboard or SVG data is malformed/unsafe | Validate schemas and sizes, sanitize SVG, and reject invalid payloads safely. |
| PDF content is flattened or complex | Use best-effort extraction, retain visual fallbacks, identify flattened elements, and publish limits. |
| Resizing harms hierarchy or crops | Keep suggestions editable, flag collisions/overflow, and leave final decisions to designers. |
| Canva API access is unavailable | Validate early, isolate the integration, and prioritize plugin plus standard imports. |
| Large exports exceed browser limits | Enforce published limits and route batch/high-resolution jobs through workers. |

## Open product decisions

- Which preset sizes are needed at launch, and who maintains the catalog?
- What clipboard payload and image size limits fit the beta?
- Should larger Figma designs use authenticated direct upload in a later release?
- Which Figma node types/effects must remain editable in v1, and which can use visual fallbacks?
- Should Canva integration launch only if API access is approved?
- What file, page, object, and export-resolution limits fit the beta infrastructure?
- Which licensing model and free-tier limits should be tested with freelancers?

## References

- [Figma Plugin API: `exportAsync`](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/) — JSON, SVG, PDF, and image export.
- [Figma: Working with Text](https://developers.figma.com/docs/plugins/working-with-text/) — font loading and missing-font handling.
- [Figma: Creating a User Interface](https://developers.figma.com/docs/plugins/creating-ui/) — plugin UI and messaging.
- [Fabric.js core concepts](https://www.fabricjs.com/docs/core-concepts/) — object model, serialization, SVG considerations.
- [Mozilla PDF.js getting started](https://mozilla.github.io/pdf.js/getting_started/) — PDF rendering and document API.
- [Canva Connect API reference](https://www.canva.dev/docs/apps/rest-apis/reference/) — authorized API domains and capabilities.

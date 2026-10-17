# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**VirtuXperience Hub** — a WebXR/3D immersive ecosystem for UNIMINUTO Virtual. A landing page (styled as a close replica of the real `uniminuto.edu/virtuxperience-home`) presents 6 "líneas transversales" (competency lines) as a grid of cards that double as an island map. Each card is locked until the previous one's "first round" badge is earned. Clicking an unlocked card builds a standalone first-person 3D island (Babylon.js) with a portal, a guide character, and that line's educational minigame. No backend, no env vars: 100% static client, deployed on Vercel (auto-deploys on push to `master`, see `vercel.json`).

Full product/feature documentation lives in [README.md](README.md) (tech stack, controls, scope decisions) and [PRODUCT.md](PRODUCT.md) (user/positioning/brand-commitment facts captured for the `impeccable` design skill — read before any landing-page visual work). Pedagogical context: [docs/CONTEXTO-PEDAGOGICO.md](docs/CONTEXTO-PEDAGOGICO.md).

## Commands

```bash
npm install      # install deps
npm run dev      # Vite dev server over self-signed HTTPS (required for WebXR/getUserMedia);
                 # https://localhost:5173/ and https://<LAN-ip>:5173/ (host: true in vite.config.ts)
npm run build    # tsc-checked production build to dist/
npm run preview  # serve the dist/ build locally
npx tsc --noEmit # type-check only (strict mode); this is the project's check/lint step —
                 # there is no separate lint or test script/framework in package.json
```

There is no committed automated test suite. Playwright is used informally during development (launched ad hoc from a scratchpad, not a project dependency) to screenshot the running app and check for console errors — not a repeatable `npm test`.

## Architecture

### Landing ↔ island lifecycle (the part that spans the most files)

`src/main.ts` boots directly into `LandingPage` (`src/landing/LandingPage.ts`). A **single Babylon `Engine` is created once** (`src/core/Game.ts`) and kept for the whole session; entering or leaving an island calls `Game.resetScene()`, which disposes the current `Scene` and creates a fresh empty one — it does **not** create a new `Engine`. An earlier version recreated the `Engine` per island and failed intermittently (the browser releases the old WebGL context asynchronously and races the new one); don't reintroduce that pattern. `scene/Island.ts` builds one self-contained 3D world (grass/sand/animated-ocean terrain, portal, character) from a single `ZoneDefinition`; it has no knowledge of the other 5 islands or the landing page. The HUD, badge panel, and audio-unlock wiring in `main.ts` are created once and reused across island visits via an indirection (`onBadgeToggle` closure) rather than re-registered each time, since DOM listeners added on the persistent `HUD`/`uiRoot` must not stack.

### `zones.config.ts` is the single source of truth for the 6 lines

`src/scene/zones.config.ts` exports `ZONES: ZoneDefinition[]`, in the fixed unlock order. Each entry's `color`, `name`, `description`, and `icon` drive **both** the landing page cards (`LandingPage.ts`) **and** the in-world portal/character/monument tint (`ZonePortal.ts`, `Character.ts`) — keep them in sync rather than hardcoding colors elsewhere. `firstRoundBadgeId` is what `LandingPage.isIslandUnlocked(index)` checks against the *previous* zone to decide if a card is locked. Adding a 7th line means: an entry here, a minigame folder, and a `register*.ts` import in `main.ts` (see below) — nothing else needs to change.

### Minigame registration pattern

Each minigame is a `src/minigames/<name>/` folder with exactly two files:
- `register<Name>.ts` — a side-effect module that does `zoneHandlers["<zone-id>"] = start<Name>Game;` (the `zoneHandlers` record lives in `zones.config.ts`).
- `<Name>Game.ts` — the actual game logic (questions, scoring, timer), talking to its own `ui/<Name>HUD.ts`.

`main.ts` imports every `register*.ts` purely for the side effect, at module top. `ZoneManager.enterZone()` looks up `zoneHandlers[zone.id]` and calls it with a `ZoneEnterContext` (`src/types/zone.ts`): `{ scene, camera, canvas, uiRoot, freezeMovement, onExit }`. Minigames are **DOM/HTML overlays appended to `#ui-root`**, not Babylon GUI — they call `freezeMovement(true)` on entry and must call `onExit()` when the player should regain control of the island.

### Zero external assets, by design

No image, 3D model, or audio files ship in the bundle (except `public/landing-preview.jpg`, a real in-game screenshot used on the landing page, and `public/favicon.svg`). Terrain/water/sand textures and their normal maps are generated with Canvas 2D (`scene/ProceduralTextures.ts`); the sky is a custom GLSL shader (`scene/Sky.ts`); all sound (ambience, footsteps, UI feedback) is synthesized with the Web Audio API (`systems/AudioSystem.ts`). Keep new visual/audio features procedural unless there's a strong reason not to — this is a deliberate, stated project constraint, not an oversight.

### AR mode

WebXR `immersive-ar` (`src/xr/setupXR.ts`) scales the active island down by `AR_SCALE = 1/25` to fit on a real tabletop. `Environment.setOutdoorEnabled(false)` is the single switch flipped on entering AR that turns off everything that only makes sense at full scale outdoors (extra scenery, fireflies, etc.); flip it back to `true` on exit. When adding new ambient/decorative systems, wire them into this same switch rather than inventing a parallel one.

### Badges / progression

`systems/BadgeSystem.ts` persists unlocked badge IDs to `localStorage["virtuxperience:badges"]`. `BADGE_CATALOG` entries have a `zone` field that must **string-match `ZoneDefinition.name` exactly** (both `LandingPage.ts` and `BadgePanel.ts` filter badges this way) — if you rename a zone, rename its badges' `zone` field too.

## Tool-generated, gitignored directories

`.agents/`, `.impeccable/`, and `skills-lock.json` are a design skill's downloaded dependency cache and local inspection screenshots, not project content — they're gitignored. Don't commit them even if they reappear locally.

# Voyager

Plan a voyage, launch it, leave, and come back later to see what happened. A
persistent, water-routed sailing-expedition simulator. Built with Next.js +
TypeScript + MapLibre GL. **No backend required** — voyages persist client-side
and progress is derived from elapsed time, so a ship keeps sailing while you're
away.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Vercel: **New Project → Import** the repo.
3. Framework preset auto-detects **Next.js**. No environment variables needed.
4. Deploy. That's it — static + client, no database, no keys.

## Architecture

```
src/
  app/
    layout.tsx        root layout + fonts
    page.tsx          renders the app
    globals.css       ported theme/styles (day + night)
  components/
    VoyagerApp.tsx    client component: markup + mounts the runtime
  lib/
    app-controller.ts imperative MapLibre + UI runtime (the verified engine)
    storage.ts        >>> the persistence seam <<<
```

### The persistence seam

All voyage persistence goes through `VoyageStore` in `src/lib/storage.ts`.
Today it's `localStore` (browser localStorage). To move persistence
server-side later (Supabase, Neon Postgres, etc.), implement the same
interface, make it async, and swap the `activeStore` export — **no changes to
the simulation or UI code.**

Because ship position is computed as `f(now − start_timestamp)`, the model is
already "server-timestamp ready": moving `start`/`departDate` to a database row
is all that's needed for cross-device and shareable voyages.

### Why the runtime is imperative

`app-controller.ts` is the proven single-file engine ported intact (MapLibre is
inherently imperative). It's marked `@ts-nocheck` as glue. The reusable, pure
pieces (geometry, A\* water routing, deterministic events, the time model) can
be lifted into typed `lib/*` modules and the panels refactored into React
components incrementally — the app runs and deploys as-is in the meantime.

## Notes

- Map tiles/labels: CARTO basemap glyphs (no API key).
- Coastline for land-avoidance routing: Natural Earth GeoJSON fetched at
  runtime; routes fall back to great-circle until it loads.

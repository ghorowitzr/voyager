# Voyager ⚓

Plan a voyage, launch it, leave — and come back later to see what happened. A
persistent, water-routed sailing-expedition simulator. Ships keep sailing while
you're away because their position and story are derived from elapsed time, not
from an animation loop.

Built with **Next.js + TypeScript + MapLibre GL**. No backend required.

## Features

- **A living world map.** Continents, oceans, historical ports, and a fleet of
  ships that move in real (accelerated) time.
- **Plan a route** through a clean START → DESTINATION → waypoints planner, with
  a continent → port picker and live map preview.
- **Pick a ship and a captain.** Eight historical captains (Magellan, Cook,
  Drake, Zheng He…) whose attributes subtly bias the simulation.
- **Water-only routing.** An A\* pathfinder over a 1° land/sea grid steers ships
  around continents and through carved narrow straits — never across land.
- **Persistent time.** Position, condition, supplies, events, and a full diary
  are recomputed deterministically from timestamps, so a voyage that ran while
  you were offline is waiting for you when you return.
- **A living economy of danger.** Storms, calms, scurvy, mutinies, dwindling
  supplies, a small gold budget for resupply, and **ten roaming pirate ships**
  (Blackbeard's *Queen Anne's Revenge*, the *Flying Dutchman*…) that pursue,
  attack, and can sink you — leaving a **wreck** on the map as a memorial.
- **Captain's Log.** Return after time away and each voyage greets you with a
  log of what happened, and a plea for help if it's in trouble.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

```bash
npm run build      # production build (type-checks the whole project)
npm run typecheck  # tsc --noEmit
npm test           # run the unit-test suite (Vitest)
npm run test:watch # watch mode
```

## Architecture

The **simulation core** lives in `src/lib/` as pure, typed, unit-tested
modules — no DOM, no globals, fully deterministic:

```
src/lib/
  types.ts      shared domain types
  geo.ts        great-circle distance, interpolation, bearing, antimeridian unwrap
  rng.ts        seeded PRNG (the deterministic "story" seed)
  ports.ts      ports + regions
  ships.ts      playable vessels
  captains.ts   historical captains + simulation modifiers
  pirates.ts    the pirate fleet + persistent roaming positions
  events.ts     random event templates
  routing.ts    land/sea grid + binary-heap A* water routing
  sim.ts        the deterministic voyage engine (simulate / stateAt)
  __tests__/    Vitest suites for all of the above
```

Everything the world does — where a ship is, what happened to it, whether it
survived — is a pure function of `(voyage, elapsedTime)`. That's what makes the
world persistent and testable.

The `src/lib/app-controller.ts` runtime and `src/components/VoyagesApp.tsx` are
the imperative MapLibre + UI glue; they are being migrated to consume the tested
core module-by-module. Persistence goes through the `VoyageStore` seam in
`src/lib/storage.ts` (localStorage today; swap in Supabase/Neon for shareable,
cross-device voyages without touching the simulation).

## Tests & CI

The core's invariants are locked down by [Vitest](https://vitest.dev):

- routes never cross land, and detour around a synthetic continent;
- the same voyage always produces the same events, diary, and outcome;
- captain attributes bias supplies/ETA as intended;
- supplies deplete, the gold economy restocks them, and a worn-through hull sinks
  the ship and freezes it in place;
- the pirate fleet roams deterministically.

GitHub Actions (`.github/workflows/ci.yml`) runs type-check + tests + build on
every push and pull request.

## Deploy

Push to a Git repo and import into Vercel — it auto-detects Next.js. No
environment variables, no database, no keys.

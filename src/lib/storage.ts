/* ------------------------------------------------------------------
   Persistence seam.

   The whole app talks to voyage storage ONLY through the VoyageStore
   interface below. Today it's backed by localStorage (client-only,
   zero backend). To move persistence server-side later — Supabase,
   Neon Postgres, anything — implement this same interface and swap
   the `activeStore` export. No app/simulation code changes.

   When you go remote, promote the interface to async
   (Promise-returning) and await it in the controller's load()/save().
   ------------------------------------------------------------------ */

export interface AppState {
  activeId: string | null;
  voyages: any[]; // serialized voyage records (see makeVoyage in the controller)
}

export interface VoyageStore {
  getState(): AppState | null;
  setState(state: AppState): void;
}

const KEY = 'voyages_state_v2';

/** Default implementation: browser localStorage. */
export const localStore: VoyageStore = {
  getState() {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
      return raw ? (JSON.parse(raw) as AppState) : null;
    } catch {
      return null;
    }
  },
  setState(state: AppState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode — ignore */
    }
  },
};

/* Swap this line to point at a remote store later. */
export const activeStore: VoyageStore = localStore;

export interface AppState { activeId: string | null; voyages: any[]; }
export interface VoyageStore {
  getState(): AppState | null;
  setState(state: AppState): void;
}
const KEY = 'voyages_state_v2';
export const localStore: VoyageStore = {
  getState() {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
      return raw ? (JSON.parse(raw) as AppState) : null;
    } catch { return null; }
  },
  setState(state: AppState) {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  },
};
export const activeStore: VoyageStore = localStore;

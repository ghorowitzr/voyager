/**
 * Water-only routing. A 1° land/sea grid (built from coastline polygons) plus a
 * binary-heap A* that steers ships around continents and threads carved narrow
 * straits. Everything here is deterministic and testable — inject a land grid
 * with `setLandGrid` and route away.
 */
import type { LatLon } from "./types";
import { hav, slerp } from "./geo";

export const RES = 1;
export const COLS = 360 / RES;
export const ROWS = 180 / RES;

let LAND: Uint8Array | null = null;

export const setLandGrid = (grid: Uint8Array | null): void => {
  LAND = grid;
};
export const getLandGrid = (): Uint8Array | null => LAND;
export const isLandReady = (): boolean => LAND !== null;

export const lonC = (c: number): number => -180 + c * RES + RES / 2;
export const latR = (r: number): number => 90 - r * RES - RES / 2;
export const colOf = (lon: number): number => {
  const c = Math.floor((((lon + 180) % 360) + 360) % 360 / RES);
  return ((c % COLS) + COLS) % COLS;
};
export const rowOf = (lat: number): number =>
  Math.max(0, Math.min(ROWS - 1, Math.floor((90 - lat) / RES)));

export const isLandCell = (c: number, r: number): boolean =>
  !!LAND && LAND[r * COLS + c] === 1;
export const isLandLL = (lon: number, lat: number): boolean =>
  !!(LAND && isLandCell(colOf(lon), rowOf(lat)));

type Ring = [number, number][];
type Poly = Ring[];
interface Feature {
  geometry?: { type: string; coordinates: unknown };
}

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Rasterize GeoJSON land polygons into a COLS×ROWS occupancy grid. */
export function buildLandGrid(features: Feature[]): Uint8Array {
  const g = new Uint8Array(COLS * ROWS);
  const polys: { bbox: [number, number, number, number]; rings: Poly }[] = [];
  for (const f of features) {
    const geom = f.geometry;
    if (!geom) continue;
    const list: Poly[] =
      geom.type === "Polygon"
        ? [geom.coordinates as Poly]
        : geom.type === "MultiPolygon"
        ? (geom.coordinates as Poly[])
        : [];
    for (const poly of list) {
      const outer = poly[0];
      let minx = 180, miny = 90, maxx = -180, maxy = -90;
      for (const p of outer) {
        if (p[0] < minx) minx = p[0];
        if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1];
        if (p[1] > maxy) maxy = p[1];
      }
      polys.push({ bbox: [minx, miny, maxx, maxy], rings: poly });
    }
  }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const lon = lonC(c), lat = latR(r);
      for (const P of polys) {
        const b = P.bbox;
        if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
        if (pointInRing(lon, lat, P.rings[0])) {
          let inHole = false;
          for (let h = 1; h < P.rings.length; h++)
            if (pointInRing(lon, lat, P.rings[h])) { inHole = true; break; }
          if (!inHole) { g[r * COLS + c] = 1; break; }
        }
      }
    }
  return g;
}

function setWaterBox(g: Uint8Array, lon0: number, lat0: number, lon1: number, lat1: number): void {
  for (let lon = lon0; lon <= lon1; lon += 1)
    for (let lat = lat0; lat <= lat1; lat += 1) g[rowOf(lat) * COLS + colOf(lon)] = 0;
}

/** Force known narrow straits open (the grid would otherwise close them). */
export function carveStraits(g: Uint8Array): void {
  if (!g) return;
  setWaterBox(g, -7, 35, -4, 37); // Strait of Gibraltar (Mediterranean ↔ Atlantic)
  setWaterBox(g, 25, 39, 30, 42); // Aegean / Dardanelles approach
  setWaterBox(g, 102, -1, 105, 3); // Strait of Malacca / Singapore
  setWaterBox(g, 104, -7, 107, -5); // Sunda Strait (Java ↔ Sumatra)
  setWaterBox(g, -71, -55, -66, -52); // Strait of Magellan approaches
}

export function nearestWater(lon: number, lat: number): { c: number; r: number } {
  if (!isLandLL(lon, lat)) return { c: colOf(lon), r: rowOf(lat) };
  const c0 = colOf(lon), r0 = rowOf(lat);
  for (let rad = 1; rad < 40; rad++)
    for (let dr = -rad; dr <= rad; dr++)
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const c = ((c0 + dc) % COLS + COLS) % COLS, r = r0 + dr;
        if (r < 0 || r >= ROWS) continue;
        if (!isLandCell(c, r)) return { c, r };
      }
  return { c: c0, r: r0 };
}

/** Is the great-circle segment a→b entirely over water (ignoring harbor hops)? */
export function segWater(a: LatLon, b: LatLon): boolean {
  const d = hav(a, b), n = Math.max(1, Math.ceil(d / 28));
  for (let i = 1; i < n; i++) {
    const f = i / n;
    if (f * d < 40 || (1 - f) * d < 40) continue;
    const p = slerp(a, b, f);
    if (isLandLL(p.lon, p.lat)) return false;
  }
  return true;
}

/** A* over water cells with a binary min-heap and no diagonal corner-cutting. */
export function astar(start: LatLon, goal: LatLon): LatLon[] | null {
  const s = nearestWater(start.lon, start.lat), g = nearestWater(goal.lon, goal.lat);
  const sIdx = s.r * COLS + s.c, gIdx = g.r * COLS + g.c;
  if (sIdx === gIdx) return [start, goal];
  const came = new Map<number, number>(), gS = new Map<number, number>(), done = new Set<number>();
  gS.set(sIdx, 0);
  const gc = { lon: lonC(g.c), lat: latR(g.r) };
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        let l = 2 * c + 1, r = l + 1, m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        const t = heap[m]; heap[m] = heap[c]; heap[c] = t; c = m;
      }
    }
    return top;
  };
  push(hav({ lon: lonC(s.c), lat: latR(s.r) }, gc), sIdx);
  let guard = 0;
  while (heap.length) {
    if (guard++ > 2000000) break;
    const cur = pop()[1];
    if (done.has(cur)) continue;
    done.add(cur);
    if (cur === gIdx) break;
    const cf = gS.get(cur)!, cr = Math.floor(cur / COLS), cc = cur % COLS;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = cr + dr;
        if (nr < 0 || nr >= ROWS) continue;
        const nc = ((cc + dc) % COLS + COLS) % COLS;
        if (isLandCell(nc, nr)) continue;
        if (dr && dc && (isLandCell(nc, cr) || isLandCell(cc, nr))) continue; // no corner-cutting
        const nIdx = nr * COLS + nc;
        const t = cf + hav({ lon: lonC(cc), lat: latR(cr) }, { lon: lonC(nc), lat: latR(nr) });
        if (t < (gS.get(nIdx) ?? Infinity)) {
          came.set(nIdx, cur);
          gS.set(nIdx, t);
          push(t + hav({ lon: lonC(nc), lat: latR(nr) }, gc), nIdx);
        }
      }
  }
  if (!came.has(gIdx)) return null;
  const path: number[] = [];
  let cur: number | undefined = gIdx;
  while (cur !== undefined) {
    path.unshift(cur);
    if (cur === sIdx) break;
    cur = came.get(cur);
  }
  const pts: LatLon[] = path.map((i) => ({ lon: lonC(i % COLS), lat: latR(Math.floor(i / COLS)) }));
  pts.unshift({ lon: start.lon, lat: start.lat });
  pts.push({ lon: goal.lon, lat: goal.lat });
  return pts;
}

function smooth(pts: LatLon[]): LatLon[] {
  if (!pts || pts.length < 3) return pts;
  const out: LatLon[] = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !segWater(pts[i], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

/** Route one leg, avoiding land. Direct line only if the grid isn't loaded. */
export function routeLeg(a: LatLon, b: LatLon): LatLon[] {
  if (!LAND) return [a, b];
  if (segWater(a, b)) return [a, b];
  const raw = astar(a, b);
  if (!raw) return [a, b];
  const sm = smooth(raw);
  for (let i = 0; i < sm.length - 1; i++) if (!segWater(sm[i], sm[i + 1])) return raw;
  return sm;
}

/** Full water-safe polyline through a list of points. */
export function computeRoute(points: LatLon[]): LatLon[] {
  if (points.length < 2) return points.slice();
  const out: LatLon[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const leg = routeLeg(points[i], points[i + 1]);
    for (let k = 1; k < leg.length; k++) out.push(leg[k]);
  }
  return out;
}

/** Does a computed node list cross land anywhere? */
export function routeCrossesLand(nodes: LatLon[]): boolean {
  if (!LAND) return false;
  for (let i = 0; i < nodes.length - 1; i++) if (!segWater(nodes[i], nodes[i + 1])) return true;
  return false;
}

/**
 * Spherical geometry for the world map: great-circle distance, interpolation,
 * bearing, densified route polylines, and longitude unwrapping across the
 * antimeridian. All pure — no DOM, no state.
 */
import type { LatLon, Path } from "./types";

export const R_NM = 3440.065; // Earth radius in nautical miles
export const toRad = (d: number): number => (d * Math.PI) / 180;
export const toDeg = (r: number): number => (r * 180) / Math.PI;

/** Great-circle (haversine) distance in nautical miles. */
export function hav(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Spherical linear interpolation between two points, fraction t in [0,1]. */
export function slerp(a: LatLon, b: LatLon, t: number): LatLon {
  const p1 = toRad(a.lat);
  const l1 = toRad(a.lon);
  const p2 = toRad(b.lat);
  const l2 = toRad(b.lon);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2 - p1) / 2) ** 2 +
          Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2
      )
    );
  if (d === 0) return { lon: a.lon, lat: a.lat };
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lon: toDeg(Math.atan2(y, x)),
  };
}

/** Initial bearing (degrees, 0–360) from a to b. */
export function bearing(a: LatLon, b: LatLon): number {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dl = toRad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];
export function compassPoint(brg: number): string {
  return COMPASS[Math.round(brg / 22.5) % 16];
}

/**
 * Make a list of longitudes continuous so a line never jumps across the ±180°
 * dateline (otherwise a map renderer draws a streak across the whole world).
 */
export function unwrapLons(coords: [number, number][]): [number, number][] {
  if (!coords || !coords.length) return coords;
  const out: [number, number][] = [[coords[0][0], coords[0][1]]];
  let prev = coords[0][0];
  for (let i = 1; i < coords.length; i++) {
    let lon = coords[i][0];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push([lon, coords[i][1]]);
    prev = lon;
  }
  return out;
}

/** Build a densified great-circle polyline through the given points. */
export function buildPath(points: LatLon[]): Path {
  const coords: [number, number][] = [];
  const cum: number[] = [0];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segNm = hav(a, b);
    const steps = Math.max(10, Math.round(segNm / 55));
    for (let s = 0; s < steps; s++) {
      if (i > 0 && s === 0) continue;
      const p = slerp(a, b, s / steps);
      coords.push([p.lon, p.lat]);
      if (coords.length > 1) {
        total += hav(
          { lon: coords[coords.length - 2][0], lat: coords[coords.length - 2][1] },
          p
        );
        cum.push(total);
      }
    }
  }
  const last = points[points.length - 1];
  coords.push([last.lon, last.lat]);
  total += hav(
    { lon: coords[coords.length - 2][0], lat: coords[coords.length - 2][1] },
    last
  );
  cum.push(total);
  return { coords: unwrapLons(coords), cum, total };
}

export interface Positioned extends LatLon {
  brg: number;
}

/** Point and bearing at distance d (nm) along a path. */
export function pointAtDist(path: Path, d: number): Positioned {
  d = Math.max(0, Math.min(path.total, d));
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < d) i++;
  const d0 = path.cum[i - 1];
  const d1 = path.cum[i];
  const t = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
  const a = { lon: path.coords[i - 1][0], lat: path.coords[i - 1][1] };
  const b = { lon: path.coords[i][0], lat: path.coords[i][1] };
  const p = slerp(a, b, t);
  return { lon: p.lon, lat: p.lat, brg: bearing(a, b) };
}

export function fmtCoord(lat: number, lon: number): string {
  const a = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? "N" : "S"}`;
  const b = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? "E" : "W"}`;
  return `${a}, ${b}`;
}

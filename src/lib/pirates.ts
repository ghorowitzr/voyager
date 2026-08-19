import type { Pirate, LatLon } from "./types";
import { bearing } from "./geo";

/**
 * Ten historically-named pirate vessels, each roaming a fixed ocean region on a
 * continuous, persistent orbit. Position is a pure function of a world-day, so
 * encounters can be computed deterministically — even for time that elapsed
 * while the player was away.
 */
const BASE = [
  { id: 0, name: "Queen Anne's Revenge", captain: "Blackbeard (Edward Teach)", era: "1717", lon: -42, lat: 22, rlon: 15, rlat: 8, period: 58, phase: 0.2, a: { aggression: 95, speed: 70, cunning: 80, firepower: 92, notoriety: 99 } },
  { id: 1, name: "Whydah Gally", captain: "Black Sam Bellamy", era: "1717", lon: -52, lat: 6, rlon: 13, rlat: 7, period: 74, phase: 1.1, a: { aggression: 74, speed: 88, cunning: 82, firepower: 76, notoriety: 85 } },
  { id: 2, name: "Royal Fortune", captain: "Bartholomew Roberts", era: "1720", lon: -28, lat: -16, rlon: 14, rlat: 9, period: 66, phase: 2.0, a: { aggression: 90, speed: 80, cunning: 88, firepower: 88, notoriety: 94 } },
  { id: 3, name: "Flying Dutchman", captain: "Van der Decken", era: "legend", lon: -16, lat: -34, rlon: 11, rlat: 7, period: 82, phase: 0.7, a: { aggression: 88, speed: 96, cunning: 99, firepower: 84, notoriety: 100 } },
  { id: 4, name: "Adventure Galley", captain: "William Kidd", era: "1696", lon: 62, lat: -8, rlon: 16, rlat: 8, period: 70, phase: 1.7, a: { aggression: 66, speed: 74, cunning: 70, firepower: 72, notoriety: 80 } },
  { id: 5, name: "Fancy", captain: "Henry Every", era: "1694", lon: 92, lat: 1, rlon: 12, rlat: 7, period: 63, phase: 2.6, a: { aggression: 82, speed: 84, cunning: 90, firepower: 80, notoriety: 88 } },
  { id: 6, name: "Rising Sun", captain: "Christopher Moody", era: "1713", lon: 150, lat: 10, rlon: 17, rlat: 9, period: 86, phase: 0.4, a: { aggression: 86, speed: 72, cunning: 66, firepower: 82, notoriety: 78 } },
  { id: 7, name: "Happy Delivery", captain: "George Lowther", era: "1721", lon: -118, lat: -12, rlon: 19, rlat: 10, period: 92, phase: 1.3, a: { aggression: 70, speed: 68, cunning: 74, firepower: 66, notoriety: 64 } },
  { id: 8, name: "Ranger", captain: "Charles Vane", era: "1718", lon: -150, lat: 6, rlon: 17, rlat: 9, period: 77, phase: 2.2, a: { aggression: 80, speed: 78, cunning: 72, firepower: 70, notoriety: 82 } },
  { id: 9, name: "Revenge", captain: "Stede Bonnet", era: "1717", lon: -66, lat: -40, rlon: 11, rlat: 6, period: 72, phase: 0.9, a: { aggression: 60, speed: 64, cunning: 58, firepower: 68, notoriety: 70 } },
];

export const PIRATES: Pirate[] = BASE.map((p) => ({
  ...p,
  strength: (p.a.aggression * 0.45 + p.a.firepower * 0.45 + p.a.notoriety * 0.1) / 100 * 0.85,
}));

export const pirateById = (id: number): Pirate | undefined =>
  PIRATES.find((p) => p.id === id);

/** Detection / pursuit range in nautical miles. */
export const PIRATE_DETECT_NM = 200;

/**
 * A pirate's position on a given world-day. Optionally avoids land using an
 * injected predicate (the app passes its land grid; tests can omit it).
 */
export function piratePosAt(
  p: Pirate,
  day: number,
  isLandLL?: (lon: number, lat: number) => boolean
): LatLon {
  const a = p.phase + (2 * Math.PI * day) / p.period;
  let ox = p.rlon * Math.cos(a);
  let oy = p.rlat * Math.sin(a * 1.3);
  let lon = p.lon + ox;
  let lat = Math.max(-58, Math.min(60, p.lat + oy));
  if (isLandLL) {
    for (let k = 0; k < 7 && isLandLL(lon, lat); k++) {
      ox *= 0.72;
      oy *= 0.72;
      lon = p.lon + ox;
      lat = Math.max(-58, Math.min(60, p.lat + oy));
    }
  }
  return { lon, lat };
}

export function pirateBearingAt(
  p: Pirate,
  day: number,
  isLandLL?: (lon: number, lat: number) => boolean
): number {
  return bearing(piratePosAt(p, day, isLandLL), piratePosAt(p, day + 0.05, isLandLL));
}

/** Integer world-day index for a departure date (days since the Unix epoch). */
export const worldDayOf = (departDate: string): number =>
  Math.floor(new Date(departDate).getTime() / 86400000);

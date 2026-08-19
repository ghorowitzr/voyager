import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  COLS, ROWS, lonC, latR, colOf, rowOf, setLandGrid, isLandLL,
  segWater, astar, computeRoute, routeCrossesLand, buildLandGrid, carveStraits,
} from "../routing";

/** A synthetic continent: a vertical wall of land blocking lon −20..−10. */
function wallGrid(): Uint8Array {
  const g = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const lon = lonC(c), lat = latR(r);
      if (lon > -20 && lon < -10 && lat > -40 && lat < 50) g[r * COLS + c] = 1;
    }
  return g;
}

describe("water routing around a synthetic continent", () => {
  beforeEach(() => setLandGrid(wallGrid()));
  afterEach(() => setLandGrid(null));

  it("reports land/water correctly", () => {
    expect(isLandLL(-15, 0)).toBe(true);
    expect(isLandLL(-30, 0)).toBe(false);
    expect(isLandLL(5, 0)).toBe(false);
  });

  it("the direct line across the wall is not water", () => {
    expect(segWater({ lon: -30, lat: 0 }, { lon: 5, lat: 0 })).toBe(false);
  });

  it("A* finds a detour and computeRoute is entirely over water", () => {
    const a = { lon: -30, lat: 0 }, b = { lon: 5, lat: 0 };
    const raw = astar(a, b);
    expect(raw).not.toBeNull();
    const route = computeRoute([a, b]);
    expect(route.length).toBeGreaterThan(2);
    expect(routeCrossesLand(route)).toBe(false);
  });

  it("leaves an open-water leg untouched", () => {
    const a = { lon: -40, lat: 0 }, b = { lon: -30, lat: 0 };
    const route = computeRoute([a, b]);
    expect(route.length).toBe(2); // no detour needed
  });
});

describe("buildLandGrid", () => {
  it("rasterizes a polygon into land cells", () => {
    // a square of land from 0..10 lon, 0..10 lat
    const feature = {
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
      },
    };
    const g = buildLandGrid([feature]);
    setLandGrid(g);
    expect(isLandLL(5, 5)).toBe(true);
    expect(isLandLL(50, 50)).toBe(false);
    setLandGrid(null);
  });
});

describe("carveStraits", () => {
  it("opens the Strait of Gibraltar in an all-land grid", () => {
    const g = new Uint8Array(COLS * ROWS).fill(1);
    carveStraits(g);
    setLandGrid(g);
    expect(isLandLL(-5.5, 36)).toBe(false); // Gibraltar carved to water
    expect(isLandLL(100, 60)).toBe(true); // elsewhere still land
    setLandGrid(null);
  });
});

describe("grid indexing round-trips", () => {
  it("colOf(lonC(c)) === c and rowOf(latR(r)) === r", () => {
    for (const c of [0, 1, 90, 179, 359]) expect(colOf(lonC(c))).toBe(c);
    for (const r of [0, 1, 90, 179]) expect(rowOf(latR(r))).toBe(r);
  });
});

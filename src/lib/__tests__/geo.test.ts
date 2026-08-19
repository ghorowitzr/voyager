import { describe, it, expect } from "vitest";
import { hav, buildPath, pointAtDist, unwrapLons, bearing, compassPoint } from "../geo";

describe("haversine distance", () => {
  it("is ~zero for identical points", () => {
    expect(hav({ lon: 10, lat: 10 }, { lon: 10, lat: 10 })).toBeCloseTo(0, 6);
  });
  it("matches a known great-circle distance (Lisbon → Cape Verde ≈ 1618 nm)", () => {
    const d = hav({ lon: -9.3, lat: 38.6 }, { lon: -23.9, lat: 14.8 });
    expect(d).toBeGreaterThan(1550);
    expect(d).toBeLessThan(1700);
  });
  it("is symmetric", () => {
    const a = { lon: -40, lat: 12 }, b = { lon: 30, lat: -5 };
    expect(hav(a, b)).toBeCloseTo(hav(b, a), 6);
  });
});

describe("bearing / compass", () => {
  it("points east along the equator", () => {
    expect(bearing({ lon: 0, lat: 0 }, { lon: 10, lat: 0 })).toBeCloseTo(90, 1);
  });
  it("maps degrees to a compass point", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(90)).toBe("E");
    expect(compassPoint(180)).toBe("S");
  });
});

describe("buildPath", () => {
  it("total distance ≈ direct great-circle distance for a single leg", () => {
    const a = { lon: -9.3, lat: 38.6 }, b = { lon: -43, lat: -23 };
    const path = buildPath([a, b]);
    expect(path.total).toBeCloseTo(hav(a, b), 0);
    expect(path.coords.length).toBeGreaterThan(2);
  });
  it("pointAtDist(0) is the start and pointAtDist(total) is the end", () => {
    const a = { lon: -9.3, lat: 38.6 }, b = { lon: -43, lat: -23 };
    const path = buildPath([a, b]);
    const p0 = pointAtDist(path, 0);
    const p1 = pointAtDist(path, path.total);
    expect(hav(p0, a)).toBeLessThan(1);
    expect(hav(p1, b)).toBeLessThan(1);
  });
});

describe("unwrapLons (antimeridian)", () => {
  it("keeps longitudes continuous across the dateline", () => {
    const raw: [number, number][] = [
      [150, 35], [168, 30], [179, 22], [-176, 15], [-168, 10], [-150, 5],
    ];
    const u = unwrapLons(raw);
    let maxJump = 0;
    for (let i = 1; i < u.length; i++) maxJump = Math.max(maxJump, Math.abs(u[i][0] - u[i - 1][0]));
    expect(maxJump).toBeLessThan(180); // no ~360° streak
  });
});

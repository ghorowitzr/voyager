import { describe, it, expect } from "vitest";
import { PORTS, REGIONS } from "../ports";
import { SHIPS } from "../ships";
import { CAPTAINS } from "../captains";
import { PIRATES, piratePosAt, PIRATE_DETECT_NM } from "../pirates";

describe("ports", () => {
  it("every port has a valid region and finite coordinates", () => {
    for (const p of PORTS) {
      expect(REGIONS).toContain(p.r);
      expect(Number.isFinite(p.lon)).toBe(true);
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
    }
  });
  it("has unique port names", () => {
    expect(new Set(PORTS.map((p) => p.n)).size).toBe(PORTS.length);
  });
});

describe("ships", () => {
  it("have positive speeds and average ≤ max", () => {
    for (const s of SHIPS) {
      expect(s.avg).toBeGreaterThan(0);
      expect(s.avg).toBeLessThanOrEqual(s.max);
      expect(s.crew).toBeGreaterThan(0);
    }
  });
});

describe("captains", () => {
  it("have six attributes, each in 1..100", () => {
    for (const c of CAPTAINS) {
      const keys = Object.keys(c.a);
      expect(keys.length).toBe(6);
      for (const k of keys) {
        const v = (c.a as unknown as Record<string, number>)[k];
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
  it("includes the three required founders", () => {
    const ids = CAPTAINS.map((c) => c.id);
    expect(ids).toContain("magellan");
    expect(ids).toContain("columbus");
    expect(ids).toContain("dagama");
  });
});

describe("pirates", () => {
  it("are exactly ten, each with a derived strength in (0,1)", () => {
    expect(PIRATES.length).toBe(10);
    for (const p of PIRATES) {
      expect(p.strength).toBeGreaterThan(0);
      expect(p.strength).toBeLessThan(1);
      expect(p.captain.length).toBeGreaterThan(0);
    }
  });
  it("pursuit range is 200 nm", () => {
    expect(PIRATE_DETECT_NM).toBe(200);
  });
  it("roam deterministically and stay on the globe", () => {
    for (const p of PIRATES) {
      const a = piratePosAt(p, 100);
      const b = piratePosAt(p, 100);
      expect(a).toEqual(b); // deterministic
      expect(Math.abs(a.lat)).toBeLessThanOrEqual(90);
    }
  });
});

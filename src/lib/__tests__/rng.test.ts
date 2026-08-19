import { describe, it, expect } from "vitest";
import { hashStr, mulberry32 } from "../rng";

describe("hashStr", () => {
  it("is deterministic", () => {
    expect(hashStr("demo-victoria")).toBe(hashStr("demo-victoria"));
  });
  it("differs for different strings", () => {
    expect(hashStr("a")).not.toBe(hashStr("b"));
  });
  it("returns a 32-bit unsigned integer", () => {
    const h = hashStr("voyager");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe("mulberry32", () => {
  it("same seed → identical sequence", () => {
    const a = mulberry32(hashStr("seed"));
    const b = mulberry32(hashStr("seed"));
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it("different seeds → different sequences", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
  it("yields floats in [0,1)", () => {
    const r = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

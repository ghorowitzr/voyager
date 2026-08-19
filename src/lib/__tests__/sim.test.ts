import { describe, it, expect, beforeEach } from "vitest";
import { makeVoyage, simulate, stateAt, simDaysNow, clearSimCache } from "../sim";
import { shipById } from "../ships";
import { PORTS } from "../ports";
import type { Voyage } from "../types";

const P = (n: string) => PORTS.find((p) => p.n === n)!;

function mkV(id: string, over: Partial<Parameters<typeof makeVoyage>[0]> = {}): Voyage {
  return makeVoyage({
    id, shipId: "victoria", captainId: "magellan",
    start: P("Lisbon"), dest: P("Salvador"),
    routeNodes: [{ lon: -9.3, lat: 38.6 }, { lon: -38.6, lat: -13 }],
    departDate: "1519-08-10T00:00:00Z",
    ...over,
  });
}

beforeEach(() => clearSimCache());

describe("makeVoyage", () => {
  it("derives duration from distance and ship speed", () => {
    const v = mkV("dur");
    const ship = shipById(v.shipId);
    expect(v.baseDurationDays).toBeCloseTo(v.distanceNm / (ship.avg * 24), 6);
  });
  it("defaults to a 4-gold budget and no interventions", () => {
    const v = mkV("gold");
    expect(v.gold).toBe(4);
    expect(v.interventions).toEqual([]);
  });
});

describe("simDaysNow", () => {
  it("is frozen while paused", () => {
    const v = mkV("pause", { paused: true, simAccumDays: 12 });
    expect(simDaysNow(v, Date.now() + 1e9)).toBe(12);
  });
});

describe("simulate determinism", () => {
  it("produces identical results across replays (same story every time)", () => {
    const v = mkV("determinism");
    clearSimCache();
    const r1 = JSON.stringify(simulate(v, v.baseDurationDays));
    clearSimCache();
    const r2 = JSON.stringify(simulate(v, v.baseDurationDays));
    expect(r1).toBe(r2);
  });
});

describe("supply consumption", () => {
  it("supplies fall over time", () => {
    const v = mkV("consume");
    clearSimCache();
    const early = simulate(v, 3).final.food;
    clearSimCache();
    const late = simulate(v, Math.floor(v.baseDurationDays)).final.food;
    expect(late).toBeLessThan(early);
    expect(early).toBeLessThan(100);
  });
});

describe("captain modifiers", () => {
  it("a higher-endurance captain conserves more food on the same voyage", () => {
    const v = mkV("captain");
    v.captainId = "cook"; // endurance 93
    clearSimCache();
    const cook = simulate(v, Math.floor(v.baseDurationDays)).final.food;
    v.captainId = "columbus"; // endurance 84
    clearSimCache();
    const columbus = simulate(v, Math.floor(v.baseDurationDays)).final.food;
    expect(cook).toBeGreaterThanOrEqual(columbus);
  });
});

describe("gold economy (player resupply)", () => {
  it("buying food raises the food level versus not buying", () => {
    const day = 2;
    const withoutIv = simulate(mkV("iv-no"), 20).final.food;
    clearSimCache();
    const v = mkV("iv-no", { interventions: [{ day, type: "food", amount: 10, cost: 2 }] });
    const withIv = simulate(v, 20).final.food;
    expect(withIv).toBeGreaterThanOrEqual(withoutIv);
  });
});

describe("sinking", () => {
  it("a ship whose hull wears to zero sinks and freezes", () => {
    const v = mkV("sink");
    v.baseDurationDays = 900; // long enough that hull wear alone breaches the hull
    clearSimCache();
    const sim = simulate(v, 900);
    expect(sim.sunk).toBe(true);
    expect(sim.sinkDay).toBeGreaterThan(0);
    expect(sim.sinkDay).toBeLessThan(900);
    expect(sim.sinkPos).not.toBeNull();

    const st = stateAt(v, 900);
    expect(st.sunk).toBe(true);
    expect(st.done).toBe(false);
    expect(st.curDay).toBe(sim.sinkDay); // clock frozen at loss
  });
});

describe("stateAt lifecycle", () => {
  it("is under way at departure and complete after the duration", () => {
    const v = mkV("life");
    expect(stateAt(v, 0).done).toBe(false);
    expect(stateAt(v, 0).sunk).toBe(false);
    expect(stateAt(v, v.baseDurationDays + 5).done).toBe(true);
  });
});

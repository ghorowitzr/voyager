/**
 * The deterministic voyage engine. Given a voyage's timeline, it replays every
 * day — supply burn, provisioning stops, random events, player resupply,
 * pirate encounters, and sinking — to produce condition, position, a diary, and
 * a full event schedule. Because it's seeded from the voyage id, the *story* is
 * identical on every replay, which is what lets voyages persist while offline.
 */
import type {
  LatLon, Voyage, DiaryEntry, ScheduledEvent, Stop, SimResult, Ship, Captain,
} from "./types";
import { hav, buildPath, pointAtDist, compassPoint, fmtCoord } from "./geo";
import { hashStr, mulberry32 } from "./rng";
import { shipById } from "./ships";
import { captainById, captainMods } from "./captains";
import { PIRATES, PIRATE_DETECT_NM, piratePosAt, worldDayOf } from "./pirates";
import { EVENTS, WEATHERS, WINDS } from "./events";
import { computeRoute } from "./routing";

const clamp = (x: number): number => Math.max(0, Math.min(100, x));

export interface MakeVoyageInput {
  id: string;
  shipId: string;
  captainId?: string;
  name?: string;
  expedition?: string;
  start: Voyage["start"];
  dest: Voyage["dest"];
  waypoints?: Voyage["waypoints"];
  routeNodes?: LatLon[];
  departDate?: string;
  startTimestamp?: number;
  simSpeed?: number;
  paused?: boolean;
  simAccumDays?: number;
  lastToggleTs?: number;
  lastViewedSimDay?: number;
  demo?: boolean;
  gold?: number;
  interventions?: Voyage["interventions"];
  _rev?: number;
  ci?: number;
  color?: string;
}

export function makeVoyage(o: MakeVoyageInput): Voyage {
  const ship = shipById(o.shipId);
  const routePts = [o.start, ...(o.waypoints || []), o.dest];
  const nodes = o.routeNodes || computeRoute(routePts);
  const path = buildPath(nodes);
  const durationDays = path.total / (ship.avg * 24);
  return {
    id: o.id, name: o.name || ship.name, shipId: ship.id, captainId: o.captainId || "magellan",
    expedition: o.expedition || "", start: o.start, dest: o.dest, waypoints: o.waypoints || [],
    routeNodes: nodes, distanceNm: path.total, baseDurationDays: durationDays,
    departDate: o.departDate || new Date().toISOString(),
    startTimestamp: o.startTimestamp || Date.now(), simSpeed: o.simSpeed ?? 1, paused: o.paused ?? false,
    simAccumDays: o.simAccumDays || 0, lastToggleTs: o.lastToggleTs || Date.now(),
    lastViewedSimDay: o.lastViewedSimDay || 0, demo: !!o.demo,
    gold: o.gold ?? 4, interventions: o.interventions || [], _rev: o._rev || 0,
    ci: o.ci, color: o.color,
  };
}

/** Elapsed simulated days, derived purely from timestamps. */
export function simDaysNow(v: Voyage, now = Date.now()): number {
  if (v.paused) return v.simAccumDays;
  return v.simAccumDays + ((now - v.lastToggleTs) / 86400000) * v.simSpeed;
}
export function bank(v: Voyage, now = Date.now()): void {
  v.simAccumDays = simDaysNow(v, now);
  v.lastToggleTs = now;
}
export function setSpeed(v: Voyage, s: number): void { bank(v); v.simSpeed = s; }
export function setPaused(v: Voyage, p: boolean): void { bank(v); v.paused = p; }
export function advanceDays(v: Voyage, d: number): void {
  bank(v);
  v.simAccumDays = Math.min(v.simAccumDays + d, v.baseDurationDays);
}
export const nextResourceCost = (): number => 2;

/** Deterministic random event schedule (independent of elapsed time). */
export function eventSchedule(v: Voyage): ScheduledEvent[] {
  const rng = mulberry32(hashStr(v.id));
  const evs: ScheduledEvent[] = [];
  const dur = v.baseDurationDays;
  let day = 1.5 + rng() * 2.5, guard = 0;
  const density = Math.max(2.0, dur / 9);
  while (day < dur - 0.6 && guard++ < 80) {
    const tpl = EVENTS[Math.floor(rng() * EVENTS.length)];
    const eff = tpl.eff(rng());
    evs.push({ day: +day.toFixed(1), tpl, eff });
    day += density * (0.5 + rng());
  }
  return evs;
}

/** Days at which the voyage reaches each interior waypoint (provisioning stop). */
export function stopDays(v: Voyage): Stop[] {
  const pts = [v.start, ...v.waypoints, v.dest];
  const out: Stop[] = [];
  let straightTotal = 0;
  for (let i = 0; i < pts.length - 1; i++) straightTotal += hav(pts[i], pts[i + 1]);
  let c = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    c += hav(pts[i - 1], pts[i]);
    const frac = straightTotal ? c / straightTotal : 0;
    out.push({ name: pts[i].n, day: frac * v.baseDurationDays });
  }
  return out;
}

function mkStop(v: Voyage, d: number, depart: Date, name: string, path: ReturnType<typeof buildPath>, frac: number): DiaryEntry {
  const pos = pointAtDist(path, Math.min(1, frac) * v.distanceNm);
  return {
    day: d, date: new Date(depart.getTime() + d * 86400000), major: true, cat: "navigation",
    icon: "⚓", title: "Provisioning — " + name,
    text: `The expedition put in at ${name} to take on fresh food and water and to make repairs. The crew rested.`,
    meta: `Anchored · ${fmtCoord(pos.lat, pos.lon)}`,
  };
}
function dayText(d: number, v: Voyage, ship: Ship, crew: number, weather: string, wind: string, spd: number, frac: number, rng: () => number): string {
  if (d === 1) return `The ${v.name} departed ${v.start.n} under ${weather.toLowerCase()} skies, ${crew} souls aboard. The open sea lies ahead toward ${v.dest.n}.`;
  const rem = Math.round((1 - Math.min(1, frac)) * v.distanceNm);
  const lines = [
    `The ${v.name} held her course toward ${v.dest.n}. The crew kept to their watches.`,
    `A quiet day of sailing; ${rem.toLocaleString()} nautical miles remain to ${v.dest.n}.`,
    `The sea ran ${weather.toLowerCase()}, the wind out of the ${wind}. Steady progress at ${spd.toFixed(1)} knots.`,
    `The log records ${spd.toFixed(1)} knots. Spirits aboard remain fair.`,
    `Another day upon the water. The horizon yields nothing but more horizon.`,
  ];
  return lines[Math.floor(rng() * lines.length)];
}

const simCache = new Map<string, SimResult>();
/** Clear the memoization cache (mainly for tests). */
export const clearSimCache = (): void => simCache.clear();

const CONSUME = 1.6; // global difficulty — supplies/condition run down faster

/** Replay the voyage up to `uptoDay`, producing condition, diary, and events. */
export function simulate(v: Voyage, uptoDay: number): SimResult {
  const ship = shipById(v.shipId);
  const dur = v.baseDurationDays;
  const upto = Math.max(0, Math.min(uptoDay, dur));
  const key = v.id + "|" + v._rev + "|" + Math.floor(upto * 4);
  const cached = simCache.get(key);
  if (cached) return cached;

  const evAll = eventSchedule(v);
  const stops = stopDays(v);
  const cap: Captain = captainById(v.captainId);
  const cm = captainMods(cap);
  const rng = mulberry32(hashStr(v.id) ^ 0x9e3779b9);
  const depart = new Date(v.departDate);
  let hull = ship.hull, sails = ship.sails, food = 100, water = 100, medicine = 100, crew = ship.crew, eta = 0;
  const foodRate = (100 / ship.foodDays) * cm.supplyMul * CONSUME;
  const waterRate = (100 / ship.waterDays) * cm.supplyMul * CONSUME;
  const ivs = [...(v.interventions || [])].sort((a, b) => a.day - b.day);
  let ivIdx = 0;
  const diary: DiaryEntry[] = [];
  const nDays = Math.max(1, Math.ceil(upto));
  const path = buildPath(v.routeNodes);
  const baseWD = worldDayOf(v.departDate);
  const pirateResolved = new Set<number>();
  let sunk = false, sinkDay = 0, sinkPos: LatLon | null = null, sinkCause = "", lastCause = "storms and hardship";
  let stopIdx = 0;

  for (let d = 1; d <= nDays; d++) {
    food -= foodRate; water -= waterRate; medicine -= 0.55; hull -= 0.13;

    while (ivIdx < ivs.length && ivs[ivIdx].day <= d) {
      const iv = ivs[ivIdx];
      if (iv.type === "food") food += iv.amount;
      else if (iv.type === "water") water += iv.amount;
      else if (iv.type === "medicine") medicine += iv.amount;
      diary.push({
        day: d, date: new Date(depart.getTime() + d * 86400000), major: false, cat: "supplies",
        icon: "🪙", title: "Resupplied",
        text: `The captain paid for fresh ${iv.type} to be brought aboard (+${iv.amount}%).`,
        meta: `Player intervention · ${iv.cost} gold`,
      });
      ivIdx++;
    }

    while (stopIdx < stops.length && stops[stopIdx].day <= d) {
      const s = stops[stopIdx];
      food = Math.max(food, 72); water = Math.max(water, 68); medicine = Math.min(100, medicine + 14);
      diary.push(mkStop(v, d, depart, s.name, path, d / dur));
      stopIdx++;
    }

    const todays = evAll.filter((e) => Math.floor(e.day) === d);
    for (const e of todays) {
      const f = e.eff, nm = cm.negEventMul;
      if (f.hull) hull += f.hull < 0 ? f.hull * nm : f.hull;
      if (f.sails) sails += f.sails < 0 ? f.sails * nm : f.sails;
      if (f.food) food += f.food < 0 ? f.food * nm : f.food;
      if (f.water) water += f.water < 0 ? f.water * nm : f.water;
      if (f.medicine) medicine += f.medicine < 0 ? f.medicine * nm : f.medicine;
      if (f.eta) eta += f.eta > 0 ? f.eta * nm : f.eta;
      if (f.crew) crew += f.crew < 0 ? Math.min(0, Math.round(f.crew * cm.crewLossMul)) : f.crew;
    }
    if (todays.some((e) => e.tpl.type === "storm")) lastCause = "a storm";

    if (food <= 0 || water <= 0) {
      const loss = Math.round(((rng() < 0.6 ? 1 : 0) + (medicine < 20 ? 1 : 0)) * cm.crewLossMul);
      crew = Math.max(0, crew - loss);
      if (food <= 0 || water <= 0) lastCause = "starvation and thirst";
    }

    // piracy: nearest un-resolved pirate within detection during the day
    const dpos = pointAtDist(path, Math.min(1, d / dur) * v.distanceNm);
    if (crew > 0 && !sunk) {
      let near = null as (typeof PIRATES)[number] | null, nearD = 1e9;
      for (const p of PIRATES) {
        if (pirateResolved.has(p.id)) continue;
        for (let k = 0; k < 8; k++) {
          const fr = d - 1 + k / 8;
          if (fr < 0) continue;
          const pp = pointAtDist(path, Math.min(1, fr / dur) * v.distanceNm);
          const qp = piratePosAt(p, baseWD + fr);
          const dd = hav(pp, qp);
          if (dd < nearD) { nearD = dd; near = p; }
        }
      }
      if (near && nearD < PIRATE_DETECT_NM) {
        pirateResolved.add(near.id);
        const cbr = mulberry32(hashStr(v.id + "|pir" + near.id + "|" + d));
        const def = Math.min(0.82, 0.26 + cm.combatBonus * 0.6 + ((ship.maneuver - 50) / 100) * 0.25 + (hull / 100 - 0.5) * 0.15);
        const sev = Math.max(0.12, near.strength * (1 - def) * (0.7 + cbr() * 0.6));
        const dHull = -(5 + sev * 22), dFood = -(sev * 8), dWater = -(sev * 6), dMed = -(sev * 7), dCrew = -Math.round(sev * 4);
        hull += dHull; food += dFood; water += dWater; medicine += dMed; crew = Math.max(0, crew + dCrew);
        lastCause = "a pirate attack";
        diary.push({
          day: d, date: new Date(depart.getTime() + d * 86400000), major: true, cat: "combat",
          icon: "🏴‍☠️", title: "Pirate Attack",
          text: `The ${v.name} was intercepted by the pirate ${near.name} under ${near.captain}. Hull ${dHull.toFixed(0)}%, food ${dFood.toFixed(0)}%, crew ${dCrew}.${cm.combatBonus > 0.12 ? ` Captain ${cap.name.split(" ").slice(-1)[0]}'s combat skill blunted the assault.` : ""}`,
          meta: `Pirate encounter · sighted ${Math.round(nearD)} nm · ${fmtCoord(dpos.lat, dpos.lon)}`,
        });
      }
    }

    hull = clamp(hull); sails = clamp(sails); food = clamp(food); water = clamp(water); medicine = clamp(medicine);

    if (hull <= 0 && !sunk) {
      sunk = true; sinkDay = d; sinkPos = { lon: dpos.lon, lat: dpos.lat }; sinkCause = lastCause;
      diary.push({
        day: d, date: new Date(depart.getTime() + d * 86400000), major: true, cat: "combat",
        icon: "☠️", title: "The " + v.name + " is lost",
        text: `Her hull breached, the ${v.name} was lost to the sea after ${d} days — ${sinkCause}. The wreck settled beneath the waves.`,
        meta: `Wreck · ${fmtCoord(dpos.lat, dpos.lon)}`,
      });
      break;
    }

    const r1 = rng(), r2 = rng();
    const weather = WEATHERS[Math.floor(r1 * WEATHERS.length)], wind = WINDS[Math.floor(r2 * WINDS.length)];
    const pos = dpos;
    const date = new Date(depart.getTime() + d * 86400000);
    const instSpeed = ship.avg * (1 + Math.sin(d * 1.6) * 0.05);
    if (todays.length) {
      for (const e of todays)
        diary.push({
          day: d, date, major: e.tpl.major, cat: e.tpl.cat, icon: e.tpl.icon, title: e.tpl.title,
          text: e.tpl.text({ hull: e.eff.hull || 0, sails: e.eff.sails || 0, water: e.eff.water || 0, food: e.eff.food || 0, medicine: e.eff.medicine || 0, eta: e.eff.eta || 0, crew: e.eff.crew || 0 }),
          meta: `${weather} · Wind ${wind} · ${fmtCoord(pos.lat, pos.lon)}`,
        });
    } else {
      diary.push({
        day: d, date, major: d === 1, cat: "navigation", icon: d === 1 ? "⚓" : null, title: d === 1 ? "Departure" : null,
        text: dayText(d, v, ship, crew, weather, wind, instSpeed, d / dur, rng),
        meta: `${weather} · Wind ${wind} · ${instSpeed.toFixed(1)} kn · ${fmtCoord(pos.lat, pos.lon)}`,
      });
    }
  }

  eta -= (1 - cm.etaMul) * dur * 0.5; // navigation efficiency (subtle)
  const res: SimResult = {
    final: { hull, sails, food, water, medicine, crew, eta },
    diary, events: evAll, stops, sunk, sinkDay, sinkPos, sinkCause,
  };
  simCache.set(key, res);
  return res;
}

export interface SimState {
  ship: Ship; curDay: number; done: boolean; sunk: boolean; sinkCause: string; sinkDay: number;
  dur: number; adjDur: number; pos: LatLon; brg: number; heading: string;
  hull: number; sails: number; food: number; water: number; medicine: number; crew: number;
  distSoFar: number; distRemaining: number; remainingDays: number; instSpeed: number;
  weather: string; wind: string; events: ScheduledEvent[]; stops: Stop[];
  nextStop: Stop | null; diary: DiaryEntry[];
}

/** Instantaneous derived state at a given simulated day. */
export function stateAt(v: Voyage, curDay: number): SimState {
  const ship = shipById(v.shipId);
  const dur = v.baseDurationDays;
  const cd = Math.max(0, Math.min(curDay, dur));
  const sim = simulate(v, cd);
  const f = sim.final;
  const sunk = !!sim.sunk;
  const done = !sunk && curDay >= dur;
  const effDay = sunk ? sim.sinkDay : cd;
  const path = buildPath(v.routeNodes);
  const distSoFar = Math.min(1, effDay / dur) * v.distanceNm;
  const pos = pointAtDist(path, distSoFar);
  const adjDur = dur + f.eta;
  const remainingDays = Math.max(0, adjDur - curDay);
  const instSpeed = Math.max(1.2, ship.avg * (1 + Math.sin(effDay * 1.6) * 0.05));
  const rng = mulberry32(hashStr(v.id) ^ (Math.floor(effDay) + 7));
  const weather = WEATHERS[Math.floor(rng() * WEATHERS.length)];
  const wind = WINDS[Math.floor(rng() * WINDS.length)];
  let nextStop: Stop | null = null;
  for (const s of sim.stops) if (s.day > effDay) { nextStop = s; break; }
  return {
    ship, curDay: sunk ? sim.sinkDay : curDay, done, sunk, sinkCause: sim.sinkCause, sinkDay: sim.sinkDay,
    dur, adjDur, pos, brg: pos.brg, heading: compassPoint(pos.brg),
    hull: f.hull, sails: f.sails, food: f.food, water: f.water, medicine: f.medicine, crew: f.crew,
    distSoFar, distRemaining: Math.max(0, v.distanceNm - distSoFar), remainingDays, instSpeed, weather, wind,
    events: sim.events, stops: sim.stops, nextStop, diary: sim.diary,
  };
}

/** Recompute a voyage's route through the water router (mutates the voyage). */
export function reroute(v: Voyage): void {
  const ship = shipById(v.shipId);
  const pts = [v.start, ...(v.waypoints || []), v.dest];
  const nodes = computeRoute(pts);
  v.routeNodes = nodes;
  const path = buildPath(nodes);
  v.distanceNm = path.total;
  v.baseDurationDays = path.total / (ship.avg * 24);
  v._rev = (v._rev || 0) + 1;
}

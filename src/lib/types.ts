/** Shared domain types for the Voyager simulation core. */

export interface LatLon {
  lon: number;
  lat: number;
}

/** A densified great-circle polyline with cumulative distances (nm). */
export interface Path {
  coords: [number, number][];
  cum: number[];
  total: number;
}

export interface Ship {
  id: string;
  name: string;
  type: string;
  era: string;
  avg: number;
  max: number;
  cargo: number;
  crew: number;
  foodDays: number;
  waterDays: number;
  hull: number;
  sails: number;
  maneuver: number;
  nav: number;
  accuracy: number;
  blurb: string;
}

export interface CaptainAttrs {
  navigation: number;
  exploration: number;
  leadership: number;
  diplomacy: number;
  combat: number;
  endurance: number;
}

export interface Captain {
  id: string;
  name: string;
  era: string;
  flag: string;
  file: string;
  hue: number;
  bio: string;
  specialty: string;
  a: CaptainAttrs;
}

export interface CaptainMods {
  etaMul: number;
  supplyMul: number;
  crewLossMul: number;
  negEventMul: number;
  combatBonus: number;
}

export type Region =
  | "Europe"
  | "Atlantic Isles"
  | "N. America"
  | "S. America"
  | "Africa"
  | "Asia"
  | "Oceania"
  | "Antarctic";

export interface Port extends LatLon {
  n: string;
  c: string;
  r: Region;
}

export interface PirateAttrs {
  aggression: number;
  speed: number;
  cunning: number;
  firepower: number;
  notoriety: number;
}

export interface Pirate extends LatLon {
  id: number;
  name: string;
  captain: string;
  era: string;
  rlon: number;
  rlat: number;
  period: number;
  phase: number;
  a: PirateAttrs;
  /** Derived combat strength in [0,1]. */
  strength: number;
}

export type EventCategory =
  | "weather"
  | "supplies"
  | "crew"
  | "navigation"
  | "discovery"
  | "combat";

export interface EventEffect {
  hull?: number;
  sails?: number;
  food?: number;
  water?: number;
  medicine?: number;
  eta?: number;
  crew?: number;
}

export interface EventTemplate {
  type: string;
  major: boolean;
  icon: string;
  cat: EventCategory;
  title: string;
  text: (e: Required<EventEffect>) => string;
  eff: (r: number) => EventEffect;
}

export interface Intervention {
  day: number;
  type: "food" | "water" | "medicine";
  amount: number;
  cost: number;
}

export interface Voyage {
  id: string;
  name: string;
  shipId: string;
  captainId: string;
  expedition: string;
  start: Port;
  dest: Port;
  waypoints: Port[];
  routeNodes: LatLon[];
  distanceNm: number;
  baseDurationDays: number;
  departDate: string;
  startTimestamp: number;
  simSpeed: number;
  paused: boolean;
  simAccumDays: number;
  lastToggleTs: number;
  lastViewedSimDay: number;
  demo: boolean;
  gold: number;
  interventions: Intervention[];
  _rev: number;
  color?: string;
  ci?: number;
}

export interface DiaryEntry {
  day: number;
  date: Date;
  major: boolean;
  cat: EventCategory;
  icon: string | null;
  title: string | null;
  text: string;
  meta: string;
}

export interface ScheduledEvent {
  day: number;
  tpl: EventTemplate;
  eff: EventEffect;
}

export interface Stop {
  name: string;
  day: number;
}

export interface SimResult {
  final: {
    hull: number;
    sails: number;
    food: number;
    water: number;
    medicine: number;
    crew: number;
    eta: number;
  };
  diary: DiaryEntry[];
  events: ScheduledEvent[];
  stops: Stop[];
  sunk: boolean;
  sinkDay: number;
  sinkPos: LatLon | null;
  sinkCause: string;
}

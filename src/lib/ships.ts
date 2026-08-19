import type { Ship } from "./types";

/** Playable vessels. `avg` (average sailing speed) drives voyage duration. */
export const SHIPS: Ship[] = [
  { id: "victoria", name: "Victoria", type: "Carrack (Nao)", era: "1519", avg: 4.2, max: 8, cargo: 85, crew: 42, foodDays: 150, waterDays: 120, hull: 100, sails: 92, maneuver: 55, nav: 60, accuracy: 96, blurb: "The first ship to circle the globe." },
  { id: "trinidad", name: "Trinidad", type: "Carrack (Nao)", era: "1519", avg: 4.0, max: 7.5, cargo: 110, crew: 55, foodDays: 160, waterDays: 130, hull: 100, sails: 90, maneuver: 50, nav: 58, accuracy: 94, blurb: "Magellan's flagship." },
  { id: "santamaria", name: "Santa María", type: "Carrack", era: "1492", avg: 3.8, max: 7, cargo: 100, crew: 40, foodDays: 120, waterDays: 100, hull: 96, sails: 88, maneuver: 48, nav: 55, accuracy: 92, blurb: "Columbus's largest vessel." },
  { id: "caravel", name: "Caravel", type: "Caravel", era: "15th c.", avg: 5.2, max: 9, cargo: 50, crew: 25, foodDays: 110, waterDays: 95, hull: 94, sails: 95, maneuver: 82, nav: 65, accuracy: 90, blurb: "Nimble, weatherly, built for discovery." },
  { id: "galleon", name: "Galleon", type: "Galleon", era: "16th c.", avg: 4.6, max: 8.5, cargo: 400, crew: 130, foodDays: 170, waterDays: 140, hull: 100, sails: 90, maneuver: 45, nav: 70, accuracy: 88, blurb: "Great ocean-going warship and trader." },
  { id: "clipper", name: "Clipper", type: "Clipper", era: "19th c.", avg: 8.6, max: 16, cargo: 120, crew: 30, foodDays: 150, waterDays: 130, hull: 92, sails: 99, maneuver: 78, nav: 88, accuracy: 70, blurb: "The fastest sail ever built (experimental era)." },
  { id: "frigate", name: "Frigate", type: "Frigate", era: "18th c.", avg: 7.2, max: 13, cargo: 90, crew: 200, foodDays: 140, waterDays: 120, hull: 98, sails: 96, maneuver: 74, nav: 85, accuracy: 78, blurb: "Fast, well-armed, long legs." },
  { id: "merchant", name: "Merchant Fluyt", type: "Merchant vessel", era: "17th c.", avg: 4.4, max: 8, cargo: 500, crew: 15, foodDays: 180, waterDays: 150, hull: 95, sails: 86, maneuver: 52, nav: 72, accuracy: 84, blurb: "Cheap, capacious cargo hauler." },
];

export const shipById = (id: string): Ship =>
  SHIPS.find((s) => s.id === id) || SHIPS[0];

import type { EventTemplate } from "./types";

/** Random voyage events. Negative effects are softened by captain leadership. */
export const EVENTS: EventTemplate[] = [
  { type: "wind", major: false, icon: "💨", cat: "weather", title: "Strong Winds", text: (e) => `A steady following wind filled the sails; the ship surged ahead. Estimated arrival improved by ${Math.abs(e.eta).toFixed(1)} days.`, eff: (r) => ({ eta: -(0.4 + r * 0.7), sails: -1 }) },
  { type: "storm", major: true, icon: "⚠️", cat: "weather", title: "Storm", text: (e) => `A violent storm battered the ship. Hull integrity fell ${Math.abs(e.hull).toFixed(0)}%, sails ${Math.abs(e.sails).toFixed(0)}%, and arrival slipped ${e.eta.toFixed(1)} days.`, eff: (r) => ({ hull: -(4 + r * 5), sails: -(3 + r * 4), water: -(2 + r * 3), eta: +(0.8 + r * 1.1) }) },
  { type: "calm", major: false, icon: "🌊", cat: "weather", title: "Calm Waters", text: (e) => `The ship drifted into a windless expanse of glassy sea. Arrival slipped ${e.eta.toFixed(1)} days.`, eff: (r) => ({ eta: +(0.4 + r * 0.8) }) },
  { type: "water", major: false, icon: "💧", cat: "supplies", title: "Low Water", text: () => `The quartermaster reports fresh water running low. Rations were tightened under a hard sun.`, eff: (r) => ({ water: -(7 + r * 7) }) },
  { type: "food", major: false, icon: "🥖", cat: "supplies", title: "Provisions Spoiled", text: () => `Casks of salted meat were found rotten and cast overboard.`, eff: (r) => ({ food: -(6 + r * 8) }) },
  { type: "scurvy", major: true, icon: "🩺", cat: "crew", title: "Sickness Aboard", text: () => `Scurvy spread among the crew. The surgeon's stores were drawn down.`, eff: (r) => ({ medicine: -(9 + r * 10), crew: -1 }) },
  { type: "current", major: false, icon: "🧭", cat: "navigation", title: "Favorable Current", text: (e) => `The ship caught a current running true toward its heading. Arrival improved by ${Math.abs(e.eta).toFixed(1)} days.`, eff: (r) => ({ eta: -(0.4 + r * 0.6) }) },
  { type: "discovery", major: true, icon: "🏝️", cat: "discovery", title: "Land Sighted", text: () => `The lookout cried land — an island unmarked on any chart. The crew's spirits lifted at the discovery.`, eff: () => ({ food: +2 }) },
  { type: "whale", major: true, icon: "🐋", cat: "discovery", title: "A Great Whale", text: () => `A whale broke the surface alongside, vast and unhurried, before sounding into the deep.`, eff: () => ({}) },
  { type: "repair", major: false, icon: "🔨", cat: "navigation", title: "Repairs at Sea", text: () => `The carpenter mended a strained seam in the hull.`, eff: (r) => ({ hull: +(3 + r * 3), sails: +2 }) },
  { type: "mutiny", major: true, icon: "⚔️", cat: "crew", title: "Mutiny!", text: (e) => `MUTINY! The crew rose against their officers over short rations and hard discipline. Order was restored at a cost — ${Math.abs(e.crew)} lost and days squandered.`, eff: (r) => ({ eta: +(0.6 + r * 0.9), crew: -(1 + Math.round(r)), food: -(2 + r * 4) }) },
];

export const WEATHERS = ["Clear", "Fair", "Overcast", "Squally", "Foggy", "Windy", "Fine", "Grey skies"];
export const WINDS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "NNW", "WSW", "ESE", "ENE"];

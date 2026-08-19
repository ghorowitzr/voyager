import type { Captain, CaptainMods } from "./types";

/**
 * Historical captains. Attributes (1–100) are grounded in each figure's record
 * and feed `captainMods`, which subtly biases the simulation.
 */
export const CAPTAINS: Captain[] = [
  { id: "magellan", name: "Ferdinand Magellan", era: "1480–1521", flag: "Portugal / Castile", file: "Ferdinand Magellan.jpg", hue: 205, bio: "Led the first expedition to circumnavigate the globe; killed at Mactan before its completion.", specialty: "Long-range ocean navigation, strait-finding", a: { navigation: 94, exploration: 98, leadership: 82, diplomacy: 68, combat: 87, endurance: 91 } },
  { id: "elcano", name: "Juan Sebastián Elcano", era: "1476–1526", flag: "Castile (Basque)", file: "Juan Sebastián Elcano.jpg", hue: 190, bio: "Completed the first circumnavigation aboard the Victoria after Magellan's death.", specialty: "Endurance, seamanship, survival", a: { navigation: 88, exploration: 84, leadership: 86, diplomacy: 70, combat: 74, endurance: 96 } },
  { id: "columbus", name: "Christopher Columbus", era: "1451–1506", flag: "Genoa / Castile", file: "Portrait of a Man, Said to be Christopher Columbus.jpg", hue: 25, bio: "Crossed the Atlantic in 1492, opening sustained contact between Europe and the Americas.", specialty: "Ocean crossing, dead-reckoning", a: { navigation: 90, exploration: 95, leadership: 70, diplomacy: 55, combat: 66, endurance: 84 } },
  { id: "dagama", name: "Vasco da Gama", era: "1460s–1524", flag: "Portugal", file: "Vasco da Gama (Gregório Lopes).png", hue: 150, bio: "First to sail directly from Europe to India around the Cape of Good Hope.", specialty: "Blue-water routing, the volta do mar", a: { navigation: 92, exploration: 90, leadership: 78, diplomacy: 52, combat: 83, endurance: 88 } },
  { id: "dias", name: "Bartolomeu Dias", era: "1450s–1500", flag: "Portugal", file: "Bartolomeu Dias.jpg", hue: 135, bio: "First European to round the southern tip of Africa, opening the sea route east.", specialty: "Cape rounding, storm sailing", a: { navigation: 89, exploration: 93, leadership: 76, diplomacy: 58, combat: 70, endurance: 90 } },
  { id: "cook", name: "James Cook", era: "1728–1779", flag: "Great Britain", file: "Captainjamescookportrait.jpg", hue: 220, bio: "Charted the Pacific with unmatched precision on three great voyages.", specialty: "Cartography, scurvy prevention, crew health", a: { navigation: 99, exploration: 96, leadership: 92, diplomacy: 74, combat: 72, endurance: 93 } },
  { id: "drake", name: "Francis Drake", era: "1540–1596", flag: "England", file: "1590 or later Marcus Gheeraerts, Sir Francis Drake Buckland Abbey, Devon.jpg", hue: 15, bio: "Second to circumnavigate the globe; famed privateer and naval commander.", specialty: "Combat, raiding, bold seamanship", a: { navigation: 85, exploration: 82, leadership: 88, diplomacy: 60, combat: 97, endurance: 86 } },
  { id: "zhenghe", name: "Zheng He", era: "1371–1433", flag: "Ming China", file: "ZhengHeStatue.jpg", hue: 10, bio: "Commanded the vast Ming treasure fleets across the Indian Ocean.", specialty: "Fleet command, diplomacy, logistics", a: { navigation: 90, exploration: 88, leadership: 95, diplomacy: 96, combat: 80, endurance: 89 } },
];

export const captainById = (id: string): Captain =>
  CAPTAINS.find((c) => c.id === id) || CAPTAINS[0];

/** Subtle simulation modifiers derived from a captain's attributes. */
export function captainMods(cap: Captain = CAPTAINS[0]): CaptainMods {
  const a = cap.a;
  return {
    etaMul: 1 - ((a.navigation - 70) / 100) * 0.18, // navigation → shorter effective route
    supplyMul: 1 - ((a.endurance - 70) / 100) * 0.22, // endurance → slower supply burn
    crewLossMul: 1 - ((a.leadership - 70) / 100) * 0.5, // leadership → fewer crew losses
    negEventMul: 1 - ((a.leadership - 70) / 100) * 0.25, // leadership → milder bad events
    combatBonus: (a.combat - 70) / 100, // combat → survive pirate encounters
  };
}

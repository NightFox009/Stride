// Floor layout for the 100-floor dungeon: floor types, wave generation,
// and Energy cost. Combat/Boss floors = 10 waves; others single-encounter.

import { EARLY_POOL, spawn } from "./enemies.js";

export const WAVES_PER_COMBAT_FLOOR = 10;
export const BOSS_EVERY = 10;

export function floorType(floor) {
  if (floor % BOSS_EVERY === 0) return "boss";
  if (floor % 5 === 0) return "elite";
  if (floor % 7 === 0) return "treasure";
  if (floor % 4 === 0) return "rest";
  return "combat";
}

export function energyCost(floor) {
  return 5 + Math.floor(floor / 5); // deeper floors cost a bit more
}

// Build the list of waves for a floor. Each wave is an array of enemy specs.
export function buildWaves(floor, rng) {
  const type = floorType(floor);

  if (type === "boss") {
    // 9 escalating waves then the boss as the 10th.
    const waves = [];
    for (let w = 1; w <= WAVES_PER_COMBAT_FLOOR - 1; w++) {
      waves.push(buildCombatWave(floor, w, rng));
    }
    waves.push([spawn("goblin_warlord", { floor, wave: WAVES_PER_COMBAT_FLOOR })]);
    return { type, waves };
  }

  if (type === "elite") {
    return { type, waves: [[spawn("goblin_brute", { floor, wave: 1 })]] };
  }

  if (type === "treasure" || type === "rest") {
    return { type, waves: [] }; // non-combat, handled by UI/run logic
  }

  // standard combat floor: 10 waves, last is a mini-elite
  const waves = [];
  for (let w = 1; w <= WAVES_PER_COMBAT_FLOOR; w++) {
    if (w === WAVES_PER_COMBAT_FLOOR) {
      waves.push([spawn("goblin_brute", { floor, wave: w })]);
    } else {
      waves.push(buildCombatWave(floor, w, rng));
    }
  }
  return { type, waves };
}

function buildCombatWave(floor, wave, rng) {
  const count = 1 + Math.min(2, Math.floor((floor + wave) / 8)); // 1-3 enemies
  const enemies = [];
  for (let i = 0; i < count; i++) {
    enemies.push(spawn(rng.pick(EARLY_POOL), { floor, wave }));
  }
  return enemies;
}

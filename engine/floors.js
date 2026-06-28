// Floor layout for the 100-floor dungeon: floor types, wave generation,
// and Energy cost. Combat/Boss floors = 10 waves; others single-encounter.

import { spawn } from "./enemies.js";
import { zoneForFloor } from "./zones.js";

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

// Build the list of waves for a floor, drawing enemies from the floor's zone.
// Each wave is an array of enemy specs.
export function buildWaves(floor, rng) {
  const type = floorType(floor);
  const zone = zoneForFloor(floor);

  if (type === "boss") {
    // 9 escalating waves then the zone boss as the 10th.
    const waves = [];
    for (let w = 1; w <= WAVES_PER_COMBAT_FLOOR - 1; w++) {
      waves.push(buildCombatWave(floor, w, rng, zone.pool));
    }
    waves.push([spawn(zone.boss, { floor, wave: WAVES_PER_COMBAT_FLOOR })]);
    return { type, waves };
  }

  if (type === "elite") {
    return { type, waves: [[spawn(zone.elite, { floor, wave: 1 })]] };
  }

  if (type === "treasure" || type === "rest") {
    return { type, waves: [] }; // non-combat, handled by UI/run logic
  }

  // standard combat floor: 10 waves, last is the zone's elite as a mini-boss
  const waves = [];
  for (let w = 1; w <= WAVES_PER_COMBAT_FLOOR; w++) {
    if (w === WAVES_PER_COMBAT_FLOOR) {
      waves.push([spawn(zone.elite, { floor, wave: w })]);
    } else {
      waves.push(buildCombatWave(floor, w, rng, zone.pool));
    }
  }
  return { type, waves };
}

function buildCombatWave(floor, wave, rng, pool) {
  const count = 1 + Math.min(2, Math.floor((floor + wave) / 8)); // 1-3 enemies
  const enemies = [];
  for (let i = 0; i < count; i++) {
    enemies.push(spawn(rng.pick(pool), { floor, wave }));
  }
  return enemies;
}

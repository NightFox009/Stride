// Balance harness — simulates many dungeon runs and reports clear rates,
// so tuning is driven by data, not guesswork.
// Run: node balance.js [trials]

import { startingStatsFor, BASE_CLASSES } from "./engine/classes.js";
import { runFloor } from "./engine/dungeon.js";
import { SKILLS } from "./engine/skills.js";
import { createRng } from "./engine/rng.js";
import { derive } from "./engine/stats.js";
import { levelHpBonus } from "./engine/progression.js";
import { energyCost, floorType } from "./engine/floors.js";

const TRIALS = Number(process.argv[2]) || 300;

// Build a representative character at a given level for a class.
// Stat points: pointsPerLevel(=3)+milestones, allocated 60% to class stat,
// the rest spread — a reasonable "focused" build.
function buildCharacter(classId, level) {
  const cls = BASE_CLASSES[classId];
  const stats = startingStatsFor(classId);
  let points = 0;
  for (let l = 2; l <= level; l++) points += 3 + (l % 10 === 0 ? 10 : 0);
  const toBoost = Math.round(points * 0.6);
  stats[cls.boost] += toBoost;
  let rest = points - toBoost;
  const others = Object.keys(stats).filter((s) => s !== cls.boost);
  let i = 0;
  while (rest-- > 0) { stats[others[i % others.length]] += 1; i++; }
  return { cls, stats, skills: [...cls.skills] };
}

function policy(player, enemies, rng) {
  const target = enemies.findIndex((e) => e.hp > 0);
  // Heal if a self-heal skill is known and HP is low.
  for (const id of player.skills) {
    const s = SKILLS[id];
    if (s && s.target === "self" && player.hp < player.maxHP * 0.4 && player.mp >= s.cost) {
      return { kind: "skill", skillId: id, targetIndex: target };
    }
  }
  // Otherwise cast the first affordable damage skill.
  for (const id of player.skills) {
    const s = SKILLS[id];
    if (s && s.target !== "self" && player.mp >= s.cost) {
      return { kind: "skill", skillId: id, targetIndex: target };
    }
  }
  return { kind: "attack", targetIndex: target };
}

function clearRate(classId, level, floor, trials) {
  const { stats, skills } = buildCharacter(classId, level);
  let clears = 0, totalWaves = 0;
  for (let t = 0; t < trials; t++) {
    const rng = createRng(1000 + t * 7 + floor * 13);
    const r = runFloor({ floor, stats, skills, choose: policy, rng, energy: 9999, level });
    if (r.outcome === "cleared") clears++;
    totalWaves += r.wavesCleared;
  }
  return { rate: clears / trials, avgWaves: totalWaves / trials };
}

console.log(`Balance harness — ${TRIALS} trials per cell`);
console.log("=".repeat(64));

// Sweep: a Knight at sensible levels vs the first stretch of floors.
const checks = [
  { classId: "knight", level: 3,  floor: 1 },
  { classId: "knight", level: 5,  floor: 1 },
  { classId: "knight", level: 8,  floor: 3 },
  { classId: "knight", level: 12, floor: 5 },
  { classId: "knight", level: 18, floor: 10 }, // boss
  { classId: "knight", level: 25, floor: 10 }, // boss
  { classId: "knight", level: 32, floor: 10 }, // boss
  { classId: "knight", level: 40, floor: 10 }, // boss
];

for (const c of checks) {
  const { cls, stats } = buildCharacter(c.classId, c.level);
  const { rate, avgWaves } = clearRate(c.classId, c.level, c.floor, TRIALS);
  const hp = derive.maxHP(stats) + levelHpBonus(c.level), atk = derive.attack(stats);
  console.log(
    `${cls.name} Lv${String(c.level).padStart(2)} ` +
    `vs Floor ${String(c.floor).padStart(2)} [${floorType(c.floor)}, ${energyCost(c.floor)}e]  ` +
    `clear ${(rate * 100).toFixed(0).padStart(3)}%  ` +
    `avgWaves ${avgWaves.toFixed(1)}  ` +
    `(HP ${hp}, ATK ${atk})`
  );
}

// All seven classes at Lv5 on Floor 1 — are they all viable?
console.log("-".repeat(64));
console.log("All classes — Lv5 vs Floor 1:");
for (const classId of Object.keys(BASE_CLASSES)) {
  const { rate } = clearRate(classId, 5, 1, Math.min(TRIALS, 150));
  console.log(`  ${BASE_CLASSES[classId].name.padEnd(9)} clear ${(rate * 100).toFixed(0).padStart(3)}%`);
}

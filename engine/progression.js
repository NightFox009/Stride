// EXP, leveling, stat points, and the steps -> EXP/Energy conversions.

export const TUNING = {
  baseXP: 100,        // expToNext = baseXP * level^1.5
  pointsPerLevel: 3,
  milestoneEvery: 10, // every Nth level
  milestoneBonus: 10, // extra stat points on milestone levels
  stepsPerXP: 10,     // 10 steps = 1 EXP
  stepsPerEnergy: 100,// 100 steps = 1 Energy
  dungeonXpFactor: 0.5, // dungeon EXP is reduced vs walking
};

export function expToNext(level) {
  return Math.round(TUNING.baseXP * Math.pow(level, 1.5));
}

export function statPointsForLevel(level) {
  let pts = TUNING.pointsPerLevel;
  if (level % TUNING.milestoneEvery === 0) pts += TUNING.milestoneBonus;
  return pts;
}

export function stepsToXP(steps) {
  return Math.floor(steps / TUNING.stepsPerXP);
}

export function stepsToEnergy(steps) {
  return Math.floor(steps / TUNING.stepsPerEnergy);
}

// Add EXP to a profile, handling multi-level-ups. Mutates a copy and returns it.
export function gainExp(profile, amount) {
  const p = { ...profile };
  p.exp += amount;
  const levelsGained = [];
  while (p.exp >= expToNext(p.level)) {
    p.exp -= expToNext(p.level);
    p.level += 1;
    const pts = statPointsForLevel(p.level);
    p.statPoints += pts;
    levelsGained.push({ level: p.level, statPoints: pts });
  }
  return { profile: p, levelsGained };
}

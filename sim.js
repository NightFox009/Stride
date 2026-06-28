// Text-based demo driver — proves the engine works end to end.
// Run: npm run sim   (or: node sim.js)
//
// This is the V1 "Text UI": it consumes engine events and prints them.
// A graphical UI (V2) would consume the SAME events and draw instead.

import { startingStatsFor, BASE_CLASSES, unlockedHiddenClasses } from "./engine/classes.js";
import { makeCombatant, runBattle } from "./engine/combat.js";
import { buildWaves, floorType, energyCost } from "./engine/floors.js";
import { spawn } from "./engine/enemies.js";
import { SKILLS } from "./engine/skills.js";
import { derive } from "./engine/stats.js";
import { createRng } from "./engine/rng.js";
import { gainExp, stepsToXP, stepsToEnergy, expToNext, TUNING } from "./engine/progression.js";

const seed = Number(process.argv[2]) || 12345;
const rng = createRng(seed);

const line = (s = "") => console.log(s);
const hr = () => line("─".repeat(54));

// ── Build a Knight player ──────────────────────────────────────
const classId = "knight";
const cls = BASE_CLASSES[classId];
const stats = startingStatsFor(classId);
const playerSkills = [...cls.skills];

let profile = { level: 1, exp: 0, statPoints: 0, gold: 0, energy: 0 };

line("══════════════════  STRIDE — engine demo  ══════════════════");
line(`Seed: ${seed}`);
hr();

// ── Steps -> EXP + Energy ──────────────────────────────────────
const todaySteps = 8200;
const xpFromSteps = stepsToXP(todaySteps);
profile.energy += stepsToEnergy(todaySteps);
line(`You walked ${todaySteps} steps today.`);
line(`  -> +${xpFromSteps} EXP   (${TUNING.stepsPerXP} steps / EXP)`);
line(`  -> +${stepsToEnergy(todaySteps)} Energy   (${TUNING.stepsPerEnergy} steps / Energy)`);

let res = gainExp(profile, xpFromSteps);
profile = res.profile;
for (const lv of res.levelsGained) {
  line(`  *** LEVEL UP -> ${lv.level}!  +${lv.statPoints} stat points`);
}
line(`Now: Lv ${profile.level}  (${profile.exp}/${expToNext(profile.level)} EXP)  ` +
     `Energy ${profile.energy}  Unspent points ${profile.statPoints}`);
hr();

// ── Show the avatar sheet ──────────────────────────────────────
line(`AVATAR — ${cls.name}  (boost: ${cls.boost})`);
line(`  Stats: ${Object.entries(stats).map(([k, v]) => `${k} ${v}`).join("  ")}`);
line(`  HP ${derive.maxHP(stats)}  MP ${derive.maxMP(stats)}  ` +
     `Crit ${derive.critChance(stats)}%  Dodge ${derive.dodgeChance(stats)}%`);
line(`  Skills: ${playerSkills.map((s) => SKILLS[s].name).join(", ")}`);
const unlocked = unlockedHiddenClasses(stats);
line(`  Hidden classes unlocked: ${unlocked.length ? unlocked.map((h) => h.name).join(", ") : "none yet"}`);
hr();

// ── A simple player AI policy for the demo ─────────────────────
// Prefer the class skill when MP allows and an enemy is alive; else attack.
function policy(player, enemies) {
  const target = enemies.findIndex((e) => e.hp > 0);
  const skillId = playerSkills[0];
  const skill = SKILLS[skillId];
  if (skill && player.mp >= skill.cost && Math.random() < 0.6) {
    return { kind: "skill", skillId, targetIndex: target };
  }
  return { kind: "attack", targetIndex: target };
}

// Renderer: turn engine events into text.
function render(events) {
  for (const e of events) {
    switch (e.type) {
      case "battleStart": line(`  Enemies: ${e.enemies.join(", ")}`); break;
      case "round": line(`  -- round ${e.round} --`); break;
      case "attack": break; // damage event carries the detail
      case "skill": line(`  ${e.actor} uses ${e.skill} (-${e.cost} MP)`); break;
      case "damage":
        line(`    ${e.attacker} hits ${e.target} for ${e.amount}` +
             `${e.crit ? " (CRIT!)" : ""} -> ${e.target} HP ${e.targetHp}` +
             `${e.killed ? "  [DOWN]" : ""}`);
        break;
      case "dodge": line(`    ${e.target} dodged ${e.attacker}'s attack!`); break;
      case "heal": line(`    ${e.target} heals ${e.amount} -> HP ${e.targetHp}`); break;
      case "status": line(`    ${e.target} is ${e.status}!`); break;
      case "stunnedSkip": line(`    ${e.actor} is stunned and loses a turn.`); break;
      case "flee": line(`  Flee ${e.success ? "succeeded" : "failed"}.`); break;
      case "battleEnd": break;
      default: break;
    }
  }
}

// ── Fight a single combat wave (wave 1 of floor 1) ─────────────
line("DUNGEON — Floor 1");
line(`  Type: ${floorType(1)}   Energy cost: ${energyCost(1)}`);
const { waves } = buildWaves(1, rng);
line(`  Waves this floor: ${waves.length}`);
hr();

line("Fighting Wave 1...");
const player = makeCombatant({ name: "You (Knight)", stats, skills: playerSkills, isPlayer: true });
const enemyDefs = waves[0];
const enemyCombatants = enemyDefs.map((d) => {
  const c = makeCombatant({ name: d.name, stats: d.stats });
  c.xp = d.xp; c.gold = d.gold;
  return c;
});

const result = runBattle({ player, enemies: enemyCombatants, choose: policy, rng });
render(result.events);
hr();
line(`Result: ${result.outcome.toUpperCase()}`);
line(`  Player HP: ${result.playerHp}/${player.maxHP}   MP: ${result.playerMp}/${player.maxMP}`);

if (result.outcome === "victory") {
  const dungeonXp = Math.round(result.xp * TUNING.dungeonXpFactor);
  line(`  Loot: +${dungeonXp} EXP (dungeon x${TUNING.dungeonXpFactor})  +${result.gold} gold`);
  res = gainExp(profile, dungeonXp);
  profile = res.profile;
  profile.gold += result.gold;
} else if (result.outcome === "defeat") {
  // Death penalty: lose loot, halve EXP earned that run, lose energy.
  line("  DEFEAT penalty: loot lost, run EXP halved, energy spent is gone.");
}
line(`  Profile: Lv ${profile.level}  EXP ${profile.exp}/${expToNext(profile.level)}  ` +
     `Gold ${profile.gold}  Energy ${profile.energy}`);
hr();

// ── Demo: a maxed-STR build auto-unlocks Juggernaut ────────────
const heavy = { STR: 1000, END: 50, AGI: 30, VIT: 40, INT: 10, CHA: 10, LUK: 60 };
line("Hidden-class check on a 1000-STR build:");
line(`  -> ${unlockedHiddenClasses(heavy).map((h) => h.name).join(", ") || "none"}`);
line("════════════════════════  done  ════════════════════════════");

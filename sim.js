// Text-based demo driver — proves the engine works end to end.
// Run: npm run sim   (or: node sim.js)
//
// This is the V1 "Text UI": it consumes engine events and prints them.
// A graphical UI (V2) would consume the SAME events and draw instead.

import { startingStatsFor, BASE_CLASSES, unlockedHiddenClasses } from "./engine/classes.js";
import { runFloor } from "./engine/dungeon.js";
import { floorType, energyCost } from "./engine/floors.js";
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
      // floor-level events
      case "floorStart":
        line(`  >> Floor ${e.floor} [${e.floorType}] — ${e.waves} wave(s), costs ${e.energyCost} Energy`);
        break;
      case "waveStart": line(`  === WAVE ${e.wave}/${e.of} ===`); break;
      case "waveCleared":
        line(`  Wave ${e.wave} cleared. +${e.xp} xp +${e.gold}g  ` +
             `(HP ${e.playerHp}, MP ${e.playerMp})`);
        break;
      case "recover": line(`  ...recover +${e.hp} HP / +${e.mp} MP`); break;
      case "floorCleared":
        line(`  >> FLOOR CLEARED — raw ${e.rawXp} xp -> ${e.awardedXp} xp (dungeon rate), ${e.gold}g`);
        break;
      case "floorDefeat":
        line(`  >> DEFEATED on wave ${e.wave}. Loot lost; EXP halved to ${e.xpHalvedTo}.`);
        break;
      case "floorFled": line(`  >> Fled floor ${e.floor} on wave ${e.wave}.`); break;
      case "treasure": line(`  Treasure! +${e.gold} gold`); break;
      case "rest": line(`  Rest floor — fully healed.`); break;
      case "floorBlocked": line(`  Not enough Energy (need ${e.need}, have ${e.have}).`); break;
      default: break;
    }
  }
}

// ── Run a FULL floor (all 10 waves) ────────────────────────────
const FLOOR = 1;
line(`DUNGEON — Floor ${FLOOR}`);
line(`  Type: ${floorType(FLOOR)}   Energy cost: ${energyCost(FLOOR)}   You have: ${profile.energy} Energy`);
hr();

const floorResult = runFloor({
  floor: FLOOR,
  stats,
  skills: playerSkills,
  choose: policy,
  rng,
  energy: profile.energy,
});
render(floorResult.events);
hr();

line(`Floor result: ${floorResult.outcome.toUpperCase()}  ` +
     `(${floorResult.wavesCleared} waves cleared)`);
line(`  Final HP: ${floorResult.player.hp}/${floorResult.player.maxHP}   ` +
     `MP: ${floorResult.player.mp}/${floorResult.player.maxMP}`);

// Apply outcomes to the profile.
profile.energy -= floorResult.energySpent;
profile.gold += floorResult.gold;
if (floorResult.xp > 0) {
  res = gainExp(profile, floorResult.xp);
  profile = res.profile;
  for (const lv of res.levelsGained) {
    line(`  *** LEVEL UP -> ${lv.level}!  +${lv.statPoints} stat points`);
  }
}
if (floorResult.outcome === "defeat") {
  line("  DEFEAT penalty applied: loot lost, run EXP halved, energy spent gone.");
}
line(`  Rewards: +${floorResult.xp} EXP  +${floorResult.gold} gold  ` +
     `(-${floorResult.energySpent} Energy)`);
line(`  Profile: Lv ${profile.level}  EXP ${profile.exp}/${expToNext(profile.level)}  ` +
     `Gold ${profile.gold}  Energy ${profile.energy}`);
hr();

// ── Demo: a maxed-STR build auto-unlocks Juggernaut ────────────
const heavy = { STR: 1000, END: 50, AGI: 30, VIT: 40, INT: 10, CHA: 10, LUK: 60 };
line("Hidden-class check on a 1000-STR build:");
line(`  -> ${unlockedHiddenClasses(heavy).map((h) => h.name).join(", ") || "none"}`);
line("════════════════════════  done  ════════════════════════════");

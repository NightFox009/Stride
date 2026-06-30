// Pure turn-based combat engine. No graphics, no I/O.
// Two ways to drive it:
//   • createBattle(...) — a steppable controller that pauses for the player's
//     action each turn (used by the interactive in-app dungeon).
//   • runBattle(...)    — auto-resolves a whole battle with a choose() policy
//     (used by the text sim and the balance harness). It's a thin wrapper over
//     createBattle, so both paths share one rulebook.
//
// A UI renders the emitted events — the engine itself never prints.

import { derive, MIN_HIT_CHANCE } from "./stats.js";
import { SKILLS } from "./skills.js";
import { createRng } from "./rng.js";

// Build a live combatant from a stat block. `bonuses` are flat gold-upgrade
// additions to derived attributes (attack, critChance, critMult, defense,
// magicDefense, lifesteal, speed); maxHP/hpRegen bonuses arrive via bonusHP and
// the between-wave recovery instead.
export function makeCombatant({ name, stats, skills = [], skillLevels = {}, primaryStat = "STR", isPlayer = false, hp = null, bonusHP = 0, bonuses = {} }) {
  const maxHP = (hp != null ? hp : derive.maxHP(stats)) + bonusHP;
  return {
    name,
    stats,
    isPlayer,
    skills,
    skillLevels,
    primaryStat,
    bonuses,
    hp: maxHP,
    maxHP,
    mp: derive.maxMP(stats),
    maxMP: derive.maxMP(stats),
    guard: false,
    stunned: false,
  };
}

const isAlive = (c) => c.hp > 0;

// Turn order: derived Speed plus any Haste upgrade.
const effSpeed = (c) => derive.speed(c.stats) + (c.bonuses?.speed || 0);

// Core damage application — shared by attacks and skills.
function dealDamage(rng, attacker, target, rawAmount, type, opts = {}) {
  // Hit check: the attacker's Accuracy vs the target's Evasion. Monsters with
  // high Evasion make your attacks miss unless you have the Accuracy to land.
  const hitChance = Math.max(
    MIN_HIT_CHANCE,
    derive.accuracy(attacker.stats) - derive.evasion(target.stats)
  );
  if (!rng.chance(hitChance)) {
    return { type: "miss", attacker: attacker.name, target: target.name };
  }
  const ab = attacker.bonuses || {};
  const tb = target.bonuses || {};
  // Flat Power upgrade adds to every hit (basic attacks AND skills).
  let amount = rawAmount + (type === "magic" ? (ab.magicAttack || 0) : (ab.attack || 0));
  const crit = derive.critChance(attacker.stats) + (opts.critBonus || 0) + (ab.critChance || 0);
  const isCrit = rng.chance(crit);
  if (isCrit) amount *= derive.critMult(attacker.stats) + (ab.critMult || 0);
  // Mitigation: physical hits are reduced by Defense, magic by Magic Defense.
  const def = (type === "magic" ? derive.magicDefense(target.stats) + (tb.magicDefense || 0)
                                : derive.defense(target.stats) + (tb.defense || 0));
  amount *= 100 / (100 + Math.max(0, def));
  if (target.guard) amount *= 0.5;
  amount = Math.max(1, Math.round(amount));
  target.hp = Math.max(0, target.hp - amount);
  // Lifesteal: heal the attacker for a fraction of damage dealt.
  if (ab.lifesteal > 0 && amount > 0) {
    attacker.hp = Math.min(attacker.maxHP, attacker.hp + Math.max(1, Math.round(amount * ab.lifesteal)));
  }
  return {
    type: "damage",
    attacker: attacker.name,
    target: target.name,
    amount,
    crit: isCrit,
    dmgType: type,
    targetHp: target.hp,
    killed: target.hp <= 0,
  };
}

function heal(target, amount) {
  const before = target.hp;
  target.hp = Math.min(target.maxHP, target.hp + amount);
  return { type: "heal", target: target.name, amount: target.hp - before, targetHp: target.hp };
}

// Simple enemy AI: attack a random living player-side target.
function enemyAction(rng, enemy, players) {
  const targets = players.filter(isAlive);
  if (targets.length === 0) return null;
  const target = rng.pick(targets);
  return dealDamage(rng, enemy, target, derive.attack(enemy.stats, enemy.primaryStat), "physical");
}

function firstAlive(enemies) {
  const i = enemies.findIndex(isAlive);
  return i === -1 ? 0 : i;
}

function basicAttack(rng, player, enemies, targetIndex, emit) {
  const idx = isAlive(enemies[targetIndex]) ? targetIndex : firstAlive(enemies);
  const target = enemies[idx];
  if (!target) return;
  emit({ type: "attack", actor: player.name, target: target.name });
  emit(dealDamage(rng, player, target, derive.attack(player.stats, player.primaryStat), "physical"));
}

function resolveTargets(targetType, player, enemies, targetIndex) {
  if (targetType === "self") return [player];
  if (targetType === "all") return enemies.filter(isAlive);
  const idx = isAlive(enemies[targetIndex]) ? targetIndex : firstAlive(enemies);
  return [enemies[idx]].filter(Boolean);
}

// Apply one player action, emitting events. Returns "fled" if a flee succeeded.
function performPlayerAction(rng, player, enemies, action, emit) {
  if (action.kind === "flee") {
    if (rng.chance(derive.fleeChance(player.stats))) {
      emit({ type: "flee", success: true });
      return "fled";
    }
    emit({ type: "flee", success: false });
    return null;
  }

  if (action.kind === "skill") {
    const skill = SKILLS[action.skillId];
    if (!skill) {
      emit({ type: "error", msg: `no skill ${action.skillId}` });
      return null;
    }
    if (player.mp < skill.cost) {
      emit({ type: "outOfMp", skill: skill.name });
      basicAttack(rng, player, enemies, action.targetIndex, emit);
      return null;
    }
    player.mp -= skill.cost;
    emit({ type: "skill", actor: player.name, skill: skill.name, cost: skill.cost });
    const targets = resolveTargets(skill.target, player, enemies, action.targetIndex);
    // Skill level scales its power: +12% per rank above 1 (damage and healing).
    const lvl = (player.skillLevels && player.skillLevels[skill.id]) || 1;
    const power = 1 + 0.12 * (lvl - 1);
    const ctx = {
      user: player,
      targets,
      rng,
      power,
      dealDamage: (u, t, amt, ty, o) => dealDamage(rng, u, t, amt * power, ty, o),
      heal: (t, amt) => heal(t, Math.round(amt * power)),
    };
    for (const ev of skill.effect(ctx)) emit(ev);
    return null;
  }

  // default: basic attack
  basicAttack(rng, player, enemies, action.targetIndex, emit);
  return null;
}

// ── Steppable battle controller ────────────────────────────────
// advance() processes turns until it's the player's turn (returns awaiting:true)
// or the battle ends. submit(action) applies the player's choice then advances.
// All emitted events accumulate in `log`; each call also returns just the new
// events so a UI can append incrementally.
export function createBattle({ player, enemies, rng = createRng(), maxRounds = 100 }) {
  const log = [];
  let round = 0;
  let queue = [];
  let outcome = null;
  let started = false;

  const enemiesAlive = () => enemies.some(isAlive);

  function advance() {
    const fresh = [];
    const emit = (e) => { log.push(e); fresh.push(e); return e; };

    if (!started) {
      started = true;
      emit({ type: "battleStart", enemies: enemies.map((e) => e.name) });
    }

    while (true) {
      if (!isAlive(player)) { outcome = "defeat"; emit({ type: "battleEnd", outcome }); break; }
      if (!enemiesAlive()) { outcome = "victory"; emit({ type: "battleEnd", outcome }); break; }
      if (round >= maxRounds) { outcome = "timeout"; emit({ type: "battleEnd", outcome }); break; }

      if (queue.length === 0) {
        round++;
        emit({ type: "round", round });
        queue = [player, ...enemies]
          .filter(isAlive)
          .sort((a, b) => effSpeed(b) - effSpeed(a));
      }

      const actor = queue.shift();
      if (!actor || !isAlive(actor)) continue;
      if (actor.stunned) {
        actor.stunned = false;
        emit({ type: "stunnedSkip", actor: actor.name });
        continue;
      }

      if (actor.isPlayer) {
        actor.guard = false; // guard only lasts until your next turn
        return { events: fresh, awaiting: true, outcome: null };
      }

      actor.guard = false;
      const ev = enemyAction(rng, actor, [player]);
      if (ev) emit(ev);
    }

    return { events: fresh, awaiting: false, outcome };
  }

  function submit(action) {
    const fresh = [];
    const emit = (e) => { log.push(e); fresh.push(e); return e; };

    const act = action || { kind: "attack", targetIndex: firstAlive(enemies) };
    const res = performPlayerAction(rng, player, enemies, act, emit);
    if (res === "fled") {
      outcome = "fled";
      emit({ type: "battleEnd", outcome });
      return { events: fresh, awaiting: false, outcome };
    }

    const cont = advance();
    return { events: [...fresh, ...cont.events], awaiting: cont.awaiting, outcome: cont.outcome };
  }

  function result() {
    return {
      outcome,
      events: log,
      playerHp: player.hp,
      playerMp: player.mp,
      xp: outcome === "victory" ? enemies.reduce((s, e) => s + (e.xp || 0), 0) : 0,
      gold: outcome === "victory" ? enemies.reduce((s, e) => s + (e.gold || 0), 0) : 0,
    };
  }

  return {
    player,
    enemies,
    advance,
    submit,
    result,
    get outcome() { return outcome; },
    get log() { return log; },
  };
}

// `choose(player, enemies, rng)` is a policy returning an action:
//   { kind: "attack", targetIndex }
//   { kind: "skill", skillId, targetIndex }
//   { kind: "flee" }
// Auto-resolves the whole battle (sim/balance path).
export function runBattle({ player, enemies, choose, rng = createRng(), maxRounds = 100 }) {
  const battle = createBattle({ player, enemies, rng, maxRounds });
  let step = battle.advance();
  while (step.awaiting) {
    step = battle.submit(choose(player, enemies, rng));
  }
  return battle.result();
}

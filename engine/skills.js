// Starter skill set. Each skill is pure data + a small effect function.
// effect(ctx) -> returns an array of event objects describing what happened.
//
// ctx = { user, targets, rng, log }
//   user.combat   = live combat state (hp, mp, ...)
//   targets[]     = enemy combat states
//
// Damage helper lives in combat.js (applyDamage). Skills call it via ctx.

export const SKILLS = {
  // ── Knight (STR) ─────────────────────────────────────────────
  shield_bash: {
    id: "shield_bash",
    name: "Shield Bash",
    cost: 6,
    target: "single",
    describe: "Heavy STR strike; may stun.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const dmg = ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 2.6, "physical");
      const events = [dmg];
      if (ctx.rng.chance(25)) {
        t.stunned = true;
        events.push({ type: "status", target: t.name, status: "stunned" });
      }
      return events;
    },
  },

  // ── Sentinel (VIT) ───────────────────────────────────────────
  bulwark: {
    id: "bulwark",
    name: "Bulwark",
    cost: 5,
    target: "self",
    describe: "Raise guard: halve incoming damage next turn.",
    effect: (ctx) => {
      ctx.user.guard = true;
      return [{ type: "buff", target: ctx.user.name, buff: "guard" }];
    },
  },

  // ── Monk (END) ───────────────────────────────────────────────
  flurry: {
    id: "flurry",
    name: "Flurry",
    cost: 7,
    target: "single",
    describe: "Three rapid STR hits.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const events = [];
      for (let i = 0; i < 3; i++) {
        if (t.hp <= 0) break;
        events.push(ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 1.1, "physical"));
      }
      return events;
    },
  },

  // ── Ranger (AGI) ─────────────────────────────────────────────
  quick_shot: {
    id: "quick_shot",
    name: "Quick Shot",
    cost: 5,
    target: "single",
    describe: "AGI-scaling shot with high crit.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      return [ctx.dealDamage(ctx.user, t, ctx.user.stats.AGI * 2.2, "physical", { critBonus: 20 })];
    },
  },

  // ── Scholar (INT) ────────────────────────────────────────────
  arcane_bolt: {
    id: "arcane_bolt",
    name: "Arcane Bolt",
    cost: 6,
    target: "single",
    describe: "Magic damage scaling with INT.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      return [ctx.dealDamage(ctx.user, t, ctx.user.stats.INT * 2.8, "magic")];
    },
  },

  // ── Herald (CHA) ─────────────────────────────────────────────
  rally: {
    id: "rally",
    name: "Rally",
    cost: 6,
    target: "self",
    describe: "Heal self based on CHA + VIT.",
    effect: (ctx) => {
      const amount = Math.round(ctx.user.stats.CHA * 2 + ctx.user.stats.VIT);
      return [ctx.heal(ctx.user, amount)];
    },
  },

  // ── Wanderer (LUK) ───────────────────────────────────────────
  wild_gamble: {
    id: "wild_gamble",
    name: "Wild Gamble",
    cost: 6,
    target: "single",
    describe: "Damage swings wildly with LUK — feast or fizzle.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const roll = ctx.rng.next(); // 0..1
      const mult = 0.5 + roll * (1.5 + ctx.user.stats.LUK * 0.05);
      return [ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 2 * mult, "physical")];
    },
  },

  // ── Hidden: Juggernaut (1000 STR) ────────────────────────────
  earthshatter: {
    id: "earthshatter",
    name: "Earthshatter",
    cost: 14,
    target: "all",
    describe: "AoE STR damage to every enemy.",
    effect: (ctx) => {
      return ctx.targets
        .filter((t) => t.hp > 0)
        .map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 1.8, "physical"));
    },
  },
};

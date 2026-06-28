// Starter skill set. Each skill is pure data + a small effect function.
// effect(ctx) -> returns an array of event objects describing what happened.
//
// DESIGN PRINCIPLE: every base class's signature skill scales off the SAME stat
// that class boosts. So investing your stat points into your class stat always
// increases your power — this is what makes all 7 classes viable.
//
// ctx = { user, targets, rng, dealDamage, heal }

export const SKILLS = {
  // ── Knight (STR) ─────────────────────────────────────────────
  shield_bash: {
    id: "shield_bash", name: "Shield Bash", cost: 5, target: "single",
    describe: "Heavy STR strike; may stun.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const events = [ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 2.4, "physical")];
      if (ctx.rng.chance(20)) { t.stunned = true; events.push({ type: "status", target: t.name, status: "stunned" }); }
      return events;
    },
  },

  // ── Sentinel (VIT) — damage + self-guard ─────────────────────
  aegis_strike: {
    id: "aegis_strike", name: "Aegis Strike", cost: 5, target: "single",
    describe: "VIT damage and raise guard (halve next hit).",
    effect: (ctx) => {
      ctx.user.guard = true;
      return [
        { type: "buff", target: ctx.user.name, buff: "guard" },
        ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.VIT * 2.2, "physical"),
      ];
    },
  },

  // ── Monk (END) — three rapid hits scaling END ────────────────
  flurry: {
    id: "flurry", name: "Flurry", cost: 6, target: "single",
    describe: "Three rapid END-scaling hits.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const events = [];
      for (let i = 0; i < 3; i++) {
        if (t.hp <= 0) break;
        events.push(ctx.dealDamage(ctx.user, t, ctx.user.stats.END * 1.0, "physical"));
      }
      return events;
    },
  },

  // ── Ranger (AGI) — high-crit AGI shot ────────────────────────
  quick_shot: {
    id: "quick_shot", name: "Quick Shot", cost: 5, target: "single",
    describe: "AGI-scaling shot with high crit.",
    effect: (ctx) => [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.AGI * 2.6, "physical", { critBonus: 20 })],
  },

  // ── Scholar (INT) — magic bolt ───────────────────────────────
  arcane_bolt: {
    id: "arcane_bolt", name: "Arcane Bolt", cost: 6, target: "single",
    describe: "Magic damage scaling with INT.",
    effect: (ctx) => [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.INT * 2.6, "magic")],
  },

  // ── Herald (CHA) — commanding strike ─────────────────────────
  cutting_words: {
    id: "cutting_words", name: "Cutting Words", cost: 5, target: "single",
    describe: "CHA-scaling attack that demoralizes the foe.",
    effect: (ctx) => [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.CHA * 2.4, "magic")],
  },

  // ── Herald secondary — heal ──────────────────────────────────
  rally: {
    id: "rally", name: "Rally", cost: 6, target: "self",
    describe: "Heal self based on CHA + VIT.",
    effect: (ctx) => [ctx.heal(ctx.user, Math.round(ctx.user.stats.CHA * 2 + ctx.user.stats.VIT))],
  },

  // ── Wanderer (LUK) — feast-or-fizzle gamble ──────────────────
  wild_gamble: {
    id: "wild_gamble", name: "Wild Gamble", cost: 5, target: "single",
    describe: "Damage swings wildly with LUK — feast or fizzle.",
    effect: (ctx) => {
      const roll = ctx.rng.next();
      const mult = 0.5 + roll * (1.5 + ctx.user.stats.LUK * 0.05);
      return [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.LUK * 2.0 * mult, "physical")];
    },
  },

  // ── Hidden: Juggernaut (1000 STR) ────────────────────────────
  earthshatter: {
    id: "earthshatter", name: "Earthshatter", cost: 12, target: "all",
    describe: "AoE STR damage to every enemy.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 1.8, "physical")),
  },
};

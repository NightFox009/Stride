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

  // ════════════════════════════════════════════════════════════
  // Tier skills — learned with skill points at level thresholds.
  // Each still scales off its class's signature stat (design principle).
  // ════════════════════════════════════════════════════════════

  // ── Knight (STR) ──
  power_strike: {
    id: "power_strike", name: "Power Strike", cost: 8, target: "single",
    describe: "A devastating single STR blow.",
    effect: (ctx) => [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.STR * 3.6, "physical")],
  },
  whirlwind: {
    id: "whirlwind", name: "Whirlwind", cost: 12, target: "all",
    describe: "Sweeping STR damage to every enemy.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 2.1, "physical")),
  },

  // ── Sentinel (VIT) ──
  bulwark: {
    id: "bulwark", name: "Bulwark", cost: 8, target: "single",
    describe: "VIT strike, raise guard, and mend a little.",
    effect: (ctx) => {
      ctx.user.guard = true;
      return [
        { type: "buff", target: ctx.user.name, buff: "guard" },
        ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.VIT * 2.0, "physical"),
        ctx.heal(ctx.user, Math.round(ctx.user.stats.VIT)),
      ];
    },
  },
  retribution: {
    id: "retribution", name: "Retribution", cost: 12, target: "single",
    describe: "Heavy VIT damage that heals you for part of it.",
    effect: (ctx) => {
      const dmg = ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.VIT * 3.0, "physical");
      return [dmg, ctx.heal(ctx.user, Math.round((dmg.amount || 0) * 0.4))];
    },
  },

  // ── Monk (END) ──
  iron_palm: {
    id: "iron_palm", name: "Iron Palm", cost: 8, target: "single",
    describe: "A focused END strike that often stuns.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const events = [ctx.dealDamage(ctx.user, t, ctx.user.stats.END * 3.2, "physical")];
      if (ctx.rng.chance(35)) { t.stunned = true; events.push({ type: "status", target: t.name, status: "stunned" }); }
      return events;
    },
  },
  thousand_fists: {
    id: "thousand_fists", name: "Thousand Fists", cost: 12, target: "all",
    describe: "A flurry of END blows to all enemies.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.END * 1.7, "physical")),
  },

  // ── Ranger (AGI) ──
  double_tap: {
    id: "double_tap", name: "Double Tap", cost: 8, target: "single",
    describe: "Two AGI shots with high crit.",
    effect: (ctx) => {
      const t = ctx.targets[0];
      const events = [];
      for (let i = 0; i < 2; i++) {
        if (t.hp <= 0) break;
        events.push(ctx.dealDamage(ctx.user, t, ctx.user.stats.AGI * 1.9, "physical", { critBonus: 15 }));
      }
      return events;
    },
  },
  arrow_storm: {
    id: "arrow_storm", name: "Arrow Storm", cost: 12, target: "all",
    describe: "A volley of AGI arrows hitting all foes.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.AGI * 1.9, "physical")),
  },

  // ── Scholar (INT) ──
  frost_lance: {
    id: "frost_lance", name: "Frost Lance", cost: 8, target: "single",
    describe: "A piercing INT magic bolt.",
    effect: (ctx) => [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.INT * 3.6, "magic")],
  },
  meteor: {
    id: "meteor", name: "Meteor", cost: 14, target: "all",
    describe: "Devastating INT magic to all enemies.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.INT * 2.3, "magic")),
  },

  // ── Herald (CHA) ──
  inspire: {
    id: "inspire", name: "Inspire", cost: 8, target: "self",
    describe: "Rousing words restore a large amount of HP.",
    effect: (ctx) => [ctx.heal(ctx.user, Math.round(ctx.user.stats.CHA * 3 + ctx.user.stats.VIT))],
  },
  anthem: {
    id: "anthem", name: "Battle Anthem", cost: 12, target: "all",
    describe: "A soaring CHA anthem that wounds all foes.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.CHA * 1.9, "magic")),
  },

  // ── Wanderer (LUK) ──
  lucky_strike: {
    id: "lucky_strike", name: "Lucky Strike", cost: 8, target: "single",
    describe: "A LUK strike that almost always crits.",
    effect: (ctx) => [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.LUK * 2.8, "physical", { critBonus: 30 })],
  },
  fortunes_wheel: {
    id: "fortunes_wheel", name: "Fortune's Wheel", cost: 12, target: "single",
    describe: "Spin fate — LUK damage that can be enormous.",
    effect: (ctx) => {
      const roll = ctx.rng.next();
      const mult = 0.7 + roll * (2.2 + ctx.user.stats.LUK * 0.06);
      return [ctx.dealDamage(ctx.user, ctx.targets[0], ctx.user.stats.LUK * 2.4 * mult, "magic")];
    },
  },

  // ── Hidden: Juggernaut (1000 STR) ────────────────────────────
  earthshatter: {
    id: "earthshatter", name: "Earthshatter", cost: 12, target: "all",
    describe: "AoE STR damage to every enemy.",
    effect: (ctx) => ctx.targets.filter((t) => t.hp > 0).map((t) => ctx.dealDamage(ctx.user, t, ctx.user.stats.STR * 1.8, "physical")),
  },
};

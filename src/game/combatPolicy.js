// The auto-battle policy the app uses to resolve dungeon floors. It is the SAME
// policy the balance harness (balance.js) tunes against, so the difficulty you
// experience in-app matches the simulated clear rates.
//
// choose(player, enemies, rng) -> action the combat engine understands.

import { SKILLS } from "../../engine/skills.js";

export function autoPolicy(player, enemies, rng) {
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

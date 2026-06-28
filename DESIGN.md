# Stride — Game Design Document

> An offline-capable mobile RPG where your real-world **steps** power a personal
> human avatar. Walk to earn EXP and Energy, level up, choose your stats, evolve
> your appearance, and descend a 100-floor turn-based dungeon.

Inspired by Genopets, but the character you grow is a **human "you"**, not a pet.

---

## 1. Core Loop

```
Real-world steps ──► EXP      (level up → stat points → grow your avatar)
                 └─► Energy   (the resource spent to attempt dungeon floors)

Dungeon runs ──► smaller EXP (less than walking) + loot + gold
             └─► spends Energy
```

- **Walking is the heart of the game.** Steps are the main EXP source.
- The **dungeon** gives *smaller* EXP than walking, so players still progress by
  walking, but the dungeon is where stats, builds, and loot pay off.
- A sedentary day = limited dungeon progress. An active day = a deep delve.

---

## 2. Platform

- **React Native + Expo** (one codebase, iOS + Android).
- **Steps**: `expo-sensors` Pedometer for live counting; **Apple HealthKit**
  (iOS) and **Health Connect** (Android) for accurate, always-on counts that
  work even when the app is closed.
- **Offline-capable**, syncs when internet is available (local SQLite as source
  of truth; cloud sync layered on later).

### Engine separation (important)
The game logic is a **pure engine** with no graphics and no text. It emits
events. A UI layer renders those events.

```
GAME ENGINE (pure logic)  ── emits events ──►  Text UI (v1)
 stats, skills, combat,                        Graphical UI (v2)
 floors, loot, progression
```

- **v1 = text-based RPG** (fast to build and tune; proves the game is *fun*).
- **v2 = graphical RPG** — same engine, just draws the same events.
- We never rewrite combat to get graphics. We only add a renderer.

---

## 3. Stats (7)

| Stat | Abbr | Role in the dungeon |
|------|------|---------------------|
| Strength  | STR | Physical damage, carry capacity, force doors |
| Endurance | END | Max HP, resist exhaustion, longer runs |
| Agility   | AGI | Attack speed (turn order), dodge, flee chance |
| Vitality  | VIT | Max HP, HP regen, status resistance |
| Intellect | INT | Skill power, max MP, puzzle floors |
| Charisma  | CHA | Better loot/shop prices, recruit NPCs, boss negotiation |
| Luck      | LUK | Crit rate, rare drops, treasure odds, lucky dodges |

### Derived stats (formulas — tuned in the balance pass)
- `maxHP   = 30 + END*6 + VIT*4  (+ 5 per character level)`
- `maxMP   = 20 + INT*5`
- `attack  = STR*3`                  (basic physical power)
- `skillPower = INT*2`               (skill scaling base)
- `critChance = clamp(5 + LUK*0.5, 0, 75)%`
- `critMult   = 1.75`
- `dodgeChance = clamp(AGI*0.4, 0, 60)%`
- `hpRegen = round(VIT*0.5) per floor cleared`
- `fleeChance = clamp(30 + AGI*0.5 + LUK*0.3, 5, 95)%`
- **Turn order** = highest AGI acts first.

> **Class viability rule:** each base class's signature skill scales off the
> stat that class boosts (Knight→STR, Sentinel→VIT, Monk→END, Ranger→AGI,
> Scholar→INT, Herald→CHA, Wanderer→LUK). Investing your stat points into your
> class stat always increases your power — so all 7 classes are viable.

> **Enemy HP is authored per template** (decoupled from the player HP formula)
> so enemy durability can be balanced independently of player stats. Enemy
> `stats` still drive their damage, speed, crit, and dodge.

---

## 4. Progression

- **EXP curve (steep):** `expToNext(level) = round(baseXP * level^1.5)`,
  `baseXP = 100`. Each level needs noticeably more steps.
- **Stat points:** a small amount per normal level (**+3**), with a **big lump
  at milestone levels** (every 10th level: **+10 bonus**). Milestones feel like
  real moments.
- **Steps → EXP:** e.g. `1 EXP per 10 steps` (tunable).
- **Steps → Energy:** e.g. `1 Energy per 100 steps`, capped daily (tunable).
- **Dungeon EXP:** a fraction of an equivalent walk (smaller, as decided).

---

## 5. Avatar Evolution

The human avatar **visually changes** — new appearance, gear, and body changes —
unlocked at **milestone levels** (and class unlocks). Pure cosmetic; driven by
the same level/stat data the engine already tracks.

---

## 6. Classes

A player **chooses one base class at the start**. **Class is permanent** — choose
wisely. (A future **reset item** will allow re-choosing.)

### Base classes (each starts +1 in one stat)
Base stats = **5** in everything, **+1** to the class's signature stat (= 6).

| Class | Boost | Signature skill (starter) |
|-------|-------|---------------------------|
| Knight   | STR | Shield Bash |
| Sentinel | VIT | Bulwark |
| Monk     | END | Flurry |
| Ranger   | AGI | Quick Shot |
| Scholar  | INT | Arcane Bolt |
| Herald   | CHA | Rally |
| Wanderer | LUK | Wild Gamble |

### Hidden classes (unlock automatically when a stat hits **1000**)
Reward focused, single-stat builds.

| Hidden class | Unlock | Skills |
|--------------|--------|--------|
| **Juggernaut** | 1000 STR | *Earthshatter* (AoE STR dmg); *Iron March* (immune to slow/stun) |
| **Immortal**   | 1000 VIT | *Undying* (survive 1 fatal hit/floor at 1 HP); *Regenesis* (heal % HP per floor) |
| **Marathoner** | 1000 END | *Second Wind* (full HP/stamina mid-fight); *Deep Delve* (more rewards the deeper you go) |
| **Phantom**    | 1000 AGI | *Afterimage* (guaranteed dodge X turns); *Flicker Strike* (extra uncounterable attack) |
| **Archon**     | 1000 INT | *Overclock* (skills cost 0 MP briefly); *Insight* (auto-solve puzzle floors) |
| **Sovereign**  | 1000 CHA | *Conscript* (recruit a defeated enemy); *Royal Decree* (boss may surrender) |
| **Fatebinder** | 1000 LUK | *Jackpot* (chance to instantly clear a floor w/ max loot); *Loaded Dice* (re-roll an unlucky outcome) |

### Combo hidden classes (unlock from TWO stats — rarer)
| Combo class | Unlock | Skills |
|-------------|--------|--------|
| **Spellblade** | 750 STR + 750 INT | *Spellstrike* (melee hits trigger spell bursts) |
| **Trickster**  | 750 AGI + 750 LUK | *Sleight* (guaranteed crit while dodging) |

> More classes to be added later.

---

## 7. The Dungeon (100 floors)

Turn-based, skill-selection combat (classic JRPG style).

### On your turn, choose:
- **Attack** — basic, no cost.
- **Skill** — class / hidden-class skills (cost MP, scale with stats).
- **Item** — potions, buffs.
- **Flee** — AGI/LUK-based escape.

Turn order by AGI. Damage/crit (LUK)/dodge (AGI)/HP (END+VIT) all flow from
stats, so your build matters.

### Floor structure
- **Combat & Boss floors = 10 waves each.** Waves 1–9 escalate; wave 10 is a
  mini-elite (or the boss on boss floors).
- **Non-combat floors are single-encounter** (no waves):

| Floor type | What happens |
|------------|--------------|
| Combat   | 10 waves of enemies |
| Elite    | Tougher enemy, better loot |
| Treasure | Loot/gold; LUK boosts rewards |
| Puzzle   | INT-gated; Archon auto-solves |
| Event    | Risk/reward choice; CHA/LUK influence |
| Rest     | Heal, upgrade a skill |
| Boss     | Every 10th floor (10, 20 … 100) |

- **Checkpoints at each boss** (floors 10, 20, …) so you don't restart from
  floor 1.

### Death / failure penalty
When you lose a run:
- **Loot earned that run is lost.**
- **EXP earned that run is halved.**
- **Energy spent is lost.**

(Forgiving enough to keep walking worthwhile, punishing enough to respect builds.)

---

## 8. Roadmap

1. **Engine v1 (text):** stats, classes, skills, turn-based combat, waves, floors,
   progression, loot — fully testable in the terminal. ✅ done
2. **Balance pass:** tune formulas, EXP/Energy rates, the 100-floor curve. ✅ done
   (driven by `balance.js`, a harness that simulates many runs and reports
   clear rates). Current curve: Lv3 clears Floor 1 ~75%, Lv5 ~99%; Floor 10
   boss is a gate (~35% at Lv18, opens up by Lv25); all 7 classes 99–100% on
   Floor 1 at Lv5.
3. **React Native app shell:** pedometer/HealthKit/Health Connect integration,
   local SQLite, the core walk→EXP→Energy loop.
4. **Text UI in-app**, then **graphical UI (v2)** on the same engine.
5. **Sync layer**, avatar art, more classes, reset item, social/leaderboards.

---

## 9. Open items / future
- Exact tuning of all formulas and rates.
- Status effects system (stun, slow, poison, buffs).
- Items/equipment system and inventory.
- More base & hidden classes.
- Background step accuracy strategy per platform.

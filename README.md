# Stride

An offline-capable mobile RPG where your real-world **steps** power a personal
human avatar. Walk to earn EXP and Energy, level up, invest stat points, evolve
your appearance, and descend a 100-floor turn-based dungeon.

Think Genopets — but the character you grow is **you**, not a pet.

See **[DESIGN.md](./DESIGN.md)** for the full design.

## Status: engine prototype (text v1)

The game logic is a **pure engine** (no graphics, no I/O). It emits events; a UI
renders them. Today that UI is text; later it'll be a graphical React Native app
on the *same* engine.

```
engine/
  stats.js        7 stats + derived-stat formulas
  classes.js      base classes (+1 stat) and hidden classes (unlock at 1000)
  skills.js       starter skill set
  enemies.js      starter enemy roster + a boss, with depth scaling
  combat.js       turn-based combat engine (events out, no printing)
  floors.js       100-floor layout, 10-wave combat floors, energy cost
  progression.js  EXP curve, stat points, steps -> EXP/Energy
  rng.js          seedable RNG (reproducible combat)
sim.js            text demo that drives the engine end to end
```

## Try it

```bash
node sim.js          # default seed
node sim.js 7        # any seed -> reproducible run
```

You'll see: steps converted to EXP/Energy, level-ups, the avatar sheet, a
turn-based dungeon wave, loot at the reduced dungeon EXP rate, and a hidden-class
unlock check.

## Next

Balance pass → React Native + Expo shell (pedometer / HealthKit / Health
Connect, local SQLite) → in-app text UI → graphical UI → sync, art, more classes.

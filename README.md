# Stride

An offline-capable mobile RPG where your real-world **steps** power a personal
human avatar. Walk to earn EXP, level up, invest stat points, evolve
your appearance, and descend a 100-floor turn-based dungeon (free to attempt
anytime — idle style).

Think Genopets — but the character you grow is **you**, not a pet.

See **[DESIGN.md](./DESIGN.md)** for the full design.

## Status: Expo app shell on the engine (v1)

There's now a runnable **React Native + Expo** app that drives the existing
engine: step tracking (pedometer with a manual fallback), a local offline save,
and the real **walk → EXP → level up → spend stat points** loop.

```bash
npm install
npm start          # Expo dev server — scan the QR with Expo Go (iOS/Android)
npm run web        # or run it in a browser (uses the manual "walk" buttons)
```

On a phone, real steps fuel your avatar automatically. On web/simulator (no
pedometer), the Home screen shows **+100 / +1,000 / +10,000** buttons so the
whole loop is testable without walking.

```
App.js                  provider + loading gate + screen switch
index.js                Expo entry (registerRootComponent)
src/
  game/
    profile.js          save model; steps -> EXP/Energy via the engine
    persistence.js      offline save (AsyncStorage; swappable for SQLite)
  steps/
    useStepSource.js    expo-sensors Pedometer + manual fallback
  state/
    StrideContext.js    app state; the one place steps become progress
  screens/              ClassSelect / Home / Stats
  components/ theme.js  shared UI
```

The app imports the engine directly, so the phone and the text sim share one
source of truth for all the rules.

## Engine (text v1)

The game logic is a **pure engine** (no graphics, no I/O). It emits events; a UI
renders them. Today that UI is text; later it'll be a graphical React Native app
on the *same* engine.

```
engine/
  stats.js        7 stats + derived-stat formulas
  classes.js      base classes (+1 stat) and hidden classes (unlock at 1000)
  skills.js       starter skill set
  enemies.js      enemy roster (archetypes: swift/brute/tank/trickster…)
  zones.js        10 biome zones, each with its own pool, elite & boss
  combat.js       turn-based combat engine (events out, no printing)
  floors.js       100-floor layout, 10-wave combat floors, energy cost
  progression.js  EXP curve, stat points, steps -> EXP/Energy
  rng.js          seedable RNG (reproducible combat)
sim.js            text demo that drives the engine end to end
```

## Try it

```bash
node sim.js          # default seed — plays a full floor end to end
node sim.js 7        # any seed -> reproducible run
node balance.js      # simulate many runs, print clear rates per level/floor
node balance.js 500  # more trials = steadier numbers
```

`sim.js` shows: steps converted to EXP/Energy, level-ups, the avatar sheet, a
full 10-wave dungeon floor, loot at the reduced dungeon EXP rate, and a
hidden-class unlock check.

`balance.js` is the tuning harness — it runs each class/level/floor combo many
times and reports clear rates so balance is driven by data, not guesswork.

## Next

Balance pass ✓ → Expo app shell ✓ → in-app dungeon UI ✓ → avatar evolution art ✓
→ advanced jobs ✓ → enemy/biome variety ✓ → shop & equipment / class-change item
→ background step sync (HealthKit / Health Connect) → cloud sync, more classes.

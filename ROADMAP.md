# Stride — Build Roadmap (Idle RPG)

A phased plan to take Stride from its current offline prototype to a launchable,
graphical **idle RPG** (Super Arrow–style auto-battler) where your real human
avatar grows as it auto-descends a dungeon.

> Direction lock: **fully idle**. No step tracking, no energy, no manual combat.
> Tap once → the avatar auto-fights floor after floor, levels up, and gets
> stronger. EXP/loot now come entirely from the dungeon.

## Core loop (LOCKED ✅)

The gameplay/concept layer is complete. The self-driving loop:

1. **Descend** — the avatar auto-fights each floor's waves and presses deeper,
   carrying HP/MP onward. Choose speed (1×/2×/4×).
2. **Earn** — every cleared floor banks EXP, gold, loot, materials, and monster
   cores. EXP → levels → stat points (+ skill points) and flat HP per level.
3. **Die → auto-revive** — on death you keep all XP earned and respawn at full HP
   on the same floor to try again (toggle off to stop on death).
4. **Grow** — spend stat points (or **auto-allocate** on a recommended per-class
   priority; manual allocation always available when auto is off), equip loot (or
   **auto-equip**), learn skills, awaken a job, study the bestiary, and spend
   **gold** on permanent **Upgrades** (Power, Vitality, Guard, Regen, Precision,
   Ferocity, Lifesteal, Haste) — the main gold sink. Builds matter: the 2/3 focus
   cap forces a real spread.

   *Every floor is a fight* (combat/elite/boss — no rest/treasure detours).
5. **Idle** — while away, the real auto-battler **fast-forwards** your climb
   (capped 8h): floors, loot, levels — summarized on return.

Progression gates on **build power**, not time/energy: you climb until your
stats/gear hit a wall, then strengthen and push deeper. Fully hands-off if you
enable auto-allocate + auto-equip + auto-revive.

---

## Where we are today (Phase 0 — done)

- **Engine** (`engine/`): pure ESM combat, stats/attributes, skills, 70 monsters
  across 10 zones, 100-floor layout, loot + crafting, knowledge/bestiary, jobs,
  classes, RNG. Covered by `sim.js` + `balance.js` harnesses.
- **App** (`src/`): Expo SDK 54 RN app — Home, Stats, Dungeon, Inventory,
  Knowledge, Skills, Jobs screens; `StrideContext` state; AsyncStorage save.
- **Recent pivot**: removed energy + camping; dungeon is now a **continuous
  auto-descent**; combat sheet expanded to full attributes (Attack/Defense/
  Magic/Evasion/Accuracy/etc.) with an accuracy-vs-evasion hit system.

---

## Phase 1 — Lock the idle core loop  *(small, ~1–2 weeks)*

Finish the in-flight gameplay changes so the loop is final and fun *before* art.

- [x] **Auto-descent speed control** (1× / 2× / 4×).
- [x] **Remove the death penalty** (no half-EXP on death; keep what you earned).
- [x] **Remove step tracking + banking** — deleted the Steps card, pedometer
      wiring, `applySteps`/`convertSteps`, and the `expo-sensors` dep. EXP = dungeon only.
- [x] **Offline idle climb** — on return, fast-forward the **real** auto-battler
      for time away (≈1 attempt / 1.5 min, capped at 150 attempts / 8h). Advances
      floors, drops loot, levels up. Shown as a "While you were away" card.
      *(Server-authoritative anti-cheat deferred to Phase 3.)*
- [x] **Idle automation (the 4 enhancements):**
  - **Auto-restart on death** — respawn (full HP, same floor) and re-dive; XP from
    each try is kept, so the avatar grinds toward a breakthrough. Stops after 12
    deaths-in-a-row with *no level-up* (truly walled) and nudges you to gear up.
  - **Auto-allocate stat points** — opt-in toggle; spends points on a per-class
    priority (primary → bulk → rest) within the 2/3 focus cap, live and offline.
  - **Auto-equip upgrades** — opt-in toggle; equips strictly-better loot by score.
  - Both automations also run during the offline climb.
- [x] **Balance pass** — all classes ~100% clear at Lv5/Floor1 (Scholar ~80%).
- [ ] **Prestige hook (design only)** — sketch the reset-for-power loop (Phase 4).

**Exit:** ✅ a complete, replayable, fully self-driving idle game on the current
placeholder UI. Concept is **locked** — ready for Phase 2 (art + graphical battler).

---

## Phase 2 — Visual identity & graphical battler  *(large, ~3–6 weeks)*

Turn the text/bars dungeon into a watchable graphical idle battler.

- [ ] **Art direction**: pick a style (pixel-art reads best for an evolving human
      avatar and is the cheapest to produce/animate). Define palette + sizes.
- [ ] **Avatar system**: the human avatar across evolution stages (Lv 1/10/20/
      30/50), equipment overlays (weapon/armor/helm), idle + attack animations.
- [ ] **Monster sprites**: 70 monsters (7 per zone) + elites/bosses.
- [ ] **Backgrounds**: 10 zone parallax backdrops.
- [ ] **Graphical combat scene**: replace the log/bars view with sprites, HP
      bars, floating damage numbers, hit/crit/heal effects. Keep the engine as
      the source of truth — render its events.
- [ ] **UI/UX kit**: cohesive HUD, buttons, panels, fonts, icons.

**Tech to add:** `react-native-reanimated` (animation), `@shopify/react-native-skia`
(2D drawing/effects), `expo-av` (SFX/music), `lottie-react-native` (vector FX).

**Exit:** the dungeon looks like a game; the avatar visibly grows and fights.

---

## Phase 3 — Persistence & (optional) backend  *(medium, ~1–3 weeks)*

Right now the save is local-only (AsyncStorage). Two paths:

- **Path A — Stay offline (simplest):** migrate save to **MMKV**
  (`react-native-mmkv`, very fast) or **expo-sqlite** for a growing save.
  Add export/import + iCloud/Drive backup. No accounts, no servers, no cost.
- **Path B — Go online (needed for cloud save, leaderboards, trading):** add
  **Supabase** (Postgres + Auth + Realtime). Accounts, cloud save sync,
  leaderboards. **Important for idle games:** make offline accrual
  **server-authoritative** (store `last_seen` server-side and compute/validate
  gains on the server) so players can't cheat by changing the device clock.

**Recommendation:** ship Phase 1–2 on **Path A (offline)**, then adopt
**Supabase** when you actually want leaderboards/trading/accounts. Supabase's
free tier is generous (500 MB Postgres, auth, 50k MAU) and it's "just Postgres,"
so you're not locked in.

**Exit:** durable saves; (if Path B) accounts + cloud sync + a leaderboard.

---

## Phase 4 — Meta systems & retention  *(ongoing)*

- [ ] **Prestige/Ascension** (reset for permanent multipliers) — core idle hook.
- [ ] **Daily rewards / login streaks**, achievements, quests.
- [ ] **More content**: zones 11+, more monsters, deeper gear tiers, set bonuses.
- [ ] **Auto-systems**: auto-equip best gear, auto-allocate stat presets.
- [ ] **Events**: limited-time zones/bosses.

---

## Phase 5 — Monetization & launch  *(medium)*

- [ ] **IAP** via **RevenueCat** (cosmetics, offline-time extension, gem packs,
      "remove ads"). RevenueCat free up to ~$2.5k/mo revenue.
- [ ] **Rewarded ads** via **Google AdMob** (optional, idle games monetize well
      with "2× offline rewards / speed boost" rewarded video).
- [ ] **Crash/analytics**: **Sentry** + a product-analytics tool.
- [ ] **Store prep**: icon, screenshots, trailer, ASO copy, age rating.
- [ ] **Beta**: TestFlight (iOS) + Play internal testing; build with **EAS Build**.
- [ ] **Launch** on App Store + Google Play.

---

## Phase 6 — Social / multiplayer  *(optional, needs Path B)*

- [ ] Trading (the earlier ask — requires a server + anti-fraud).
- [ ] Guilds/co-op, PvP leaderboards, seasons.

---

## Free / low-cost AI tools

### Character, sprites & monster art
| Tool | Best for | Free? |
|---|---|---|
| **PixelLab** | Pixel-art characters, sprite sheets, **animation**; Aseprite plugin | Free tier |
| **Leonardo.ai** | High-quality character art, game assets, consistent characters | Free daily credits |
| **Scenario.gg** | Train a custom style for consistent game art | Limited free |
| **Stable Diffusion + ComfyUI / Krita AI** | Fully free, total control, run locally | 100% free (local) |
| **SEELE AI / Sprite-AI / AutoSprite** | Text→sprite sheets, engine-ready | Free tiers |
| **Bing Image Creator (DALL·E)** | Quick concept art | Free |
| **Rosebud AI** | Generate reusable sprite sheets | Free tier |

> For an *evolving human avatar* with equipment layers, **pixel art is the
> sweet spot**: cheap to generate, easy to animate, and layers cleanly. Use
> PixelLab/Aseprite for the avatar + a consistent-style generator (Leonardo or a
> trained Scenario model) for monsters so the roster looks unified.

### UI/UX design
| Tool | Best for | Free? |
|---|---|---|
| **Google Stitch** | Prompt/sketch → mobile UI screens | Free (monthly credits) |
| **Penpot** | Open-source Figma alternative, self-hostable | 100% free |
| **Figma** (free tier) | Industry standard, big plugin/AI ecosystem | Free tier |
| **Uizard / Visily** | Wireframe/prototype from text | Free tiers |
| **Lunacy (Icons8)** | Free desktop design + built-in asset libraries | Free |

### Audio (free)
- **SFX/music libraries:** Freesound, OpenGameArt, Kenney.nl (also free art).
- **AI music:** Suno / Udio (free tiers) for zone themes.

### Coding agent
- **Claude Code** (what we're using) for engine/app work.

---

## Requirements checklist

### Tech stack (target)
- **App:** Expo SDK 54, React Native, TypeScript (consider migrating), React Navigation.
- **Animation/graphics:** Reanimated, React Native Skia, Lottie.
- **Audio:** expo-av.
- **Local save:** react-native-mmkv (fast) or expo-sqlite.
- **Online (Path B):** Supabase (Postgres + Auth + Realtime/Edge Functions).
- **IAP:** RevenueCat. **Ads:** AdMob. **Crash:** Sentry. **Builds:** EAS Build.

### Accounts / services (cost)
- **Apple Developer Program** — $99/yr (required to ship on iOS).
- **Google Play Developer** — $25 one-time.
- **Supabase / RevenueCat / AdMob / Sentry / Expo EAS** — free tiers to start.

### Roles / skills (even if it's just you + AI)
- Game design & balance · RN/Expo dev · Pixel art/animation · (Backend if Path B)
  · QA/playtesting · ASO/marketing.

### Legal / store
- Privacy policy + terms (required by both stores), age rating, GDPR/COPPA
  considerations if targeting minors, ad/IAP disclosures.

---

## Suggested order of attack

1. **Phase 1** (lock the idle loop — quick, high impact).
2. **Phase 2** (art + graphical battler — the biggest visible leap).
3. **Phase 3 Path A** (solid local save) → adopt **Supabase** only when you need
   accounts/leaderboards.
4. **Phase 4–5** (retention + monetization) → soft launch.

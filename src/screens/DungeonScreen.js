// Dungeon: a continuous, idle-style descent. Tap Descend and your character
// auto-fights floor after floor, carrying HP/MP onward, until they fall (or you
// retreat). Each cleared floor banks its rewards immediately. The engine session
// (engine/dungeonSession.js) holds combat state; this screen renders snapshots
// and drives the auto-descent loop. (Combat is auto today; this is the seam
// where a future graphical idle battler will plug in.)

import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { floorType } from "../../engine/floors.js";
import { zoneName } from "../../engine/zones.js";
import { RARITIES, statLabel } from "../../engine/items.js";
import { MATERIALS } from "../../engine/crafting.js";
import ProgressBar from "../components/ProgressBar.js";
import { colors, spacing } from "../theme.js";

const FLOOR_BLURB = {
  combat: "Combat — 10 waves of monsters.",
  elite: "Elite — a single dangerous foe.",
  boss: "Boss — 9 waves, then the warlord.",
  treasure: "Treasure — no fight, just loot.",
  rest: "Rest — recover and move on.",
};
const COMBAT_FLOORS = new Set(["combat", "elite", "boss"]);

function emptyRun(floor) {
  return { startFloor: floor, deepest: floor, floorsCleared: 0, xp: 0, gold: 0, loot: [], levels: [] };
}

function formatEvent(e, playerName = "You") {
  switch (e.type) {
    case "waveStart": return { text: `— Wave ${e.wave}/${e.of} —`, tone: "head" };
    case "skill": return { text: `${e.actor} uses ${e.skill} (${e.cost} MP)`, tone: "skill" };
    case "attack": return { text: `${e.actor} attacks ${e.target}`, tone: "dim" };
    case "damage": {
      const toPlayer = e.target === playerName;
      const crit = e.crit ? " CRIT!" : "";
      const kill = e.killed ? " — down!" : "";
      return { text: `${e.attacker} hits ${e.target} for ${e.amount}${crit}${kill}`, tone: e.crit ? "crit" : toPlayer ? "hurt" : "hit" };
    }
    case "dodge": return { text: `${e.target} dodges ${e.attacker}`, tone: "dim" };
    case "miss": return { text: `${e.attacker} misses ${e.target}`, tone: "dim" };
    case "heal": return { text: `${e.target} heals ${e.amount}`, tone: "good" };
    case "status": return { text: `${e.target} is ${e.status}`, tone: "good" };
    case "buff": return { text: `${e.target} raises ${e.buff}`, tone: "good" };
    case "stunnedSkip": return { text: `${e.actor} is stunned!`, tone: "good" };
    case "outOfMp": return { text: `Out of MP for ${e.skill}`, tone: "dim" };
    case "waveCleared": return { text: `Wave ${e.wave} cleared (+${e.xp} XP, +${e.gold}g)`, tone: "good" };
    case "recover": return { text: `Recovered +${e.hp} HP, +${e.mp} MP`, tone: "dim" };
    case "treasure": return { text: `Found ${e.gold} gold!`, tone: "gold" };
    case "rest": return { text: "Rested — fully recovered.", tone: "good" };
    case "floorCleared": return { text: `Floor cleared! +${e.awardedXp} XP, +${e.gold}g`, tone: "head" };
    case "floorDefeat": return { text: `Defeated on wave ${e.wave}.`, tone: "bad" };
    default: return null;
  }
}

const TONE_COLOR = {
  head: colors.exp, dim: colors.textDim, skill: colors.gold, hit: colors.text,
  hurt: colors.hp, crit: colors.gold, good: colors.accent, gold: colors.gold, bad: colors.danger,
};

export default function DungeonScreen({ onBack }) {
  const { profile, vitals, beginFloorSession, commitFloorResult } = useStride();
  const sessionRef = useRef(null);
  const committedRef = useRef(false); // current session's result already banked?
  const runRef = useRef(null); // accumulated totals across the descent
  const [, setTick] = useState(0);
  const [ended, setEnded] = useState(null);
  const [speed, setSpeed] = useState(1); // auto-descent speed multiplier (1/2/4)
  const rerender = () => setTick((t) => t + 1);

  const snap = sessionRef.current ? sessionRef.current.snapshot() : null;
  const running = !!snap;

  // Continuous auto-descent loop. Every tick: take an auto turn if it's our move;
  // when a floor ends, bank it and either drop to the next floor (on a clear) or
  // end the run (on death). Instant floors (treasure/rest) flow straight through.
  useEffect(() => {
    const id = setInterval(() => {
      const s = sessionRef.current;
      if (!s) return;
      const sn = s.snapshot();
      if (sn.phase === "fighting") {
        if (sn.awaiting) { s.autoStep(); rerender(); }
        return;
      }
      if (committedRef.current) return; // already handled this floor's end
      committedRef.current = true;

      const r = sn.result || {};
      const gains = commitFloorResult(r);
      const run = runRef.current;
      if (run) {
        run.xp += r.xp || 0;
        run.gold += r.gold || 0;
        if (r.loot?.length) run.loot.push(...r.loot);
        if (gains?.length) run.levels.push(...gains);
        if (r.outcome === "cleared") { run.floorsCleared += 1; run.deepest = r.floor; }
      }

      if (r.outcome === "cleared") {
        const next = beginFloorSession(); // reads the freshly advanced floor + carried HP
        if (next) { sessionRef.current = next; committedRef.current = false; rerender(); return; }
      }
      // The run is over: died, fled, or the next floor couldn't start.
      setEnded({ outcome: r.outcome, floor: sn.floor, log: sn.log, run: { ...(runRef.current || emptyRun(sn.floor)) } });
      sessionRef.current = null;
      rerender();
    }, Math.round(300 / speed));
    return () => clearInterval(id);
  }, [beginFloorSession, commitFloorResult, speed]);

  const floor = profile.floor || 1;
  const type = floorType(floor);
  const hasUnspent = profile.statPoints > 0;

  const startDescent = () => {
    const s = beginFloorSession();
    if (!s) return;
    runRef.current = emptyRun(floor);
    committedRef.current = false;
    sessionRef.current = s;
    setEnded(null);
    rerender();
  };

  const retreat = () => {
    const s = sessionRef.current;
    const sn = s ? s.snapshot() : null;
    committedRef.current = true; // abandon the in-progress floor (no reward for it)
    setEnded({ outcome: "retreat", floor: sn ? sn.floor : floor, log: sn ? sn.log : [], run: { ...(runRef.current || emptyRun(floor)) } });
    sessionRef.current = null;
    rerender();
  };

  const leave = () => { setEnded(null); rerender(); };

  // ── Run finished: summary ──
  if (ended) {
    const r = ended.run;
    const died = ended.outcome === "defeat";
    const title = died
      ? `You fell on Floor ${ended.floor}`
      : ended.outcome === "retreat"
      ? `Retreated from Floor ${ended.floor}`
      : `Run ended on Floor ${ended.floor}`;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Descent Report</Text>
        <View style={styles.card}>
          <Text style={[styles.outcome, { color: died ? colors.danger : colors.accent }]}>{title}</Text>
          <Text style={styles.rewardLine}>
            {r.floorsCleared} floor{r.floorsCleared === 1 ? "" : "s"} cleared   ·   +{r.xp} XP   ·   +{r.gold} gold
          </Text>
          {r.levels.length > 0 && (
            <Text style={styles.levelUp}>★ Level up → {r.levels[r.levels.length - 1].level}!</Text>
          )}
          {r.loot.length > 0 && (
            <View style={styles.loot}>
              <Text style={styles.lootTitle}>Loot collected ({r.loot.length})</Text>
              {r.loot.map((it) => (
                <Text key={it.id} style={[styles.lootItem, { color: RARITIES[it.rarity]?.color }]}>
                  {it.name} — {Object.entries(it.mods).map(([s, v]) => `+${v} ${statLabel(s)}`).join(", ")}
                </Text>
              ))}
            </View>
          )}
          {died && <Text style={styles.note}>You respawn at full HP on Floor {profile.floor || 1}. Train up and dive again.</Text>}
          <Pressable onPress={leave} style={({ pressed }) => [styles.descend, pressed && styles.pressed, { backgroundColor: colors.accent, marginTop: spacing(2) }]}>
            <Text style={[styles.descendText, { color: colors.bg }]}>Return</Text>
          </Pressable>
        </View>
        <Log events={ended.log} tail={14} />
      </ScrollView>
    );
  }

  // ── No active run: briefing ──
  if (!running) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>← Home</Text></Pressable>
        <Text style={styles.title}>Dungeon</Text>
        <View style={styles.card}>
          <Text style={styles.floorNum}>Floor {floor}</Text>
          <Text style={styles.zone}>{zoneName(floor)}</Text>
          <Text style={styles.blurb}>{FLOOR_BLURB[type] ?? type}</Text>
          <Text style={styles.vitals}>
            HP {vitals.hp}/{vitals.maxHP}   ·   MP {vitals.mp}/{vitals.maxMP}
          </Text>
          <Text style={styles.blurb}>
            Your character descends on their own — auto-fighting each floor and
            pressing deeper until they fall. Every floor cleared is banked.
          </Text>

          {hasUnspent && COMBAT_FLOORS.has(type) && (
            <View style={styles.nudge}>
              <Text style={styles.nudgeText}>
                ⚠ You have {profile.statPoints} unspent stat point
                {profile.statPoints === 1 ? "" : "s"}. Spend them on the Stats
                screen before descending — base stats won't survive deep floors.
              </Text>
            </View>
          )}

          <Pressable
            onPress={startDescent}
            style={({ pressed }) => [styles.descend, pressed && styles.pressed]}
          >
            <Text style={styles.descendText}>Descend</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Descending: live auto-fight ──
  const { player } = snap;
  const run = runRef.current || emptyRun(floor);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.title}>Floor {snap.floor}</Text>
          <Text style={styles.zone}>{zoneName(snap.floor)}</Text>
        </View>
        <Text style={styles.waveTag}>Wave {snap.wave}/{snap.totalWaves}</Text>
      </View>

      <View style={styles.runBar}>
        <Text style={styles.runText}>▼ Descending — auto</Text>
        <Text style={styles.runText}>{run.floorsCleared} cleared · +{run.xp} XP · +{run.gold}g</Text>
      </View>

      {/* Speed control */}
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed</Text>
        {[1, 2, 4].map((s) => (
          <Pressable
            key={s}
            onPress={() => setSpeed(s)}
            style={[styles.speedBtn, speed === s && styles.speedBtnOn]}
          >
            <Text style={[styles.speedText, speed === s && styles.speedTextOn]}>{s}×</Text>
          </Pressable>
        ))}
      </View>

      {/* Enemies */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Enemies</Text>
        {snap.enemies.map((e) => (
          <View key={e.index} style={[styles.enemyRow, !e.alive && styles.enemyDead]}>
            <Text style={[styles.enemyName, !e.alive && styles.struck]}>{e.name}</Text>
            <View style={styles.enemyBarWrap}>
              <View style={[styles.enemyBar, { width: `${Math.max(0, (e.hp / e.maxHP) * 100)}%` }]} />
            </View>
            <Text style={styles.enemyHp}>{e.hp}</Text>
          </View>
        ))}
      </View>

      {/* Player */}
      <View style={styles.card}>
        <ProgressBar label="HP" value={player.hp} max={player.maxHP} color={colors.hp} />
        <ProgressBar label="MP" value={player.mp} max={player.maxMP} color={colors.exp} />
      </View>

      <Pressable onPress={retreat} style={({ pressed }) => [styles.retreat, pressed && styles.pressed]}>
        <Text style={styles.retreatText}>Retreat — bank cleared floors</Text>
      </Pressable>

      <Log events={snap.log} tail={10} />
    </ScrollView>
  );
}

function Log({ events, tail }) {
  const lines = events.map((e) => formatEvent(e)).filter(Boolean);
  const shown = tail ? lines.slice(-tail) : lines;
  return (
    <View style={styles.card}>
      {shown.map((l, i) => (
        <Text key={i} style={[styles.logLine, { color: TONE_COLOR[l.tone] }]}>{l.text}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  back: { marginBottom: spacing(1) },
  backText: { color: colors.exp, fontSize: 15, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing(1.5) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  waveTag: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 14, padding: spacing(2), marginBottom: spacing(1.5),
  },
  floorNum: { color: colors.text, fontSize: 22, fontWeight: "800" },
  zone: { color: colors.gold, fontSize: 13, fontWeight: "700", marginTop: 2 },
  blurb: { color: colors.textDim, fontSize: 14, marginTop: spacing(0.75), lineHeight: 20 },
  vitals: { color: colors.hp, fontSize: 13, marginTop: spacing(0.75), fontWeight: "600" },
  nudge: {
    marginTop: spacing(1.5), backgroundColor: colors.surfaceAlt, borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: colors.gold, padding: spacing(1.25),
  },
  nudgeText: { color: colors.gold, fontSize: 13, lineHeight: 19 },
  descend: {
    marginTop: spacing(2), backgroundColor: colors.danger, borderRadius: 12,
    paddingVertical: spacing(1.75), alignItems: "center",
  },
  descendText: { color: colors.text, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.85 },
  note: { color: colors.textDim, fontSize: 12, marginTop: spacing(1.5), textAlign: "center", lineHeight: 18 },
  outcome: { fontSize: 20, fontWeight: "800" },
  rewardLine: { color: colors.textDim, fontSize: 14, marginTop: spacing(0.5) },
  levelUp: { color: colors.gold, fontSize: 14, fontWeight: "700", marginTop: spacing(0.5) },
  loot: { marginTop: spacing(1.5), borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing(1) },
  lootTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: spacing(0.5) },
  lootItem: { fontSize: 13, fontWeight: "700", lineHeight: 19 },
  sectionTitle: { color: colors.textDim, fontSize: 12, fontWeight: "700", marginBottom: spacing(1), textTransform: "uppercase" },
  runBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5), marginBottom: spacing(1.5),
  },
  runText: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  speedRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing(1.5), gap: spacing(1) },
  speedLabel: { color: colors.textDim, fontSize: 13, fontWeight: "700", marginRight: spacing(0.5) },
  speedBtn: {
    paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.75), borderRadius: 8,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  speedBtnOn: { backgroundColor: colors.exp, borderColor: colors.exp },
  speedText: { color: colors.textDim, fontSize: 14, fontWeight: "800" },
  speedTextOn: { color: colors.bg },
  enemyRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1), borderRadius: 8, marginBottom: 4,
  },
  enemyDead: { opacity: 0.4 },
  enemyName: { color: colors.text, fontSize: 14, fontWeight: "600", width: 110 },
  struck: { textDecorationLine: "line-through" },
  enemyBarWrap: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden", marginHorizontal: spacing(1) },
  enemyBar: { height: "100%", backgroundColor: colors.hp },
  enemyHp: { color: colors.textDim, fontSize: 12, width: 34, textAlign: "right", fontVariant: ["tabular-nums"] },
  retreat: {
    backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: spacing(1.25),
    alignItems: "center", marginBottom: spacing(1.5), borderWidth: 1, borderColor: colors.border,
  },
  retreatText: { color: colors.textDim, fontSize: 14, fontWeight: "800" },
  logLine: { fontSize: 13, lineHeight: 19, fontVariant: ["tabular-nums"] },
});

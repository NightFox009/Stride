// Dungeon: spend Energy to descend, then fight the floor turn by turn — choose
// Attack, a skill, or flee each turn, pick your target, and read the log. The
// engine session (engine/dungeonSession.js) holds combat state; this screen
// renders snapshots and forwards the player's choices.

import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { floorType } from "../../engine/floors.js";
import ProgressBar from "../components/ProgressBar.js";
import { colors, spacing } from "../theme.js";

const FLOOR_BLURB = {
  combat: "Combat — 10 waves of monsters.",
  elite: "Elite — a single dangerous foe.",
  boss: "Boss — 9 waves, then the warlord. Bring your best.",
  treasure: "Treasure — no fight, just loot.",
  rest: "Rest — recover and move on.",
};
const COMBAT_FLOORS = new Set(["combat", "elite", "boss"]);

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
    case "heal": return { text: `${e.target} heals ${e.amount}`, tone: "good" };
    case "status": return { text: `${e.target} is ${e.status}`, tone: "good" };
    case "buff": return { text: `${e.target} raises ${e.buff}`, tone: "good" };
    case "stunnedSkip": return { text: `${e.actor} is stunned!`, tone: "good" };
    case "outOfMp": return { text: `Out of MP for ${e.skill}`, tone: "dim" };
    case "flee": return { text: e.success ? "Fled the battle!" : "Failed to flee!", tone: "dim" };
    case "waveCleared": return { text: `Wave ${e.wave} cleared (+${e.xp} XP, +${e.gold}g)`, tone: "good" };
    case "recover": return { text: `Recovered +${e.hp} HP, +${e.mp} MP`, tone: "dim" };
    case "treasure": return { text: `Found ${e.gold} gold!`, tone: "gold" };
    case "rest": return { text: "Rested — fully recovered.", tone: "good" };
    case "floorCleared": return { text: `Floor cleared! +${e.awardedXp} XP, +${e.gold}g`, tone: "head" };
    case "floorDefeat": return { text: `Defeated on wave ${e.wave}. EXP halved, loot lost.`, tone: "bad" };
    case "floorFled": return { text: `Fled on wave ${e.wave}.`, tone: "bad" };
    default: return null;
  }
}

const TONE_COLOR = {
  head: colors.exp, dim: colors.textDim, skill: colors.gold, hit: colors.text,
  hurt: colors.hp, crit: colors.gold, good: colors.accent, gold: colors.gold, bad: colors.danger,
};

export default function DungeonScreen({ onBack }) {
  const { profile, floorCost, beginFloorSession, commitFloorResult } = useStride();
  const sessionRef = useRef(null);
  const committedRef = useRef(false);
  const [, setTick] = useState(0);
  const [target, setTarget] = useState(0);
  const [levelsGained, setLevelsGained] = useState([]);
  const [autoOn, setAutoOn] = useState(false);
  const rerender = () => setTick((t) => t + 1);

  const snap = sessionRef.current ? sessionRef.current.snapshot() : null;

  // Commit rewards once the floor ends.
  useEffect(() => {
    if (snap && snap.result && !committedRef.current) {
      committedRef.current = true;
      setLevelsGained(commitFloorResult(snap.result));
    }
  });

  // Auto-battle: while on and still fighting, take one turn every tick.
  useEffect(() => {
    if (!autoOn || !sessionRef.current) return;
    if (snap?.phase !== "fighting") return;
    const id = setInterval(() => {
      const s = sessionRef.current;
      if (!s) return;
      const sn = s.snapshot();
      if (sn.phase !== "fighting" || !sn.awaiting) return;
      s.autoStep();
      rerender();
    }, 320);
    return () => clearInterval(id);
  }, [autoOn, snap?.phase]);

  const floor = profile.floor || 1;
  const type = floorType(floor);
  const canDescend = profile.energy >= floorCost;
  const hasUnspent = profile.statPoints > 0;

  const descend = () => {
    const s = beginFloorSession();
    if (!s) return;
    sessionRef.current = s;
    committedRef.current = false;
    setLevelsGained([]);
    setTarget(0);
    rerender();
  };

  const leave = () => {
    sessionRef.current = null;
    committedRef.current = false;
    rerender();
  };

  // ── No active run: floor briefing ──
  if (!snap) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>← Home</Text></Pressable>
        <Text style={styles.title}>Dungeon</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.floorNum}>Floor {floor}</Text>
            <Text style={styles.energy}>{profile.energy}⚡</Text>
          </View>
          <Text style={styles.blurb}>{FLOOR_BLURB[type] ?? type}</Text>

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
            disabled={!canDescend}
            onPress={descend}
            style={({ pressed }) => [styles.descend, !canDescend && styles.btnDisabled, pressed && canDescend && styles.pressed]}
          >
            <Text style={styles.descendText}>Descend  ·  {floorCost}⚡</Text>
          </Pressable>
          {!canDescend && (
            <Text style={styles.note}>
              Need {floorCost}⚡ — walk {Math.max(0, floorCost - profile.energy) * 100} more steps.
            </Text>
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Run finished: result ──
  if (snap.phase !== "fighting") {
    const r = snap.result || {};
    const cleared = r.outcome === "cleared";
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dungeon</Text>
        <View style={styles.card}>
          <Text style={[styles.outcome, { color: cleared ? colors.accent : colors.danger }]}>
            {cleared ? "Floor cleared!" : r.outcome === "fled" ? "You fled — the run is lost." : "You fell in the dungeon."}
          </Text>
          <Text style={styles.rewardLine}>+{r.xp || 0} XP   ·   +{r.gold || 0} gold   ·   {r.energySpent || 0}⚡ spent</Text>
          {levelsGained.length > 0 && (
            <Text style={styles.levelUp}>★ Level up → {levelsGained[levelsGained.length - 1].level}!</Text>
          )}
          <Pressable onPress={leave} style={({ pressed }) => [styles.descend, pressed && styles.pressed, { backgroundColor: colors.accent, marginTop: spacing(2) }]}>
            <Text style={[styles.descendText, { color: colors.bg }]}>Return</Text>
          </Pressable>
        </View>
        <Log events={snap.log} />
      </ScrollView>
    );
  }

  // ── Fighting ──
  const liveTarget = snap.enemies[target]?.alive ? target : snap.enemies.findIndex((e) => e.alive);
  const { player } = snap;
  const menu = sessionRef.current.skillMenu;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>Floor {snap.floor}</Text>
        <Text style={styles.waveTag}>Wave {snap.wave}/{snap.totalWaves}</Text>
      </View>

      {/* Enemies */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Enemies — tap to target</Text>
        {snap.enemies.map((e) => (
          <Pressable
            key={e.index}
            disabled={!e.alive}
            onPress={() => setTarget(e.index)}
            style={[styles.enemyRow, e.index === liveTarget && e.alive && styles.enemyTargeted, !e.alive && styles.enemyDead]}
          >
            <Text style={[styles.enemyName, !e.alive && styles.struck]}>
              {e.index === liveTarget && e.alive ? "▶ " : ""}{e.name}
            </Text>
            <View style={styles.enemyBarWrap}>
              <View style={[styles.enemyBar, { width: `${Math.max(0, (e.hp / e.maxHP) * 100)}%` }]} />
            </View>
            <Text style={styles.enemyHp}>{e.hp}</Text>
          </Pressable>
        ))}
      </View>

      {/* Player */}
      <View style={styles.card}>
        <ProgressBar label="HP" value={player.hp} max={player.maxHP} color={colors.hp} />
        <ProgressBar label="MP" value={player.mp} max={player.maxMP} color={colors.exp} />
      </View>

      {/* Auto toggle */}
      <Pressable
        onPress={() => setAutoOn((v) => !v)}
        style={[styles.auto, autoOn && styles.autoOn]}
      >
        <Text style={[styles.autoText, autoOn && styles.autoTextOn]}>
          {autoOn ? "■ Auto-battling… (tap to take control)" : "▶ Auto-battle"}
        </Text>
      </Pressable>

      {/* Actions */}
      <View style={styles.actions}>
        <ActionBtn label="Attack" disabled={autoOn} onPress={() => { sessionRef.current.attack(liveTarget); rerender(); }} />
        {menu.map((sk) => {
          const disabled = autoOn || player.mp < sk.cost;
          return (
            <ActionBtn
              key={sk.id}
              label={`${sk.name}${sk.level > 1 ? ` Lv${sk.level}` : ""}`}
              sub={`${sk.cost} MP`}
              disabled={disabled}
              onPress={() => { sessionRef.current.skill(sk.id, liveTarget); rerender(); }}
            />
          );
        })}
        <ActionBtn label="Flee" sub="forfeit run" tone="danger" disabled={autoOn} onPress={() => { sessionRef.current.flee(); rerender(); }} />
      </View>

      <Log events={snap.log} tail={10} />
    </ScrollView>
  );
}

function ActionBtn({ label, sub, onPress, disabled, tone }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        tone === "danger" && styles.actionDanger,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, disabled && styles.actionTextDisabled]}>{label}</Text>
      {sub ? <Text style={styles.actionSub}>{sub}</Text> : null}
    </Pressable>
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
  energy: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  blurb: { color: colors.textDim, fontSize: 14, marginTop: spacing(0.5), lineHeight: 20 },
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
  btnDisabled: { backgroundColor: colors.surfaceAlt, opacity: 0.7 },
  pressed: { opacity: 0.85 },
  note: { color: colors.textDim, fontSize: 12, marginTop: spacing(1), textAlign: "center" },
  outcome: { fontSize: 20, fontWeight: "800" },
  rewardLine: { color: colors.textDim, fontSize: 14, marginTop: spacing(0.5) },
  levelUp: { color: colors.gold, fontSize: 14, fontWeight: "700", marginTop: spacing(0.5) },
  sectionTitle: { color: colors.textDim, fontSize: 12, fontWeight: "700", marginBottom: spacing(1), textTransform: "uppercase" },
  enemyRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1), borderRadius: 8, borderWidth: 1, borderColor: "transparent", marginBottom: 4,
  },
  enemyTargeted: { borderColor: colors.danger, backgroundColor: colors.surfaceAlt },
  enemyDead: { opacity: 0.4 },
  enemyName: { color: colors.text, fontSize: 14, fontWeight: "600", width: 96 },
  struck: { textDecorationLine: "line-through" },
  enemyBarWrap: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden", marginHorizontal: spacing(1) },
  enemyBar: { height: "100%", backgroundColor: colors.hp },
  enemyHp: { color: colors.textDim, fontSize: 12, width: 34, textAlign: "right", fontVariant: ["tabular-nums"] },
  auto: {
    backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: spacing(1.25),
    alignItems: "center", marginBottom: spacing(1), borderWidth: 1, borderColor: colors.border,
  },
  autoOn: { backgroundColor: colors.exp, borderColor: colors.exp },
  autoText: { color: colors.exp, fontSize: 14, fontWeight: "800" },
  autoTextOn: { color: colors.bg },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1), marginBottom: spacing(1.5) },
  action: {
    backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2), alignItems: "center", minWidth: 96, flexGrow: 1,
  },
  actionDanger: { borderWidth: 1, borderColor: colors.danger },
  actionText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  actionTextDisabled: { color: colors.textDim },
  actionSub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  logLine: { fontSize: 13, lineHeight: 19, fontVariant: ["tabular-nums"] },
});

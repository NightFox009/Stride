// Dungeon: spend Energy to auto-run the current floor through the engine, then
// read the turn-by-turn log and the outcome. Closes the core loop —
// walk -> get strong -> descend -> loot/EXP -> walk more.

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { floorType } from "../../engine/floors.js";
import { colors, spacing } from "../theme.js";

const FLOOR_BLURB = {
  combat: "Combat — 10 waves of monsters.",
  elite: "Elite — a single dangerous foe.",
  boss: "Boss — 9 waves, then the warlord. Bring your best.",
  treasure: "Treasure — no fight, just loot.",
  rest: "Rest — recover and move on.",
};

// Turn one engine event into a renderable { text, tone } (or null to skip noise).
function formatEvent(e, playerName) {
  switch (e.type) {
    case "floorStart":
      return { text: `── Floor ${e.floor} (${e.floorType}) · ${e.waves} waves · ${e.energyCost}⚡ ──`, tone: "head" };
    case "waveStart":
      return { text: `Wave ${e.wave}/${e.of}`, tone: "dim" };
    case "skill":
      return { text: `${e.actor} uses ${e.skill} (${e.cost} MP)`, tone: "skill" };
    case "attack":
      return { text: `${e.actor} attacks ${e.target}`, tone: "dim" };
    case "damage": {
      const toPlayer = e.target === playerName;
      const crit = e.crit ? " CRIT!" : "";
      const kill = e.killed ? " — down!" : "";
      return {
        text: `${e.attacker} hits ${e.target} for ${e.amount}${crit}${kill}`,
        tone: e.crit ? "crit" : toPlayer ? "hurt" : "hit",
      };
    }
    case "dodge":
      return { text: `${e.target} dodges ${e.attacker}`, tone: "dim" };
    case "heal":
      return { text: `${e.target} heals ${e.amount}`, tone: "good" };
    case "status":
      return { text: `${e.target} is ${e.status}`, tone: "good" };
    case "outOfMp":
      return { text: `Out of MP for ${e.skill} — basic attack`, tone: "dim" };
    case "flee":
      return { text: e.success ? "Fled the battle!" : "Failed to flee!", tone: "dim" };
    case "waveCleared":
      return { text: `Wave ${e.wave} cleared (+${e.xp} XP, +${e.gold}g) · HP ${e.playerHp}`, tone: "good" };
    case "treasure":
      return { text: `Found ${e.gold} gold!`, tone: "gold" };
    case "rest":
      return { text: "Rested — fully recovered.", tone: "good" };
    case "floorCleared":
      return { text: `Floor cleared! +${e.awardedXp} XP, +${e.gold}g`, tone: "head" };
    case "floorDefeat":
      return { text: `Defeated on wave ${e.wave}. EXP halved, loot lost.`, tone: "bad" };
    case "floorFled":
      return { text: `Fled on wave ${e.wave}.`, tone: "bad" };
    default:
      return null; // round/battleStart/battleEnd/recover/buff = noise
  }
}

const TONE_COLOR = {
  head: colors.exp,
  dim: colors.textDim,
  skill: colors.gold,
  hit: colors.text,
  hurt: colors.hp,
  crit: colors.gold,
  good: colors.accent,
  gold: colors.gold,
  bad: colors.danger,
};

export default function DungeonScreen({ onBack }) {
  const { profile, floorCost, runDungeonFloor } = useStride();
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);

  const floor = profile.floor || 1;
  const type = floorType(floor);
  const canDescend = profile.energy >= floorCost;

  const descend = () => {
    setBusy(true);
    // Let the button state paint before the (synchronous) engine run.
    setTimeout(() => {
      const result = runDungeonFloor();
      setRun(result);
      setBusy(false);
    }, 10);
  };

  const lines = run
    ? run.events.map((e) => formatEvent(e, "You")).filter(Boolean)
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Home</Text>
      </Pressable>

      <Text style={styles.title}>Dungeon</Text>

      <View style={styles.card}>
        <View style={styles.floorRow}>
          <Text style={styles.floorNum}>Floor {floor}</Text>
          <Text style={styles.energy}>{profile.energy}⚡</Text>
        </View>
        <Text style={styles.blurb}>{FLOOR_BLURB[type] ?? type}</Text>
        <Pressable
          disabled={!canDescend || busy}
          onPress={descend}
          style={({ pressed }) => [
            styles.descend,
            (!canDescend || busy) && styles.descendDisabled,
            pressed && canDescend && styles.descendPressed,
          ]}
        >
          <Text style={styles.descendText}>
            {busy ? "Descending…" : `Descend  ·  ${floorCost}⚡`}
          </Text>
        </Pressable>
        {!canDescend && (
          <Text style={styles.note}>
            Need {floorCost}⚡ — walk {Math.max(0, floorCost - profile.energy) * 100} more
            steps.
          </Text>
        )}
      </View>

      {run && (
        <View style={styles.card}>
          <Text
            style={[
              styles.outcome,
              { color: run.outcome === "cleared" ? colors.accent : colors.danger },
            ]}
          >
            {run.outcome === "cleared"
              ? "Floor cleared!"
              : run.outcome === "defeat"
              ? "You fell in the dungeon."
              : run.outcome === "no_energy"
              ? "Not enough Energy."
              : "You fled."}
          </Text>
          {run.levelsGained?.length > 0 && (
            <Text style={styles.levelUp}>
              ★ Level up → {run.levelsGained[run.levelsGained.length - 1].level}!
            </Text>
          )}

          <View style={styles.log}>
            {lines.map((l, i) => (
              <Text key={i} style={[styles.logLine, { color: TONE_COLOR[l.tone] }]}>
                {l.text}
              </Text>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  back: { marginBottom: spacing(1) },
  backText: { color: colors.exp, fontSize: 15, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: spacing(2) },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  floorRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  floorNum: { color: colors.text, fontSize: 22, fontWeight: "800" },
  energy: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  blurb: { color: colors.textDim, fontSize: 14, marginTop: spacing(0.5), lineHeight: 20 },
  descend: {
    marginTop: spacing(2),
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: spacing(1.75),
    alignItems: "center",
  },
  descendDisabled: { backgroundColor: colors.surfaceAlt },
  descendPressed: { opacity: 0.85 },
  descendText: { color: colors.text, fontSize: 16, fontWeight: "800" },
  note: { color: colors.textDim, fontSize: 12, marginTop: spacing(1), textAlign: "center" },
  outcome: { fontSize: 18, fontWeight: "800" },
  levelUp: { color: colors.gold, fontSize: 14, fontWeight: "700", marginTop: spacing(0.5) },
  log: { marginTop: spacing(1.5) },
  logLine: { fontSize: 13, lineHeight: 19, fontVariant: ["tabular-nums"] },
});

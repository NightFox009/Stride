// Stats: draft your point allocation (with +/-), preview it on the radar, then
// Confirm to commit. Shows passive bonuses and links to the Skills tree.

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { STATS, STAT_NAMES } from "../../engine/stats.js";
import { BASE_CLASSES } from "../../engine/classes.js";
import { passiveMods } from "../../engine/passives.js";
import { useStride } from "../state/StrideContext.js";
import RadarChart from "../components/RadarChart.js";
import { colors, spacing, STAT_COLORS } from "../theme.js";

const emptyDraft = () => STATS.reduce((o, s) => ((o[s] = 0), o), {});

export default function StatsScreen({ onBack, onOpenSkills }) {
  const { profile, sheet, allocateStats, resetGame } = useStride();
  const [draft, setDraft] = useState(emptyDraft);
  const [confirmReset, setConfirmReset] = useState(false);

  const mods = passiveMods(profile.passives || []);
  const draftTotal = Object.values(draft).reduce((s, n) => s + n, 0);
  const pointsLeft = profile.statPoints - draftTotal;
  const boost = BASE_CLASSES[profile.classId]?.boost;

  const inc = (stat) => pointsLeft > 0 && setDraft((d) => ({ ...d, [stat]: d[stat] + 1 }));
  const dec = (stat) => draft[stat] > 0 && setDraft((d) => ({ ...d, [stat]: d[stat] - 1 }));
  const reset = () => setDraft(emptyDraft());
  const confirm = () => {
    allocateStats(draft);
    setDraft(emptyDraft());
  };

  // Radar previews base + pending draft so you see the shape before committing.
  const radarData = STATS.map((stat) => ({
    key: stat,
    label: STAT_NAMES[stat],
    value: profile.stats[stat] + draft[stat],
    color: STAT_COLORS[stat],
    emphasized: stat === boost,
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Home</Text>
      </Pressable>

      <Text style={styles.title}>Stats</Text>
      <Text style={styles.points}>
        {pointsLeft} point{pointsLeft === 1 ? "" : "s"} to spend
      </Text>

      <View style={[styles.card, styles.radarCard]}>
        <RadarChart data={radarData} size={280} showValues />
      </View>

      <View style={styles.card}>
        {STATS.map((stat) => {
          const base = profile.stats[stat];
          const pending = draft[stat];
          const bonus = mods[stat] || 0;
          return (
            <View key={stat} style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statName}>{STAT_NAMES[stat]}</Text>
                <Text style={styles.statAbbr}>{stat}</Text>
              </View>
              <Text style={styles.statValue}>
                {base + pending}
                {bonus ? <Text style={styles.bonus}> (+{bonus})</Text> : null}
                {pending ? <Text style={styles.pending}>  +{pending}</Text> : null}
              </Text>
              <Pressable
                disabled={pending <= 0}
                onPress={() => dec(stat)}
                style={[styles.step, pending <= 0 && styles.stepOff]}
              >
                <Text style={styles.stepText}>－</Text>
              </Pressable>
              <Pressable
                disabled={pointsLeft <= 0}
                onPress={() => inc(stat)}
                style={[styles.step, styles.stepPlus, pointsLeft <= 0 && styles.stepOff]}
              >
                <Text style={styles.stepText}>＋</Text>
              </Pressable>
            </View>
          );
        })}

        {draftTotal > 0 && (
          <View style={styles.confirmRow}>
            <Pressable onPress={reset} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Reset</Text>
            </Pressable>
            <Pressable onPress={confirm} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Confirm +{draftTotal}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable onPress={onOpenSkills} style={styles.skillsLink}>
        <Text style={styles.skillsLinkText}>
          Skills & passives{profile.skillPoints ? `  ·  ${profile.skillPoints} SP` : ""} →
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Combat sheet</Text>
      <View style={styles.card}>
        <Derived k="Max HP" v={sheet.maxHP} />
        <Derived k="Max MP" v={sheet.maxMP} />
        <Derived k="Attack" v={sheet.attack} />
        <Derived k="Skill Power" v={sheet.skillPower} />
        <Derived k="Crit Chance" v={`${sheet.critChance.toFixed(1)}%`} />
        <Derived k="Dodge Chance" v={`${sheet.dodgeChance.toFixed(1)}%`} />
        <Derived k="Speed" v={sheet.speed} />
      </View>

      <Pressable
        onPress={() => (confirmReset ? resetGame() : setConfirmReset(true))}
        style={[styles.resetChar, confirmReset && styles.resetArmed]}
      >
        <Text style={[styles.resetText, confirmReset && styles.resetTextArmed]}>
          {confirmReset ? "Tap again to erase & start over" : "Reset character"}
        </Text>
      </Pressable>
      {confirmReset && (
        <Pressable onPress={() => setConfirmReset(false)} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Derived({ k, v }) {
  return (
    <View style={styles.derivedRow}>
      <Text style={styles.derivedKey}>{k}</Text>
      <Text style={styles.derivedVal}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  back: { marginBottom: spacing(1) },
  backText: { color: colors.exp, fontSize: 15, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  points: { color: colors.accent, fontSize: 14, fontWeight: "700", marginBottom: spacing(2) },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 14, padding: spacing(2), marginBottom: spacing(2),
  },
  radarCard: { alignItems: "center", paddingVertical: spacing(2.5) },
  statRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing(1) },
  statName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  statAbbr: { color: colors.textDim, fontSize: 11 },
  statValue: {
    color: colors.text, fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"],
    marginRight: spacing(1.5), minWidth: 78, textAlign: "right",
  },
  bonus: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  pending: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  step: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: colors.surfaceAlt,
    alignItems: "center", justifyContent: "center", marginLeft: spacing(0.75),
  },
  stepPlus: { backgroundColor: colors.accent },
  stepOff: { opacity: 0.35 },
  stepText: { color: colors.bg, fontSize: 18, fontWeight: "800" },
  confirmRow: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1.5) },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: spacing(1.25), borderRadius: 10, backgroundColor: colors.surfaceAlt },
  cancelBtnText: { color: colors.textDim, fontWeight: "700" },
  confirmBtn: { flex: 2, alignItems: "center", paddingVertical: spacing(1.25), borderRadius: 10, backgroundColor: colors.accent },
  confirmBtnText: { color: colors.bg, fontWeight: "800" },
  skillsLink: {
    backgroundColor: colors.surface, borderColor: colors.exp, borderWidth: 1,
    borderRadius: 12, padding: spacing(1.75), alignItems: "center", marginBottom: spacing(2),
  },
  skillsLinkText: { color: colors.exp, fontSize: 15, fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing(1) },
  derivedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing(0.75) },
  derivedKey: { color: colors.textDim, fontSize: 14 },
  derivedVal: { color: colors.text, fontSize: 14, fontWeight: "700" },
  resetChar: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingVertical: spacing(1.5), alignItems: "center",
  },
  resetArmed: { borderColor: colors.danger, backgroundColor: colors.surface },
  resetText: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  resetTextArmed: { color: colors.danger },
  cancel: { alignItems: "center", paddingVertical: spacing(1.25) },
  cancelText: { color: colors.textDim, fontSize: 13 },
});

// Stats screen: spend stat points and read the derived combat sheet. Hidden
// classes unlock at 1000 in a stat, so we show progress toward the next one.

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { STATS, STAT_NAMES } from "../../engine/stats.js";
import { useStride } from "../state/StrideContext.js";
import { colors, spacing } from "../theme.js";

export default function StatsScreen({ onBack }) {
  const { profile, sheet, spendStatPoint, resetGame } = useStride();
  const canSpend = profile.statPoints > 0;
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Home</Text>
      </Pressable>

      <Text style={styles.title}>Stats</Text>
      <Text style={styles.points}>
        {profile.statPoints} unspent point{profile.statPoints === 1 ? "" : "s"}
      </Text>

      <View style={styles.card}>
        {STATS.map((stat) => (
          <View key={stat} style={styles.statRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statName}>{STAT_NAMES[stat]}</Text>
              <Text style={styles.statAbbr}>{stat}</Text>
            </View>
            <Text style={styles.statValue}>{profile.stats[stat]}</Text>
            <Pressable
              disabled={!canSpend}
              onPress={() => spendStatPoint(stat)}
              style={({ pressed }) => [
                styles.plus,
                !canSpend && styles.plusDisabled,
                pressed && canSpend && styles.plusPressed,
              ]}
            >
              <Text style={styles.plusText}>＋</Text>
            </Pressable>
          </View>
        ))}
      </View>

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
        style={[styles.reset, confirmReset && styles.resetArmed]}
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  statRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing(1) },
  statName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  statAbbr: { color: colors.textDim, fontSize: 11 },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginRight: spacing(2),
    minWidth: 36,
    textAlign: "right",
  },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  plusDisabled: { backgroundColor: colors.surfaceAlt },
  plusPressed: { opacity: 0.7 },
  plusText: { color: colors.bg, fontSize: 20, fontWeight: "800", lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing(1) },
  derivedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing(0.75),
  },
  derivedKey: { color: colors.textDim, fontSize: 14 },
  derivedVal: { color: colors.text, fontSize: 14, fontWeight: "700" },
  reset: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing(1.5),
    alignItems: "center",
  },
  resetArmed: { borderColor: colors.danger, backgroundColor: colors.surface },
  resetText: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  resetTextArmed: { color: colors.danger },
  cancel: { alignItems: "center", paddingVertical: spacing(1.25) },
  cancelText: { color: colors.textDim, fontSize: 13 },
});

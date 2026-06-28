// First-run screen: pick a base class. The class's stat affinity is shown only
// as a pie chart that reshapes as you select — we never spell out "+Strength".
// Tap a class to preview its affinity, then confirm to begin.

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { BASE_CLASSES, startingStatsFor } from "../../engine/classes.js";
import { STATS, STAT_NAMES } from "../../engine/stats.js";
import { useStride } from "../state/StrideContext.js";
import RadarChart from "../components/RadarChart.js";
import { colors, spacing, STAT_COLORS } from "../theme.js";

// Flavour only — hints at playstyle without naming the stat it favours.
const TAGLINES = {
  knight: "A relentless frontline striker.",
  sentinel: "An unbreakable guardian who outlasts any foe.",
  monk: "Tireless and disciplined; wins the long fight.",
  ranger: "Swift and precise, striking before they can react.",
  scholar: "A scholar of devastating arcane power.",
  herald: "An inspiring commander who turns the tide.",
};

export default function ClassSelectScreen() {
  const { startGame } = useStride();
  const classes = Object.values(BASE_CLASSES);
  const [selectedId, setSelectedId] = useState(classes[0].id);

  const selected = BASE_CLASSES[selectedId];
  const stats = startingStatsFor(selectedId);
  const radarData = STATS.map((stat) => ({
    key: stat,
    label: STAT_NAMES[stat],
    value: stats[stat],
    color: STAT_COLORS[stat],
    emphasized: stat === selected.boost,
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose your path</Text>
      <Text style={styles.subtitle}>
        Each class has a different affinity — read its shape below. Your choice is
        permanent.
      </Text>

      {/* Affinity preview */}
      <View style={styles.preview}>
        <RadarChart data={radarData} size={280} showValues />
        <Text style={styles.previewName}>{selected.name}</Text>
        <Text style={styles.previewTag}>{TAGLINES[selectedId]}</Text>
      </View>

      {/* Class chips */}
      <View style={styles.chips}>
        {classes.map((cls) => {
          const active = cls.id === selectedId;
          return (
            <Pressable
              key={cls.id}
              onPress={() => setSelectedId(cls.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {cls.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.begin, pressed && styles.beginPressed]}
        onPress={() => startGame(selectedId)}
      >
        <Text style={styles.beginText}>Begin as {selected.name}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: spacing(1), lineHeight: 20 },
  preview: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing(3),
    marginTop: spacing(2.5),
  },
  previewName: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing(2) },
  previewTag: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: spacing(0.5),
    textAlign: "center",
    paddingHorizontal: spacing(2),
    lineHeight: 20,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
    marginTop: spacing(2.5),
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: colors.text },
  begin: {
    marginTop: spacing(3),
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing(2),
    alignItems: "center",
  },
  beginPressed: { opacity: 0.85 },
  beginText: { color: colors.bg, fontSize: 17, fontWeight: "800" },
});

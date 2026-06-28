// Home: the avatar dashboard and the live walk loop. Shows level/EXP/Energy,
// wires the pedometer, and (when no pedometer is available) offers manual
// "walk" controls so the loop is fully testable on web/simulator.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { useStepSource } from "../steps/useStepSource.js";
import { unlockedHiddenClasses } from "../../engine/classes.js";
import ProgressBar from "../components/ProgressBar.js";
import { colors, spacing } from "../theme.js";

export default function HomeScreen({ onOpenStats }) {
  const { profile, sheet, ingestSteps, lastEarned } = useStride();
  const { available, error, addManualSteps } = useStepSource(ingestSteps);

  const hidden = unlockedHiddenClasses(profile.stats);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar / identity */}
      <View style={[styles.card, styles.identityCard]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarGlyph}>🧍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>{profile.className}</Text>
          <Text style={styles.level}>Level {profile.level}</Text>
          {hidden.length > 0 && (
            <Text style={styles.hidden}>
              ✦ {hidden.map((h) => h.name).join(", ")}
            </Text>
          )}
        </View>
        {profile.statPoints > 0 && (
          <Pressable style={styles.pointsBadge} onPress={onOpenStats}>
            <Text style={styles.pointsBadgeText}>+{profile.statPoints} pts</Text>
          </Pressable>
        )}
      </View>

      {/* Resource bars */}
      <View style={styles.card}>
        <ProgressBar label="EXP" value={profile.exp} max={sheet.expToNext} color={colors.exp} />
        <ProgressBar label="Energy" value={profile.energy} color={colors.accent} suffix="⚡" />
        <View style={styles.statRow}>
          <Stat k="Steps" v={profile.totalSteps.toLocaleString()} />
          <Stat k="Gold" v={profile.gold} />
          <Stat k="HP" v={sheet.maxHP} />
          <Stat k="MP" v={sheet.maxMP} />
        </View>
      </View>

      {/* Step source status + dev walk controls */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Steps</Text>
        {available === null && <Text style={styles.dim}>Checking for a pedometer…</Text>}
        {available === true && (
          <Text style={styles.dim}>
            📿 Pedometer connected — walk and your steps fuel EXP & Energy
            automatically (10 steps = 1 EXP, 100 steps = 1 Energy).
          </Text>
        )}
        {available === false && (
          <Text style={styles.dim}>
            No pedometer here{error ? ` (${error})` : ""}. Use the buttons below to
            simulate walking.
          </Text>
        )}

        <View style={styles.walkRow}>
          {[100, 1000, 10000].map((n) => (
            <Pressable
              key={n}
              style={({ pressed }) => [styles.walkBtn, pressed && styles.walkBtnPressed]}
              onPress={() => addManualSteps(n)}
            >
              <Text style={styles.walkBtnText}>+{n.toLocaleString()}</Text>
            </Pressable>
          ))}
        </View>
        {lastEarned && (
          <Text style={styles.earned}>
            +{lastEarned.steps.toLocaleString()} steps → +{lastEarned.xp} EXP
            {lastEarned.energy ? `, +${lastEarned.energy} ⚡` : ""}
            {lastEarned.levelsGained.length
              ? `  •  LEVEL UP → ${lastEarned.levelsGained[lastEarned.levelsGained.length - 1].level}!`
              : ""}
          </Text>
        )}
      </View>

      <Pressable style={styles.statsLink} onPress={onOpenStats}>
        <Text style={styles.statsLinkText}>View stats & allocate points →</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ k, v }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statVal}>{v}</Text>
      <Text style={styles.statKey}>{k}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  identityCard: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(2),
  },
  avatarGlyph: { fontSize: 32 },
  className: { color: colors.text, fontSize: 20, fontWeight: "800" },
  level: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  hidden: { color: colors.gold, fontSize: 12, marginTop: 4, fontWeight: "700" },
  pointsBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
  },
  pointsBadgeText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing(1) },
  dim: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  statRow: { flexDirection: "row", marginTop: spacing(1.5), justifyContent: "space-between" },
  statCell: { alignItems: "center", flex: 1 },
  statVal: { color: colors.text, fontSize: 16, fontWeight: "700" },
  statKey: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  walkRow: { flexDirection: "row", marginTop: spacing(1.5), gap: spacing(1) },
  walkBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: spacing(1.25),
    alignItems: "center",
  },
  walkBtnPressed: { backgroundColor: colors.border },
  walkBtnText: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  earned: { color: colors.accent, fontSize: 13, marginTop: spacing(1.5), fontWeight: "600" },
  statsLink: { padding: spacing(1.5), alignItems: "center" },
  statsLinkText: { color: colors.exp, fontSize: 15, fontWeight: "700" },
});

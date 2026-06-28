// Home: the avatar dashboard and the live walk loop. Shows level/EXP/Energy,
// wires the pedometer, and (when no pedometer is available) offers manual
// "walk" controls so the loop is fully testable on web/simulator.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { useStepSource } from "../steps/useStepSource.js";
import { unlockedHiddenClasses } from "../../engine/classes.js";
import ProgressBar from "../components/ProgressBar.js";
import Avatar, { evolutionStage, STAGE_TITLES } from "../components/Avatar.js";
import { conversionPreview, msToNextEnergy, MAX_ENERGY } from "../game/profile.js";
import { colors, spacing } from "../theme.js";

const STAGE_THRESHOLDS = [10, 20, 30, 50];

function regenLabel(profile) {
  if ((profile.energy || 0) >= MAX_ENERGY) return "Energy full";
  const ms = msToNextEnergy(profile);
  if (ms == null) return "";
  const m = Math.ceil(ms / 60000);
  return `+1⚡ in ~${m} min`;
}

export default function HomeScreen({ onOpenStats, onOpenDungeon }) {
  const { profile, sheet, ingestSteps, convert, lastEarned, floorCost } = useStride();
  const { available, error, addManualSteps } = useStepSource(ingestSteps);

  const hidden = unlockedHiddenClasses(profile.stats);
  const preview = conversionPreview(profile);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar / identity */}
      <View style={[styles.card, styles.identityCard]}>
        <View style={styles.avatar}>
          <Avatar classId={profile.classId} level={profile.level} size={76} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>{profile.className}</Text>
          <Text style={styles.level}>Level {profile.level}</Text>
          <Text style={styles.stage}>
            ✦ {STAGE_TITLES[evolutionStage(profile.level)]}
            {evolutionStage(profile.level) < 4 && (
              <Text style={styles.stageNext}>
                {"  ·  next at Lv " + STAGE_THRESHOLDS[evolutionStage(profile.level)]}
              </Text>
            )}
          </Text>
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
        <ProgressBar label="Energy" value={profile.energy} max={MAX_ENERGY} color={colors.accent} suffix="⚡" />
        <Text style={styles.regen}>{regenLabel(profile)}</Text>
        <View style={styles.statRow}>
          <Stat k="Floor" v={profile.floor || 1} />
          <Stat k="Gold" v={profile.gold} />
          <Stat k="HP" v={sheet.maxHP} />
          <Stat k="MP" v={sheet.maxMP} />
        </View>
      </View>

      {/* Dungeon entry — the place Energy gets spent. */}
      <Pressable
        style={({ pressed }) => [styles.dungeonBtn, pressed && styles.dungeonBtnPressed]}
        onPress={onOpenDungeon}
      >
        <Text style={styles.dungeonTitle}>⚔  Enter the Dungeon</Text>
        <Text style={styles.dungeonSub}>
          Floor {profile.floor || 1} · {floorCost}⚡
          {profile.energy >= floorCost ? "  — ready" : "  — need more Energy"}
        </Text>
      </Pressable>

      {/* Steps: bank + convert */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Steps</Text>
          <Text style={styles.bankBig}>{preview.bank.toLocaleString()} banked</Text>
        </View>
        {available === true && (
          <Text style={styles.dim}>📿 Pedometer connected — your steps bank automatically.</Text>
        )}
        {available === false && (
          <Text style={styles.dim}>
            No pedometer here{error ? ` (${error})` : ""}. Use the buttons below to simulate walking.
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

        <Text style={styles.convertHint}>Convert banked steps — 10 = 1 EXP, 100 = 1⚡</Text>
        <View style={styles.walkRow}>
          <Pressable
            disabled={preview.xp <= 0}
            onPress={() => convert("exp")}
            style={[styles.convertBtn, { borderColor: colors.exp }, preview.xp <= 0 && styles.convertOff]}
          >
            <Text style={[styles.convertText, { color: colors.exp }]}>→ EXP  +{preview.xp}</Text>
          </Pressable>
          <Pressable
            disabled={preview.energy <= 0}
            onPress={() => convert("energy")}
            style={[styles.convertBtn, { borderColor: colors.accent }, preview.energy <= 0 && styles.convertOff]}
          >
            <Text style={[styles.convertText, { color: colors.accent }]}>→ Energy  +{preview.energy}⚡</Text>
          </Pressable>
        </View>
        {profile.energy >= MAX_ENERGY && (
          <Text style={styles.capNote}>Energy is full ({MAX_ENERGY}⚡). Convert steps to EXP instead.</Text>
        )}
        {lastEarned && (
          <Text style={styles.earned}>
            Converted {lastEarned.steps.toLocaleString()} steps →{" "}
            {lastEarned.mode === "exp" ? `+${lastEarned.xp} EXP` : `+${lastEarned.energy}⚡`}
            {lastEarned.levelsGained?.length
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
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(2),
  },
  className: { color: colors.text, fontSize: 20, fontWeight: "800" },
  level: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  stage: { color: colors.gold, fontSize: 12, fontWeight: "700", marginTop: 3 },
  stageNext: { color: colors.textDim, fontWeight: "500" },
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
  regen: { color: colors.textDim, fontSize: 11, marginTop: 2, textAlign: "right" },
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bankBig: { color: colors.text, fontSize: 15, fontWeight: "800", marginBottom: spacing(1) },
  convertHint: { color: colors.textDim, fontSize: 12, marginTop: spacing(1.5) },
  convertBtn: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1,
    paddingVertical: spacing(1.25), alignItems: "center",
  },
  convertOff: { opacity: 0.4 },
  convertText: { fontWeight: "800", fontSize: 14 },
  capNote: { color: colors.gold, fontSize: 12, marginTop: spacing(1) },
  dungeonBtn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  dungeonBtnPressed: { opacity: 0.85 },
  dungeonTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  dungeonSub: { color: colors.textDim, fontSize: 13, marginTop: spacing(0.5) },
  statsLink: { padding: spacing(1.5), alignItems: "center" },
  statsLinkText: { color: colors.exp, fontSize: 15, fontWeight: "700" },
});

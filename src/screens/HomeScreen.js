// Home: the avatar dashboard. Shows level/EXP/HP/MP, the dungeon entry, and a
// "while you were away" summary of offline idle progress. The game is fully idle
// — all EXP/loot now come from the dungeon (live auto-descent or offline accrual).

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { unlockedHiddenClasses } from "../../engine/classes.js";
import ProgressBar from "../components/ProgressBar.js";
import Avatar, { evolutionStage, STAGE_TITLES } from "../components/Avatar.js";
import { getJob } from "../../engine/jobs.js";
import { colors, spacing } from "../theme.js";

const STAGE_THRESHOLDS = [10, 20, 30, 50];

function awayLabel(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m ? ` ${m}m` : ""}`;
  }
  return `${minutes}m`;
}

export default function HomeScreen({ onOpenStats, onOpenDungeon, onOpenInventory, onOpenKnowledge }) {
  const { profile, sheet, vitals, offlineReport, dismissOfflineReport } = useStride();

  const hidden = unlockedHiddenClasses(profile.stats);
  const jobName = getJob(profile.job)?.name;
  const coreCount = offlineReport
    ? Object.values(offlineReport.cores || {}).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar / identity */}
      <View style={[styles.card, styles.identityCard]}>
        <View style={styles.avatar}>
          <Avatar classId={profile.classId} level={profile.level} job={profile.job} size={76} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>
            {profile.className}
            {jobName ? <Text style={styles.jobName}>  ·  {jobName}</Text> : null}
          </Text>
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

      {/* While you were away — offline idle climb */}
      {offlineReport && (
        <View style={[styles.card, styles.awayCard]}>
          <View style={styles.rowBetween}>
            <Text style={styles.awayTitle}>While you were away</Text>
            <Text style={styles.awayTime}>{awayLabel(offlineReport.minutes)}{offlineReport.capped ? " (max)" : ""}</Text>
          </View>
          {offlineReport.endFloor > offlineReport.startFloor ? (
            <Text style={styles.awayClimb}>
              ⛏ Climbed Floor {offlineReport.startFloor} → {offlineReport.endFloor}
              {`  ·  ${offlineReport.floorsCleared} cleared`}
              {offlineReport.deaths > 0 ? `  ·  ${offlineReport.deaths}☠` : ""}
            </Text>
          ) : (
            <Text style={styles.awayClimb}>
              ⛏ Fought on Floor {offlineReport.startFloor}
              {offlineReport.deaths > 0 ? `  ·  ${offlineReport.deaths}☠` : ""}
            </Text>
          )}
          <Text style={styles.awayLine}>
            +{offlineReport.xp} EXP   ·   +{offlineReport.gold} gold
            {coreCount > 0 ? `   ·   ${coreCount} core${coreCount === 1 ? "" : "s"}` : ""}
            {offlineReport.loot?.length > 0 ? `   ·   ${offlineReport.loot.length} loot` : ""}
          </Text>
          {offlineReport.levelsGained?.length > 0 && (
            <Text style={styles.awayLevel}>
              ★ Level up → {offlineReport.levelsGained[offlineReport.levelsGained.length - 1].level}!
            </Text>
          )}
          <Pressable onPress={dismissOfflineReport} style={styles.awayBtn}>
            <Text style={styles.awayBtnText}>Collect</Text>
          </Pressable>
        </View>
      )}

      {/* Resource bars */}
      <View style={styles.card}>
        <ProgressBar label="EXP" value={profile.exp} max={sheet.expToNext} color={colors.exp} />
        <ProgressBar label="HP" value={vitals.hp} max={vitals.maxHP} color={colors.hp} />
        <ProgressBar label="MP" value={vitals.mp} max={vitals.maxMP} color={colors.exp} />
        {(vitals.hp < vitals.maxHP || vitals.mp < vitals.maxMP) && (
          <Text style={styles.regen}>recovering… (HP/MP regen over time, or rest floors heal you)</Text>
        )}
        <View style={styles.statRow}>
          <Stat k="Floor" v={profile.floor || 1} />
          <Stat k="Gold" v={profile.gold} />
          <Stat k="Attack" v={sheet.attack} />
          <Stat k="Class" v={profile.className} />
        </View>
      </View>

      {/* Dungeon entry — the idle climb. */}
      <Pressable
        style={({ pressed }) => [styles.dungeonBtn, pressed && styles.dungeonBtnPressed]}
        onPress={onOpenDungeon}
      >
        <Text style={styles.dungeonTitle}>⚔  Enter the Dungeon</Text>
        <Text style={styles.dungeonSub}>Floor {profile.floor || 1} · auto-descend & idle</Text>
      </Pressable>

      <Pressable style={styles.statsLink} onPress={onOpenStats}>
        <Text style={styles.statsLinkText}>View stats & allocate points →</Text>
      </Pressable>
      <Pressable style={styles.statsLink} onPress={onOpenInventory}>
        <Text style={styles.statsLinkText}>
          Gear & inventory{(profile.inventory?.length || 0) > 0 ? `  ·  ${profile.inventory.length}` : ""} →
        </Text>
      </Pressable>
      <Pressable style={styles.statsLink} onPress={onOpenKnowledge}>
        <Text style={styles.statsLinkText}>Knowledge book →</Text>
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
  jobName: { color: colors.gold, fontSize: 14, fontWeight: "700" },
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
  awayCard: { borderColor: colors.exp },
  awayTitle: { color: colors.exp, fontSize: 15, fontWeight: "800" },
  awayTime: { color: colors.textDim, fontSize: 12, fontWeight: "700" },
  awayClimb: { color: colors.gold, fontSize: 13, fontWeight: "700", marginTop: spacing(1) },
  awayLine: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: spacing(0.5) },
  awayLevel: { color: colors.gold, fontSize: 13, fontWeight: "700", marginTop: spacing(0.5) },
  awayBtn: {
    marginTop: spacing(1.5), backgroundColor: colors.exp, borderRadius: 10,
    paddingVertical: spacing(1.1), alignItems: "center",
  },
  awayBtnText: { color: colors.bg, fontWeight: "800", fontSize: 14 },
  regen: { color: colors.textDim, fontSize: 11, marginTop: 2, textAlign: "right" },
  statRow: { flexDirection: "row", marginTop: spacing(1.5), justifyContent: "space-between" },
  statCell: { alignItems: "center", flex: 1 },
  statVal: { color: colors.text, fontSize: 16, fontWeight: "700" },
  statKey: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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

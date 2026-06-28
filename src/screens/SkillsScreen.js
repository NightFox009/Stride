// Skills: spend skill points (1 earned per level) to learn your class's tier
// skills and passives, unlocked at level milestones.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { treeFor, describeEntry } from "../../engine/classTree.js";
import { SKILLS } from "../../engine/skills.js";
import { useStride } from "../state/StrideContext.js";
import { skillLevelOf, nextRankLevelReq } from "../game/profile.js";
import { colors, spacing } from "../theme.js";

export default function SkillsScreen({ onBack }) {
  const { profile, learn } = useStride();
  const tree = treeFor(profile.classId).map(describeEntry);
  const sp = profile.skillPoints || 0;

  // Starter actives the class began with (always known, free).
  const starters = (profile.skills || []).filter((id) => !tree.some((e) => e.id === id));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Stats</Text>
      </Pressable>

      <Text style={styles.title}>Skills</Text>
      <Text style={styles.points}>{sp} skill point{sp === 1 ? "" : "s"}</Text>

      <Text style={styles.sectionTitle}>Innate skills</Text>
      <View style={styles.card}>
        {starters.map((id) => (
          <View key={id} style={styles.starterRow}>
            <Text style={styles.entryName}>{SKILLS[id]?.name ?? id}</Text>
            <Text style={styles.entryDesc}>{SKILLS[id]?.describe ?? ""}</Text>
          </View>
        ))}
        {starters.length === 0 && <Text style={styles.entryDesc}>None</Text>}
      </View>

      <Text style={styles.sectionTitle}>Class progression</Text>
      {tree.map((e) => {
        const lvl = skillLevelOf(profile, e.id);
        const known = lvl > 0;
        const atMax = lvl >= e.max;
        const nextReq = nextRankLevelReq(profile, e); // level needed for next rank
        const levelLocked = nextReq != null && profile.level < nextReq;
        const tooPoor = sp < e.cost;
        const canBuy = !atMax && !levelLocked && !tooPoor;
        return (
          <View key={e.id} style={styles.card}>
            <View style={styles.entryHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName}>
                  {e.name}
                  <Text style={styles.kind}>  {e.kind === "passive" ? "Passive" : "Active"}</Text>
                </Text>
                <Text style={styles.lvlTag}>
                  {known ? `Lv ${lvl} / ${e.max}` : `Lv 0 / ${e.max}`}
                </Text>
              </View>
              {atMax ? (
                <Text style={styles.learned}>★ Max</Text>
              ) : (
                <Pressable
                  disabled={!canBuy}
                  onPress={() => learn(e.id)}
                  style={[styles.learnBtn, !canBuy && styles.learnOff]}
                >
                  <Text style={[styles.learnText, !canBuy && styles.learnTextOff]}>
                    {levelLocked ? `Lv ${nextReq}` : `${known ? "Upgrade" : "Learn"} · ${e.cost} SP`}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.entryDesc}>
              {e.describe}
              {e.mpCost != null ? `  ·  ${e.mpCost} MP` : ""}
            </Text>
            {levelLocked && (
              <Text style={styles.locked}>
                {known ? `Next rank at level ${nextReq}` : `Unlocks at level ${nextReq}`}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  back: { marginBottom: spacing(1) },
  backText: { color: colors.exp, fontSize: 15, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  points: { color: colors.accent, fontSize: 14, fontWeight: "700", marginBottom: spacing(2) },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing(1) },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 14, padding: spacing(2), marginBottom: spacing(1.5),
  },
  starterRow: { paddingVertical: spacing(0.5) },
  entryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  kind: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  lvlTag: { color: colors.gold, fontSize: 12, fontWeight: "700", marginTop: 2 },
  entryDesc: { color: colors.textDim, fontSize: 13, marginTop: spacing(0.5), lineHeight: 19 },
  locked: { color: colors.textDim, fontSize: 12, marginTop: spacing(0.5), fontStyle: "italic" },
  learned: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  learnBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1) },
  learnOff: { backgroundColor: colors.surfaceAlt },
  learnText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  learnTextOff: { color: colors.textDim },
});

// Jobs: each class has two advanced paths that awaken at level 20 once their
// stat requirements are met. Awakening grants a permanent stat perk and changes
// your avatar. You can switch between any jobs you currently qualify for.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { JOB_LEVEL } from "../../engine/jobs.js";
import { SKILLS } from "../../engine/skills.js";
import { STAT_NAMES } from "../../engine/stats.js";
import { useStride } from "../state/StrideContext.js";
import { jobOptions, jobProgress } from "../game/profile.js";
import Avatar from "../components/Avatar.js";
import { colors, spacing } from "../theme.js";

export default function JobsScreen({ onBack }) {
  const { profile, awaken } = useStride();
  const options = jobOptions(profile);
  const hasJob = !!profile.job;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Stats</Text>
      </Pressable>

      <Text style={styles.title}>Jobs</Text>
      <Text style={styles.sub}>
        Advanced paths awaken at level {JOB_LEVEL} when you meet their stat
        requirements. Choosing a job is permanent — switching later needs a Class
        Change item. A hidden Luck path reveals itself to those who invest in Luck.
      </Text>

      {options
        // Hidden Luck jobs only appear once their requirements are met.
        .filter((job) => !job.hidden || job.qualifies || job.active)
        .map((job) => {
        const pr = jobProgress(profile, job);
        const Row = ({ ok, children }) => (
          <Text style={[styles.favor, ok ? styles.reqOk : styles.reqNo]}>
            {ok ? "✓" : "✗"} {children}
          </Text>
        );
        return (
          <View key={job.id} style={[styles.card, job.active && styles.cardActive]}>
            <View style={styles.head}>
              <Avatar classId={profile.classId} level={profile.level} job={job.id} size={64} />
              <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
                <Text style={styles.name}>
                  {job.name}
                  {job.hidden ? <Text style={styles.hiddenTag}>  ✦ hidden</Text> : null}
                </Text>
                <Text style={styles.blurb}>{job.blurb}</Text>
              </View>
            </View>

            <Text style={styles.label}>Requirements (level {JOB_LEVEL}+)</Text>
            <Row ok={pr.levelOk}>Level {JOB_LEVEL} (you are {profile.level})</Row>
            {pr.reqs.map((r) => (
              <Row key={r.stat} ok={r.ok}>
                {STAT_NAMES[r.stat]} {r.have} / {r.need}
              </Row>
            ))}

            <Text style={styles.label}>Perk</Text>
            <Text style={styles.perk}>
              {Object.entries(job.mods).map(([s, v]) => `+${v} ${STAT_NAMES[s]}`).join("   ")}
            </Text>

            <Text style={styles.label}>Signature skill</Text>
            <Text style={styles.perk}>
              {SKILLS[job.skill]?.name}
              <Text style={styles.skillDesc}>  — {SKILLS[job.skill]?.describe}</Text>
            </Text>

            {job.active ? (
              <View style={[styles.awaken, styles.awakenActive]}>
                <Text style={styles.awakenActiveText}>★ Awakened</Text>
              </View>
            ) : hasJob ? (
              <View style={[styles.awaken, styles.awakenOff]}>
                <Text style={styles.awakenTextOff}>🔒 Needs a Class Change item</Text>
              </View>
            ) : (
              <Pressable
                disabled={!job.qualifies}
                onPress={() => awaken(job.id)}
                style={[styles.awaken, !job.qualifies && styles.awakenOff]}
              >
                <Text style={[styles.awakenText, !job.qualifies && styles.awakenTextOff]}>
                  {!pr.levelOk ? `Reach level ${JOB_LEVEL}` : job.qualifies ? "Awaken (permanent)" : "Requirements not met"}
                </Text>
              </Pressable>
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
  sub: { color: colors.textDim, fontSize: 14, marginTop: spacing(1), marginBottom: spacing(2), lineHeight: 20 },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 16, padding: spacing(2), marginBottom: spacing(2),
  },
  cardActive: { borderColor: colors.gold },
  head: { flexDirection: "row", alignItems: "center", marginBottom: spacing(1.5) },
  name: { color: colors.text, fontSize: 20, fontWeight: "800" },
  hiddenTag: { color: colors.gold, fontSize: 12, fontWeight: "700" },
  blurb: { color: colors.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
  label: { color: colors.textDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: spacing(1) },
  reqs: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5), marginTop: spacing(0.5) },
  req: { fontSize: 14, fontWeight: "700" },
  reqOk: { color: colors.accent },
  reqNo: { color: colors.hp },
  favor: { fontSize: 13, fontWeight: "600", marginTop: spacing(0.75) },
  perk: { color: colors.text, fontSize: 14, fontWeight: "600", marginTop: spacing(0.5) },
  skillDesc: { color: colors.textDim, fontSize: 12, fontWeight: "400" },
  awaken: {
    marginTop: spacing(2), backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: spacing(1.5), alignItems: "center",
  },
  awakenOff: { backgroundColor: colors.surfaceAlt },
  awakenText: { color: colors.bg, fontSize: 16, fontWeight: "800" },
  awakenTextOff: { color: colors.textDim },
  awakenActive: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.gold },
  awakenActiveText: { color: colors.gold, fontSize: 16, fontWeight: "800" },
});

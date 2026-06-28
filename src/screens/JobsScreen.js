// Jobs: each class has two advanced paths that awaken at level 20 once their
// stat requirements are met. Awakening grants a permanent stat perk and changes
// your avatar. You can switch between any jobs you currently qualify for.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { JOB_LEVEL, siblingJob } from "../../engine/jobs.js";
import { STAT_NAMES } from "../../engine/stats.js";
import { useStride } from "../state/StrideContext.js";
import { jobOptions, statsWithPassives } from "../game/profile.js";
import Avatar from "../components/Avatar.js";
import { colors, spacing } from "../theme.js";

export default function JobsScreen({ onBack }) {
  const { profile, awaken } = useStride();
  const options = jobOptions(profile);
  const stats = statsWithPassives(profile);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Stats</Text>
      </Pressable>

      <Text style={styles.title}>Jobs</Text>
      <Text style={styles.sub}>
        Advanced paths awaken at level {JOB_LEVEL} when you meet their stat
        requirements. Allocate toward the path you want.
      </Text>

      {options.map((job) => {
        const levelOk = profile.level >= JOB_LEVEL;
        const sib = siblingJob(job);
        const reqs = [
          { stat: job.signature.stat, need: job.signature.min },
          { stat: job.branch, need: job.branchMin },
        ];
        const favorOk = !sib || (stats[job.branch] || 0) > (stats[sib.branch] || 0);
        return (
          <View key={job.id} style={[styles.card, job.active && styles.cardActive]}>
            <View style={styles.head}>
              <Avatar classId={profile.classId} level={profile.level} job={job.id} size={64} />
              <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
                <Text style={styles.name}>{job.name}</Text>
                <Text style={styles.blurb}>{job.blurb}</Text>
              </View>
            </View>

            <Text style={styles.label}>Requires (level {JOB_LEVEL}+)</Text>
            <View style={styles.reqs}>
              {reqs.map(({ stat, need }) => {
                const have = stats[stat] || 0;
                const ok = have >= need;
                return (
                  <Text key={stat} style={[styles.req, ok ? styles.reqOk : styles.reqNo]}>
                    {STAT_NAMES[stat]} {have}/{need} {ok ? "✓" : ""}
                  </Text>
                );
              })}
            </View>
            {sib && (
              <Text style={[styles.favor, favorOk ? styles.reqOk : styles.reqNo]}>
                Lean into {STAT_NAMES[job.branch]} over {STAT_NAMES[sib.branch]}{" "}
                ({stats[job.branch] || 0} vs {stats[sib.branch] || 0}) {favorOk ? "✓" : "✗"}
              </Text>
            )}

            <Text style={styles.label}>Perk</Text>
            <Text style={styles.perk}>
              {Object.entries(job.mods).map(([s, v]) => `+${v} ${STAT_NAMES[s]}`).join("   ")}
            </Text>

            {job.active ? (
              <View style={[styles.awaken, styles.awakenActive]}>
                <Text style={styles.awakenActiveText}>★ Awakened</Text>
              </View>
            ) : (
              <Pressable
                disabled={!job.qualifies}
                onPress={() => awaken(job.id)}
                style={[styles.awaken, !job.qualifies && styles.awakenOff]}
              >
                <Text style={[styles.awakenText, !job.qualifies && styles.awakenTextOff]}>
                  {!levelOk ? `Reach level ${JOB_LEVEL}` : job.qualifies ? "Awaken" : "Requirements not met"}
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
  blurb: { color: colors.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
  label: { color: colors.textDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: spacing(1) },
  reqs: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5), marginTop: spacing(0.5) },
  req: { fontSize: 14, fontWeight: "700" },
  reqOk: { color: colors.accent },
  reqNo: { color: colors.hp },
  favor: { fontSize: 13, fontWeight: "600", marginTop: spacing(0.75) },
  perk: { color: colors.text, fontSize: 14, fontWeight: "600", marginTop: spacing(0.5) },
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

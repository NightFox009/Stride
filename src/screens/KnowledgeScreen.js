// Knowledge book: a bestiary of every monster. Collect their cores (from kills
// or idling) to "study" them; studied monsters grant a small bonus to all stats.

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import {
  bestiaryByZone, knowledgeTier, nextTierAt, tieredCount, discoveredCount,
  CORE_TIER_SIZE, DMG_PER_TIER,
} from "../../engine/knowledge.js";
import { useStride } from "../state/StrideContext.js";
import { colors, spacing } from "../theme.js";

export default function KnowledgeScreen({ onBack }) {
  const { profile } = useStride();
  const k = profile.knowledge || {};
  const zones = bestiaryByZone();
  const discovered = discoveredCount(k);
  const tiered = tieredCount(k);
  const total = zones.reduce((n, z) => n + z.monsters.length, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.back} onPress={onBack}>← Home</Text>
      <Text style={styles.title}>Knowledge Book</Text>
      <Text style={styles.sub}>
        Discovered {discovered}/{total} · {tiered} monster{tiered === 1 ? "" : "s"} ranked up
        {"\n"}Every {CORE_TIER_SIZE} cores of a monster raises its tier — each tier is
        +{Math.round(DMG_PER_TIER * 100)}% damage against THAT monster.
      </Text>

      {zones.map((z) => (
        <View key={z.name} style={styles.zone}>
          <Text style={styles.zoneName}>{z.name}</Text>
          {z.monsters.map((m) => {
            const cores = k[m.id] || 0;
            const tier = knowledgeTier(cores);
            const found = cores > 0;
            return (
              <View key={m.id} style={styles.row}>
                <Text style={[styles.mName, !found && styles.unknown]}>
                  {found ? m.name : "???"}
                  {tier > 0 ? <Text style={styles.studied}>  ✦ T{tier} · +{Math.round(tier * DMG_PER_TIER * 100)}%</Text> : null}
                  {m.kind !== "normal" ? <Text style={styles.kind}>  · {m.kind}</Text> : null}
                </Text>
                <Text style={styles.cores}>{cores}/{nextTierAt(cores)}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  back: { color: colors.exp, fontSize: 15, fontWeight: "700", marginBottom: spacing(1) },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  sub: { color: colors.textDim, fontSize: 13, marginTop: spacing(1), marginBottom: spacing(2), lineHeight: 19 },
  zone: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 14, padding: spacing(2), marginBottom: spacing(1.5),
  },
  zoneName: { color: colors.gold, fontSize: 15, fontWeight: "800", marginBottom: spacing(1) },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing(0.5) },
  mName: { color: colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
  unknown: { color: colors.textDim, fontStyle: "italic" },
  studied: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  kind: { color: colors.textDim, fontSize: 12 },
  cores: { color: colors.textDim, fontSize: 13, fontVariant: ["tabular-nums"] },
});

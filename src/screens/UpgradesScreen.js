// Gold Upgrades — the gold sink. Spend gold to permanently raise core combat
// attributes (Power, Vitality, Guard, Regen, Precision, Ferocity, Lifesteal,
// Haste). Each level costs more; bonuses layer on top of your stat build.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useStride } from "../state/StrideContext.js";
import { UPGRADES, UPGRADE_ORDER, upgradeGoldCost, upgradeMax } from "../../engine/upgrades.js";
import { colors, spacing } from "../theme.js";

function valueLabel(u, lvl) {
  const total = u.per * lvl;
  if (u.attr === "critMult") return `+${Math.round(total * 100)}% Crit Dmg`;
  if (u.attr === "lifesteal") return `+${Math.round(total * 100)}% Lifesteal`;
  if (u.attr === "critChance") return `+${total}% Crit`;
  return `+${total} ${u.unit}`;
}

export default function UpgradesScreen({ onBack }) {
  const { profile, purchaseUpgrade } = useStride();
  const gold = profile.gold || 0;
  const upgrades = profile.upgrades || {};

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>← Home</Text></Pressable>

      <View style={styles.rowBetween}>
        <Text style={styles.title}>Upgrades</Text>
        <Text style={styles.gold}>{gold.toLocaleString()} gold</Text>
      </View>
      <Text style={styles.sub}>
        Spend the gold you earn in the dungeon on permanent combat boosts. These
        stack on top of your stats and gear.
      </Text>

      {UPGRADE_ORDER.map((id) => {
        const u = UPGRADES[id];
        const lvl = upgrades[id] || 0;
        const max = upgradeMax(id);
        const maxed = lvl >= max;
        const cost = upgradeGoldCost(id, lvl);
        const afford = gold >= cost && !maxed;
        return (
          <View key={id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{u.label}</Text>
              <Text style={styles.lvl}>Lv {lvl}{max < 9999 ? `/${max}` : ""}</Text>
            </View>
            <Text style={styles.desc}>{u.desc}</Text>
            <Text style={styles.current}>
              Current: {lvl > 0 ? valueLabel(u, lvl) : "—"}
              {!maxed ? <Text style={styles.next}>   →   next: {valueLabel(u, lvl + 1)}</Text> : null}
            </Text>
            <Pressable
              disabled={!afford}
              onPress={() => purchaseUpgrade(id)}
              style={[styles.buy, !afford && styles.buyOff]}
            >
              <Text style={[styles.buyText, !afford && styles.buyTextOff]}>
                {maxed ? "MAXED" : `Buy · ${cost.toLocaleString()}g`}
              </Text>
            </Pressable>
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  gold: { color: colors.gold, fontSize: 16, fontWeight: "800" },
  sub: { color: colors.textDim, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: spacing(2) },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 14, padding: spacing(2), marginBottom: spacing(1.5),
  },
  name: { color: colors.text, fontSize: 17, fontWeight: "800" },
  lvl: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  desc: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  current: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: spacing(1) },
  next: { color: colors.textDim, fontWeight: "600" },
  buy: {
    marginTop: spacing(1.5), backgroundColor: colors.gold, borderRadius: 10,
    paddingVertical: spacing(1.25), alignItems: "center",
  },
  buyOff: { backgroundColor: colors.surfaceAlt },
  buyText: { color: colors.bg, fontWeight: "800", fontSize: 15 },
  buyTextOff: { color: colors.textDim },
});

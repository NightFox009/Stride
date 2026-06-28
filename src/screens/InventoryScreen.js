// Inventory & equipment: equip items into weapon/armor/accessory slots, unequip,
// or sell for gold. Equipped items fold into your combat stats.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SLOTS, RARITIES } from "../../engine/items.js";
import { STAT_NAMES } from "../../engine/stats.js";
import { useStride } from "../state/StrideContext.js";
import { colors, spacing } from "../theme.js";

const SLOT_LABEL = { weapon: "Weapon", armor: "Armor", accessory: "Accessory" };

function modText(item) {
  return Object.entries(item.mods || {})
    .map(([s, v]) => `+${v} ${s}`)
    .join("  ");
}

export default function InventoryScreen({ onBack }) {
  const { profile, equip, unequip, sell } = useStride();
  const inv = profile.inventory || [];
  const equipment = profile.equipment || {};

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Home</Text>
      </Pressable>

      <View style={styles.rowBetween}>
        <Text style={styles.title}>Gear</Text>
        <Text style={styles.gold}>{profile.gold || 0} gold</Text>
      </View>

      <Text style={styles.section}>Equipped</Text>
      {SLOTS.map((slot) => {
        const it = equipment[slot];
        const c = it ? RARITIES[it.rarity]?.color : colors.border;
        return (
          <View key={slot} style={[styles.card, { borderColor: c }]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.slotLabel}>{SLOT_LABEL[slot]}</Text>
                {it ? (
                  <>
                    <Text style={[styles.itemName, { color: c }]}>{it.name}</Text>
                    <Text style={styles.mods}>{modText(it)}</Text>
                  </>
                ) : (
                  <Text style={styles.empty}>— empty —</Text>
                )}
              </View>
              {it && (
                <Pressable onPress={() => unequip(slot)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Unequip</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      <Text style={styles.section}>Inventory ({inv.length})</Text>
      {inv.length === 0 && <Text style={styles.empty}>No items yet — clear dungeon floors to find loot.</Text>}
      {inv
        .slice()
        .sort((a, b) => (RARITIES[b.rarity]?.mult || 0) - (RARITIES[a.rarity]?.mult || 0))
        .map((it) => {
          const c = RARITIES[it.rarity]?.color;
          return (
            <View key={it.id} style={[styles.card, { borderColor: c }]}>
              <Text style={[styles.itemName, { color: c }]}>
                {it.name} <Text style={styles.slotTag}>· {SLOT_LABEL[it.slot]} · iLv{it.level}</Text>
              </Text>
              <Text style={styles.mods}>{modText(it)}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => equip(it.id)} style={[styles.smallBtn, styles.equipBtn]}>
                  <Text style={[styles.smallBtnText, { color: colors.bg }]}>Equip</Text>
                </Pressable>
                <Pressable onPress={() => sell(it.id)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Sell</Text>
                </Pressable>
              </View>
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
  gold: { color: colors.gold, fontSize: 16, fontWeight: "700" },
  section: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: spacing(2), marginBottom: spacing(1) },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: 12,
    padding: spacing(1.5), marginBottom: spacing(1),
  },
  slotLabel: { color: colors.textDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  itemName: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  slotTag: { color: colors.textDim, fontSize: 12, fontWeight: "500" },
  mods: { color: colors.text, fontSize: 13, marginTop: 3 },
  empty: { color: colors.textDim, fontSize: 13, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing(1), marginTop: spacing(1) },
  smallBtn: {
    backgroundColor: colors.surfaceAlt, borderRadius: 8,
    paddingHorizontal: spacing(1.5), paddingVertical: spacing(0.75),
  },
  equipBtn: { backgroundColor: colors.accent },
  smallBtnText: { color: colors.text, fontWeight: "700", fontSize: 13 },
});

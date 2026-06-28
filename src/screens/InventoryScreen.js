// Gear & Forge: equip/unequip/sell items, enhance them (+1..+30), and craft them
// up a rarity (keeps stats, adds one). Upgrades and rarity crafts cost gold +
// materials found in the dungeon.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SLOTS, RARITIES, itemMods } from "../../engine/items.js";
import {
  upgradeCost,
  rarityUpgradeCost,
  hasMaterials,
  MATERIALS,
  MATERIAL_ORDER,
  MAX_UPGRADE,
} from "../../engine/crafting.js";
import { useStride } from "../state/StrideContext.js";
import { colors, spacing } from "../theme.js";

const SLOT_LABEL = { weapon: "Weapon", armor: "Armor", accessory: "Accessory" };

function modText(item) {
  return Object.entries(itemMods(item))
    .map(([s, v]) => `+${v} ${s}`)
    .join("  ");
}

function costText(cost) {
  if (!cost) return "";
  const mats = Object.entries(cost.mats)
    .map(([k, q]) => `${q} ${MATERIALS[k].name.split(" ").pop()}`)
    .join(", ");
  return `${cost.gold}g${mats ? " + " + mats : ""}`;
}

export default function InventoryScreen({ onBack }) {
  const { profile, equip, unequip, sell, upgrade, craft } = useStride();
  const inv = profile.inventory || [];
  const equipment = profile.equipment || {};
  const materials = profile.materials || {};
  const afford = (cost) => cost && (profile.gold || 0) >= cost.gold && hasMaterials(materials, cost.mats);

  const ItemCard = ({ it, equipped, slot }) => {
    const c = RARITIES[it.rarity]?.color;
    const up = upgradeCost(it);
    const rar = rarityUpgradeCost(it);
    return (
      <View style={[styles.card, { borderColor: c }]}>
        <Text style={[styles.itemName, { color: c }]}>
          {it.name}
          {it.upgrade ? <Text style={styles.plus}> +{it.upgrade}</Text> : null}
          <Text style={styles.slotTag}>  · {SLOT_LABEL[it.slot]} · iLv{it.level}</Text>
        </Text>
        <Text style={styles.mods}>{modText(it)}</Text>

        <View style={styles.actions}>
          {equipped ? (
            <Btn label="Unequip" onPress={() => unequip(slot)} />
          ) : (
            <Btn label="Equip" primary onPress={() => equip(it.id)} />
          )}
          {up ? (
            <Btn
              label={`Upgrade +${up.level}`}
              sub={costText(up)}
              disabled={!afford(up)}
              onPress={() => upgrade(it.id)}
            />
          ) : (
            <Btn label={`Max +${MAX_UPGRADE}`} disabled />
          )}
          {rar && (
            <Btn
              label={`Craft → ${RARITIES[rar.target].name}`}
              sub={costText(rar)}
              disabled={!afford(rar)}
              onPress={() => craft(it.id)}
            />
          )}
          {!equipped && <Btn label="Sell" onPress={() => sell(it.id)} />}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Home</Text>
      </Pressable>

      <View style={styles.rowBetween}>
        <Text style={styles.title}>Gear & Forge</Text>
        <Text style={styles.gold}>{profile.gold || 0} gold</Text>
      </View>

      <Text style={styles.section}>Materials</Text>
      <View style={styles.matRow}>
        {MATERIAL_ORDER.map((m) => (
          <View key={m} style={styles.matChip}>
            <Text style={[styles.matName, { color: MATERIALS[m].color }]}>{MATERIALS[m].name.split(" ").pop()}</Text>
            <Text style={styles.matCount}>{materials[m] || 0}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Equipped</Text>
      {SLOTS.map((slot) =>
        equipment[slot] ? (
          <ItemCard key={slot} it={equipment[slot]} equipped slot={slot} />
        ) : (
          <View key={slot} style={[styles.card, { borderColor: colors.border }]}>
            <Text style={styles.slotLabel}>{SLOT_LABEL[slot]}</Text>
            <Text style={styles.empty}>— empty —</Text>
          </View>
        )
      )}

      <Text style={styles.section}>Inventory ({inv.length})</Text>
      {inv.length === 0 && <Text style={styles.empty}>No items yet — clear dungeon floors to find loot.</Text>}
      {inv
        .slice()
        .sort((a, b) => (RARITIES[b.rarity]?.mult || 0) - (RARITIES[a.rarity]?.mult || 0))
        .map((it) => (
          <ItemCard key={it.id} it={it} />
        ))}
    </ScrollView>
  );
}

function Btn({ label, sub, onPress, primary, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.btn, primary && styles.btnPrimary, disabled && styles.btnOff]}
    >
      <Text style={[styles.btnText, primary && { color: colors.bg }, disabled && styles.btnTextOff]}>{label}</Text>
      {sub ? <Text style={[styles.btnSub, disabled && styles.btnTextOff]}>{sub}</Text> : null}
    </Pressable>
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
  matRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1) },
  matChip: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: spacing(1.25), paddingVertical: spacing(0.75), alignItems: "center",
  },
  matName: { fontSize: 12, fontWeight: "700" },
  matCount: { color: colors.text, fontSize: 14, fontWeight: "800" },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: 12,
    padding: spacing(1.5), marginBottom: spacing(1),
  },
  slotLabel: { color: colors.textDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  itemName: { fontSize: 15, fontWeight: "800" },
  plus: { color: colors.gold, fontSize: 15, fontWeight: "800" },
  slotTag: { color: colors.textDim, fontSize: 12, fontWeight: "500" },
  mods: { color: colors.text, fontSize: 13, marginTop: 3 },
  empty: { color: colors.textDim, fontSize: 13, fontStyle: "italic", marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1), marginTop: spacing(1) },
  btn: {
    backgroundColor: colors.surfaceAlt, borderRadius: 8,
    paddingHorizontal: spacing(1.25), paddingVertical: spacing(0.75), alignItems: "center",
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnOff: { opacity: 0.4 },
  btnText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  btnTextOff: { color: colors.textDim },
  btnSub: { color: colors.textDim, fontSize: 10, marginTop: 1 },
});

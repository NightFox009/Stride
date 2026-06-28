// First-run screen: pick a base class. This is a permanent choice in the design,
// so we confirm the signature stat and skills up front.

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { BASE_CLASSES } from "../../engine/classes.js";
import { STAT_NAMES } from "../../engine/stats.js";
import { useStride } from "../state/StrideContext.js";
import { colors, spacing } from "../theme.js";

export default function ClassSelectScreen() {
  const { startGame } = useStride();
  const classes = Object.values(BASE_CLASSES);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose your path</Text>
      <Text style={styles.subtitle}>
        Your class is permanent. Every class boosts a different stat — and its
        signature skill scales off that same stat, so they're all viable.
      </Text>

      {classes.map((cls) => (
        <Pressable
          key={cls.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => startGame(cls.id)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{cls.name}</Text>
            <Text style={styles.boost}>+{STAT_NAMES[cls.boost]}</Text>
          </View>
          <Text style={styles.skills}>
            Skills: {cls.skills.join(", ").replace(/_/g, " ")}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2), paddingTop: spacing(7), paddingBottom: spacing(5) },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: spacing(1),
    marginBottom: spacing(3),
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  cardPressed: { backgroundColor: colors.surfaceAlt },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { color: colors.text, fontSize: 19, fontWeight: "700" },
  boost: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  skills: { color: colors.textDim, fontSize: 13, marginTop: spacing(0.5), textTransform: "capitalize" },
});

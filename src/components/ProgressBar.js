import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme.js";

// A labelled progress bar. `value`/`max` drive the fill; `color` themes it.
export default function ProgressBar({ label, value, max, color = colors.exp, suffix }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.floor(value)}
          {max != null ? ` / ${Math.round(max)}` : ""}
          {suffix ? ` ${suffix}` : ""}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  value: { color: colors.text, fontSize: 13, fontVariant: ["tabular-nums"] },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 5 },
});

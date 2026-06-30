// App root: wires the provider, a loading gate, and a tiny screen switcher.
// We intentionally avoid react-navigation for the shell — the app has three
// states (loading, no-save, playing) and one optional Stats view, so a small
// local switch keeps native deps minimal and the loop easy to reason about.

import React, { useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";

import { StrideProvider, useStride } from "./src/state/StrideContext.js";
import ClassSelectScreen from "./src/screens/ClassSelectScreen.js";
import HomeScreen from "./src/screens/HomeScreen.js";
import StatsScreen from "./src/screens/StatsScreen.js";
import SkillsScreen from "./src/screens/SkillsScreen.js";
import JobsScreen from "./src/screens/JobsScreen.js";
import InventoryScreen from "./src/screens/InventoryScreen.js";
import KnowledgeScreen from "./src/screens/KnowledgeScreen.js";
import UpgradesScreen from "./src/screens/UpgradesScreen.js";
import DungeonScreen from "./src/screens/DungeonScreen.js";
import { colors } from "./src/theme.js";

function Root() {
  const { loading, profile } = useStride();
  const [screen, setScreen] = useState("home");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading your avatar…</Text>
      </View>
    );
  }

  if (!profile) return <ClassSelectScreen />;

  if (screen === "stats")
    return (
      <StatsScreen
        onBack={() => setScreen("home")}
        onOpenSkills={() => setScreen("skills")}
        onOpenJobs={() => setScreen("jobs")}
      />
    );
  if (screen === "skills") return <SkillsScreen onBack={() => setScreen("stats")} />;
  if (screen === "jobs") return <JobsScreen onBack={() => setScreen("stats")} />;
  if (screen === "inventory") return <InventoryScreen onBack={() => setScreen("home")} />;
  if (screen === "knowledge") return <KnowledgeScreen onBack={() => setScreen("home")} />;
  if (screen === "upgrades") return <UpgradesScreen onBack={() => setScreen("home")} />;
  if (screen === "dungeon") return <DungeonScreen onBack={() => setScreen("home")} />;
  return (
    <HomeScreen
      onOpenStats={() => setScreen("stats")}
      onOpenDungeon={() => setScreen("dungeon")}
      onOpenInventory={() => setScreen("inventory")}
      onOpenKnowledge={() => setScreen("knowledge")}
      onOpenUpgrades={() => setScreen("upgrades")}
    />
  );
}

export default function App() {
  return (
    <StrideProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <Root />
      </SafeAreaView>
    </StrideProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  loadingText: { color: colors.textDim, marginTop: 12, fontSize: 14 },
});

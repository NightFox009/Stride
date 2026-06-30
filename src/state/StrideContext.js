// Central app state: owns the profile, loads/saves it, and exposes the actions
// the screens call. Fully idle: EXP comes from the dungeon (live or offline).

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { loadProfile, saveProfile, clearProfile } from "../game/persistence.js";
import {
  createProfile,
  applyOfflineProgress,
  applyAllocation,
  applyHpRegen,
  vitals,
  learnSkill,
  awakenJob,
  applyFloorResult,
  equipItem,
  unequipItem,
  sellItem,
  upgradeItem,
  craftItemRarity,
  deriveSheet,
  combatStats,
  primaryStatOf,
  allowedWeaponTypes,
  knowledgeHpBonuses,
} from "../game/profile.js";
import { createFloorSession } from "../../engine/dungeonSession.js";
import { createRng } from "../../engine/rng.js";

const StrideContext = createContext(null);

export function StrideProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  // Summary of what accrued while the app was closed (shown on Home, dismissable).
  const [offlineReport, setOfflineReport] = useState(null);

  // Keep the freshest profile in a ref so callbacks registered once always read
  // current state, never a stale closure.
  const profileRef = useRef(null);
  profileRef.current = profile;

  // Load the save once on startup: catch up HP/MP regen, then grant offline idle
  // progress for the real time elapsed since the player was last active.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadProfile();
      if (!cancelled) {
        let init = saved ? applyHpRegen(saved) : saved;
        if (init) {
          const off = applyOfflineProgress(init);
          init = off.profile;
          if (off.rewards) setOfflineReport(off.rewards);
        }
        setProfile(init);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick HP/MP regen every 30s while the app is open. applyHpRegen returns the
  // same object when nothing changed, so this is a no-op render otherwise.
  useEffect(() => {
    const id = setInterval(() => {
      setProfile((p) => (p ? applyHpRegen(p) : p));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Persist on every meaningful change (debounced lightly). We stamp lastSeenAt
  // on the stored copy (not React state) so the offline-accrual clock measures
  // from the last active moment, without churning renders.
  useEffect(() => {
    if (!profile) return;
    const id = setTimeout(() => saveProfile({ ...profile, lastSeenAt: Date.now() }), 150);
    return () => clearTimeout(id);
  }, [profile]);

  const startGame = useCallback((classId) => {
    setProfile(createProfile(classId));
  }, []);

  const resetGame = useCallback(async () => {
    await clearProfile();
    setProfile(null);
    setOfflineReport(null);
  }, []);

  const dismissOfflineReport = useCallback(() => setOfflineReport(null), []);

  const allocateStats = useCallback((alloc) => {
    setProfile((p) => (p ? applyAllocation(p, alloc) : p));
  }, []);

  const learn = useCallback((entryId) => {
    setProfile((p) => (p ? learnSkill(p, entryId) : p));
  }, []);

  const awaken = useCallback((jobId) => {
    setProfile((p) => (p ? awakenJob(p, jobId) : p));
  }, []);

  const equip = useCallback((itemId) => {
    setProfile((p) => (p ? equipItem(p, itemId) : p));
  }, []);
  const unequip = useCallback((slot) => {
    setProfile((p) => (p ? unequipItem(p, slot) : p));
  }, []);
  const sell = useCallback((itemId) => {
    setProfile((p) => (p ? sellItem(p, itemId) : p));
  }, []);
  const upgrade = useCallback((itemId) => {
    setProfile((p) => (p ? upgradeItem(p, itemId) : p));
  }, []);
  const craft = useCallback((itemId) => {
    setProfile((p) => (p ? craftItemRarity(p, itemId, createRng()) : p));
  }, []);

  // Start an interactive dungeon floor. Returns a session controller (see
  // engine/dungeonSession.js) the screen drives turn by turn. Descents are free
  // and unlimited (idle-style). Rewards are applied later via commitFloorResult.
  const beginFloorSession = useCallback(() => {
    let p = profileRef.current;
    if (!p) return null;
    // Catch up HP/MP regen before the descent.
    const regen = applyHpRegen(p);
    if (regen !== p) { p = regen; setProfile(p); }
    const floor = p.floor || 1;
    const v = vitals(p);
    const kb = knowledgeHpBonuses(p);
    return createFloorSession({
      floor,
      stats: combatStats(p), // base + passives + job perk
      skills: p.skills,
      skillLevels: p.skillLevels || {},
      primaryStat: primaryStatOf(p),
      weaponTypes: allowedWeaponTypes(p),
      classId: p.classId,
      knowledgeHP: kb.hp,
      knowledgeRegen: kb.hpRegen,
      startHP: v.hp,
      startMP: v.mp,
      level: p.level,
      rng: createRng(),
    });
  }, []);

  // Fold a finished floor's result back into the profile. Returns the level-ups
  // gained so the screen can celebrate them. Updates the ref synchronously so a
  // continuous descent can immediately begin the next floor on the fresh state.
  const commitFloorResult = useCallback((result) => {
    const p = profileRef.current;
    if (!p) return [];
    const { profile: next, levelsGained } = applyFloorResult(p, result);
    profileRef.current = next;
    setProfile(next);
    return levelsGained;
  }, []);

  const value = {
    loading,
    profile,
    sheet: profile ? deriveSheet(profile) : null,
    vitals: profile ? vitals(profile) : null,
    offlineReport,
    dismissOfflineReport,
    startGame,
    resetGame,
    allocateStats,
    learn,
    awaken,
    equip,
    unequip,
    sell,
    upgrade,
    craft,
    beginFloorSession,
    commitFloorResult,
  };

  return <StrideContext.Provider value={value}>{children}</StrideContext.Provider>;
}

export function useStride() {
  const ctx = useContext(StrideContext);
  if (!ctx) throw new Error("useStride must be used within a StrideProvider");
  return ctx;
}

// Central app state: owns the profile, loads/saves it, and exposes the actions
// the screens call. This is the single place steps turn into EXP/Energy.

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
  applySteps,
  convertSteps,
  applyAllocation,
  applyEnergyRegen,
  applyHpRegen,
  vitals,
  startCamp,
  claimCamp,
  stopCamp,
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
} from "../game/profile.js";
import { createFloorSession } from "../../engine/dungeonSession.js";
import { energyCost } from "../../engine/floors.js";
import { createRng } from "../../engine/rng.js";

const StrideContext = createContext(null);

export function StrideProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lastEarned, setLastEarned] = useState(null);

  // Keep the freshest profile in a ref so the step callback (registered once)
  // always applies steps to current state, never a stale closure.
  const profileRef = useRef(null);
  profileRef.current = profile;

  // Load the save once on startup (and catch up any offline Energy regen).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadProfile();
      if (!cancelled) {
        let init = saved ? applyHpRegen(applyEnergyRegen(saved)) : saved;
        // Grant offline idle accrual on return, then keep camping.
        if (init && init.idle) init = claimCamp(init).profile;
        setProfile(init);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick Energy regen every 30s while the app is open. applyEnergyRegen returns
  // the same object when nothing changed, so this is a no-op render otherwise.
  useEffect(() => {
    const id = setInterval(() => {
      setProfile((p) => (p ? applyHpRegen(applyEnergyRegen(p)) : p));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Persist on every meaningful change (debounced lightly).
  useEffect(() => {
    if (!profile) return;
    const id = setTimeout(() => saveProfile(profile), 150);
    return () => clearTimeout(id);
  }, [profile]);

  const startGame = useCallback((classId) => {
    setProfile(createProfile(classId));
  }, []);

  const resetGame = useCallback(async () => {
    await clearProfile();
    setProfile(null);
    setLastEarned(null);
  }, []);

  // The walk loop — just banks steps. Conversion to EXP/Energy is a player choice.
  const ingestSteps = useCallback((steps) => {
    const current = profileRef.current;
    if (!current || steps <= 0) return;
    const { profile: next } = applySteps(current, steps);
    setProfile(next);
  }, []);

  // Convert banked steps into "exp" or "energy". Returns the summary for the UI.
  const convert = useCallback((mode) => {
    const p = profileRef.current;
    if (!p) return null;
    const { profile: next, converted } = convertSteps(p, mode);
    setProfile(next);
    if (converted.steps > 0) setLastEarned(converted);
    return converted;
  }, []);

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
  const camp = useCallback(() => setProfile((p) => (p ? startCamp(p) : p)), []);
  const claimIdle = useCallback(() => setProfile((p) => (p ? claimCamp(p).profile : p)), []);
  const stopIdle = useCallback(() => setProfile((p) => (p ? stopCamp(p).profile : p)), []);
  const upgrade = useCallback((itemId) => {
    setProfile((p) => (p ? upgradeItem(p, itemId) : p));
  }, []);
  const craft = useCallback((itemId) => {
    setProfile((p) => (p ? craftItemRarity(p, itemId, createRng()) : p));
  }, []);

  // Start an interactive dungeon floor. Returns a session controller (see
  // engine/dungeonSession.js) the screen drives turn by turn, or null if there
  // isn't enough Energy. Rewards are applied later via commitFloorResult.
  const beginFloorSession = useCallback(() => {
    let p = profileRef.current;
    if (!p) return null;
    // Catch up regen so the freshest Energy/HP gate the descent.
    const regen = applyHpRegen(applyEnergyRegen(p));
    if (regen !== p) { p = regen; setProfile(p); }
    const floor = p.floor || 1;
    if (p.energy < energyCost(floor)) return null;
    const v = vitals(p);
    return createFloorSession({
      floor,
      stats: combatStats(p), // base + passives + job perk
      skills: p.skills,
      skillLevels: p.skillLevels || {},
      primaryStat: primaryStatOf(p),
      weaponTypes: allowedWeaponTypes(p),
      classId: p.classId,
      startHP: v.hp,
      startMP: v.mp,
      level: p.level,
      rng: createRng(),
    });
  }, []);

  // Fold a finished floor's result back into the profile. Returns the level-ups
  // gained so the screen can celebrate them.
  const commitFloorResult = useCallback((result) => {
    const p = profileRef.current;
    if (!p) return [];
    const { profile: next, levelsGained } = applyFloorResult(p, result);
    setProfile(next);
    return levelsGained;
  }, []);

  const value = {
    loading,
    profile,
    sheet: profile ? deriveSheet(profile) : null,
    vitals: profile ? vitals(profile) : null,
    lastEarned,
    startGame,
    resetGame,
    ingestSteps,
    convert,
    allocateStats,
    learn,
    awaken,
    equip,
    unequip,
    sell,
    upgrade,
    craft,
    camp,
    claimIdle,
    stopIdle,
    beginFloorSession,
    commitFloorResult,
    floorCost: profile ? energyCost(profile.floor || 1) : 0,
  };

  return <StrideContext.Provider value={value}>{children}</StrideContext.Provider>;
}

export function useStride() {
  const ctx = useContext(StrideContext);
  if (!ctx) throw new Error("useStride must be used within a StrideProvider");
  return ctx;
}

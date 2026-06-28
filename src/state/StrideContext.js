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
  allocateStat,
  applyFloorResult,
  deriveSheet,
} from "../game/profile.js";
import { autoPolicy } from "../game/combatPolicy.js";
import { runFloor } from "../../engine/dungeon.js";
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

  // Load the save once on startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadProfile();
      if (!cancelled) {
        setProfile(saved);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  // The walk loop. Safe to call from the pedometer subscription at any rate.
  const ingestSteps = useCallback((steps) => {
    const current = profileRef.current;
    if (!current || steps <= 0) return;
    const { profile: next, earned } = applySteps(current, steps);
    setProfile(next);
    if (earned.xp > 0 || earned.energy > 0) setLastEarned(earned);
  }, []);

  const spendStatPoint = useCallback((stat) => {
    setProfile((p) => (p ? allocateStat(p, stat) : p));
  }, []);

  // Run the current dungeon floor end-to-end with the shared auto-battle policy.
  // Returns the full run (events + outcome) for the screen to render, and folds
  // the rewards/penalty back into the profile. Returns null if too little Energy.
  const runDungeonFloor = useCallback(() => {
    const p = profileRef.current;
    if (!p) return null;
    const floor = p.floor || 1;
    if (p.energy < energyCost(floor)) return null;

    const result = runFloor({
      floor,
      stats: p.stats,
      skills: p.skills,
      choose: autoPolicy,
      rng: createRng(),
      energy: p.energy,
      level: p.level,
    });

    const { profile: next, levelsGained } = applyFloorResult(p, result);
    setProfile(next);
    return { ...result, floor, levelsGained };
  }, []);

  const value = {
    loading,
    profile,
    sheet: profile ? deriveSheet(profile) : null,
    lastEarned,
    startGame,
    resetGame,
    ingestSteps,
    spendStatPoint,
    runDungeonFloor,
    floorCost: profile ? energyCost(profile.floor || 1) : 0,
  };

  return <StrideContext.Provider value={value}>{children}</StrideContext.Provider>;
}

export function useStride() {
  const ctx = useContext(StrideContext);
  if (!ctx) throw new Error("useStride must be used within a StrideProvider");
  return ctx;
}

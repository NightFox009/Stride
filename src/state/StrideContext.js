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
  learnSkill,
  applyFloorResult,
  deriveSheet,
  statsWithPassives,
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

  // Start an interactive dungeon floor. Returns a session controller (see
  // engine/dungeonSession.js) the screen drives turn by turn, or null if there
  // isn't enough Energy. Rewards are applied later via commitFloorResult.
  const beginFloorSession = useCallback(() => {
    const p = profileRef.current;
    if (!p) return null;
    const floor = p.floor || 1;
    if (p.energy < energyCost(floor)) return null;
    return createFloorSession({
      floor,
      stats: statsWithPassives(p), // base allocation + passive bonuses
      skills: p.skills,
      skillLevels: p.skillLevels || {},
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
    lastEarned,
    startGame,
    resetGame,
    ingestSteps,
    convert,
    allocateStats,
    learn,
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

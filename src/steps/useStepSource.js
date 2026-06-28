// Step source: the bridge between the device pedometer and the game loop.
//
// On real hardware it subscribes to expo-sensors' Pedometer and reports the
// DELTA of steps since the last tick. On web / simulators / anywhere the
// pedometer is unavailable, `available` is false and the UI falls back to the
// manual "add steps" dev controls — so the whole loop is testable without a
// device.

import { useEffect, useRef, useState, useCallback } from "react";
import { Pedometer } from "expo-sensors";

export function useStepSource(onSteps) {
  const [available, setAvailable] = useState(null); // null = still checking
  const [error, setError] = useState(null);
  const lastCountRef = useRef(0);
  const onStepsRef = useRef(onSteps);
  onStepsRef.current = onSteps;

  useEffect(() => {
    let sub = null;
    let cancelled = false;

    (async () => {
      try {
        const isAvail = await Pedometer.isAvailableAsync();
        if (cancelled) return;
        setAvailable(isAvail);
        if (!isAvail) return;

        // On iOS this prompts for Motion permission; on Android, ACTIVITY_RECOGNITION.
        const perm = await Pedometer.requestPermissionsAsync?.();
        if (perm && perm.granted === false) {
          setAvailable(false);
          setError("Motion permission denied");
          return;
        }

        // watchStepCount reports cumulative steps since the subscription began;
        // we convert that to per-tick deltas for the game loop.
        sub = Pedometer.watchStepCount((result) => {
          const total = result.steps ?? 0;
          const delta = total - lastCountRef.current;
          lastCountRef.current = total;
          if (delta > 0) onStepsRef.current(delta);
        });
      } catch (err) {
        if (!cancelled) {
          setAvailable(false);
          setError(String(err?.message ?? err));
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  // Manual injection for the dev fallback (and for testing the loop anywhere).
  const addManualSteps = useCallback((n) => {
    onStepsRef.current(Math.max(0, Math.floor(n)));
  }, []);

  return { available, error, addManualSteps };
}

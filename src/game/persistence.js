// Offline-first local save. We use AsyncStorage for the shell — it's bulletproof
// in Expo Go and on device with zero native setup. The interface here is
// deliberately tiny (load / save / clear) so it can be swapped for expo-sqlite
// later without touching the rest of the app.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { SAVE_VERSION } from "./profile.js";

const SAVE_KEY = "stride:save:v1";

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return migrate(data);
  } catch (err) {
    console.warn("[stride] failed to load save:", err);
    return null;
  }
}

export async function saveProfile(profile) {
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    return true;
  } catch (err) {
    console.warn("[stride] failed to write save:", err);
    return false;
  }
}

export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.warn("[stride] failed to clear save:", err);
  }
}

// Forward-compatible migration hook. For now we just stamp the version.
function migrate(data) {
  if (!data || typeof data !== "object") return null;
  if (data.version !== SAVE_VERSION) {
    // No breaking migrations yet; keep the data and update the stamp.
    data.version = SAVE_VERSION;
  }
  return data;
}

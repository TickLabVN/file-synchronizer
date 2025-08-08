import { store } from "../lib/constants";

/**
 * Get the current settings
 * @returns Current settings object with darkMode property
 */
export async function getSettings(): Promise<{ darkMode: boolean }> {
  return store.get("settings", {
    darkMode: false,
  }) as { darkMode: boolean };
}

/** * Set new settings
 * @param newSettings New settings object to merge with current settings
 * @returns Updated settings object
 */
export async function setSettings(_: unknown, newSettings: Record<string, boolean>): Promise<Record<string, boolean>> {
  const curr = store.get("settings", {});
  const updated = { ...Object(curr), ...Object(newSettings) };
  store.set("settings", updated);
  return updated;
}

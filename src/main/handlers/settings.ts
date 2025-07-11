import "dotenv/config";
import { constants } from "../lib/constants";
const { store } = constants;

// Handle retrieving the current settings
export async function getSettings(): Promise<{ darkMode: boolean }> {
    return store.get("settings", {
        darkMode: false,
    }) as { darkMode: boolean };
}

// Handle updating the settings
export async function updateSettings(
    _: unknown,
    newSettings: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const curr = store.get("settings", {});
    const updated = { ...Object(curr), ...Object(newSettings) };
    store.set("settings", updated);
    return updated;
}

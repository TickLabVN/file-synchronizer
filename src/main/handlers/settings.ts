import { store } from "../lib/constants";

// Handle retrieving the current settings
export async function getSettings(): Promise<{ darkMode: boolean }> {
    return store.get("settings", {
        darkMode: false,
    }) as { darkMode: boolean };
}

// Handle updating the settings
export async function setSettings(
    _: unknown,
    newSettings: Record<string, boolean>
): Promise<Record<string, boolean>> {
    const curr = store.get("settings", {});
    const updated = { ...Object(curr), ...Object(newSettings) };
    store.set("settings", updated);
    return updated;
}

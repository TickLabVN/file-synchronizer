import "dotenv/config";
import { constants } from "../lib/constants";
const { store } = constants;

// Handle retrieving the current settings
export async function getSettings() {
    return store.get("settings", {
        autoDeleteOnLaunch: false,
        autoUpdateOnLaunch: false,
        darkMode: false,
    });
}

// Handle updating the settings
export async function updateSettings(_, newSettings) {
    const curr = store.get("settings", {});
    const updated = { ...curr, ...newSettings };
    store.set("settings", updated);
    return updated;
}

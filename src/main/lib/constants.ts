import Store from "electron-store";
import { is } from "@electron-toolkit/utils";
import { randomUUID } from "crypto";

/**
 * Backend URL for the application.
 * This URL is used to connect to the backend server for file synchronization.
 * In development mode, it points to a local server,
 * while in production, it points to a deployed server.
 */
export const BACKEND_URL = is.dev
    ? "http://localhost:3000"
    : "https://file-synchronizer.onrender.com";

/**
 * Store instance for managing application settings and state.
 * This instance uses Electron Store to persist data across application sessions.
 * It is used to store settings such as the device ID and other user preferences.
 * @type {Store}
 */
export const store: Store = new Store();

/**
 * Unique device identifier.
 * This ID is generated once and stored in the application settings.
 * It is used to uniquely identify the device for synchronization purposes.
 */
export const deviceId: string = (() => {
    const existing = store.get("deviceId") as string | undefined;
    if (existing) return existing;
    const id = randomUUID();
    store.set("deviceId", id);
    return id;
})();

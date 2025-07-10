import Store from "electron-store";
import { is } from "@electron-toolkit/utils";
import { randomUUID } from "crypto";

export const BACKEND_URL = is.dev
    ? "http://localhost:3000"
    : "https://file-synchronizer.onrender.com";

export const store = new Store();

export const deviceId: string = (() => {
    const existing = store.get("deviceId") as string | undefined;
    if (existing) return existing;
    const id = randomUUID();
    store.set("deviceId", id);
    return id;
})();

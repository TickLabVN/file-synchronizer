import Store from "electron-store";
import { is } from "@electron-toolkit/utils";
import { randomUUID } from "crypto";

const BACKEND_URL = is.dev
    ? "http://localhost:3000"
    : "https://file-synchronizer.onrender.com";
const store = new Store();
const driveMapping = store.get("driveMapping", {});
const boxMapping = store.get("boxMapping", {});
const deviceId =
    store.get("deviceId") ||
    (() => {
        const id = randomUUID();
        store.set("deviceId", id);
        return id;
    })();

export const constants = {
    BACKEND_URL,
    store,
    driveMapping,
    boxMapping,
    deviceId,
};

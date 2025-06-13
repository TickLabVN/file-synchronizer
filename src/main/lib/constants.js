import Store from "electron-store";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const store = new Store();
const mapping = store.get("driveMapping", {});

export const constants = {
    BACKEND_URL,
    store,
    mapping,
};

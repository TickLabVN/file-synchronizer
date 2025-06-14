import Store from "electron-store";
import { is } from "@electron-toolkit/utils";

const BACKEND_URL = is.dev
    ? "http://localhost:3000"
    : "https://file-synchronizer.onrender.com";
const store = new Store();
const mapping = store.get("driveMapping", {});

export const constants = {
    BACKEND_URL,
    store,
    mapping,
};

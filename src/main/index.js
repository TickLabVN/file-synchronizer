import { app, BrowserWindow } from "electron";
import "dotenv/config";
import createWindow from "./window";
import { constants } from "./lib/constants";
import registerIpcHandlers from "./ipcHandlers";
const { BACKEND_URL } = constants;
import { getTokenKeytar } from "./lib/credentials";

// Register IPC handlers for various functionalities
registerIpcHandlers();

app.whenReady().then(async () => {
    // Check if the Google Drive tokens are saved
    const saved = await getTokenKeytar();
    if (saved) {
        fetch(`${BACKEND_URL}/auth/set-tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saved),
        }).catch(console.error);
    }

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

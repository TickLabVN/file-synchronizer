import { app, BrowserWindow } from "electron";
import "dotenv/config";
import createWindow from "./window";
import { constants } from "./lib/constants";
import registerIpcHandlers from "./ipcHandlers";
const { oauth2Client, store } = constants;

// Register IPC handlers for various functionalities
registerIpcHandlers();

app.whenReady().then(() => {
    // Check if the Google Drive tokens are saved
    const saved = store.get("google-drive-tokens");
    if (saved) {
        oauth2Client.setCredentials(saved);
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

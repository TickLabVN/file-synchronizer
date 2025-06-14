import { app, BrowserWindow, dialog } from "electron";
import "dotenv/config";
import createWindow from "./window";
import { constants } from "./lib/constants";
import registerIpcHandlers from "./ipcHandlers";
const { BACKEND_URL } = constants;
import { getTokenKeytar } from "./lib/credentials";
import pkg from "electron-updater";
const { autoUpdater } = pkg;

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

    autoUpdater.checkForUpdatesAndNotify();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Handle the case when have new version available
autoUpdater.on("update-available", (info) => {
    dialog.showMessageBox({
        type: "info",
        title: "Have a new version",
        message: `A new version ${info.version} is available. Downloading now...`,
        buttons: ["OK"],
    });
});

// Handle downloaded updates
autoUpdater.on("update-downloaded", () => {
    dialog
        .showMessageBox({
            type: "info",
            title: "Update Downloaded",
            message:
                "The update has been downloaded. Restart the application to apply the update.",
            buttons: ["Restart", "Later"],
        })
        .then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
});

autoUpdater.on("error", (err) => {
    console.error("Error when update:", err);
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

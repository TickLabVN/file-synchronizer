import { app, BrowserWindow, dialog } from "electron";
import "dotenv/config";
import createWindow from "./window";
import { constants } from "./lib/constants";
import registerIpcHandlers from "./ipcHandlers";
const { BACKEND_URL, store } = constants;
import { getTokenKeytar } from "./lib/credentials";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { is } from "@electron-toolkit/utils";

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

    if (!is.dev) {
        autoUpdater.checkForUpdatesAndNotify();
    } else {
        console.log("Running in development mode, skipping auto-updater.");
    }

    // Notify successful update
    const pending = store.get("pendingUpdate");
    if (pending && pending.version) {
        dialog.showMessageBox({
            type: "info",
            title: `Update successful`,
            message: `You have successfully updated to version ${pending.version}.`,
            detail: pending.notes,
            buttons: ["OK"],
        });
        store.delete("pendingUpdate");
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Handle the case when have new version available
autoUpdater.on("update-available", (info) => {
    const win = BrowserWindow.getFocusedWindow();
    dialog
        .showMessageBox(win, {
            type: "info",
            title: "Have a new version",
            message: `A new version ${info.version} is available. Downloading now...`,
            buttons: ["OK", "Cancel"],
        })
        .then(({ response }) => {
            if (response === 0) {
                win.setProgressBar(0);
            }
        });
});

// Handle download progress
autoUpdater.on("download-progress", (progress) => {
    const win = BrowserWindow.getFocusedWindow();
    win.setProgressBar(progress.percent / 100);
});

// Handle downloaded updates
autoUpdater.on("update-downloaded", (info) => {
    const win = BrowserWindow.getFocusedWindow();
    store.set("pendingUpdate", {
        version: info.version,
        notes: info.releaseNotes || info.releaseNotesPlainText,
    });
    win.setProgressBar(-1);

    dialog
        .showMessageBox(win, {
            type: "info",
            title: "Update Downloaded",
            message:
                "The update has been downloaded. Restart the application to apply the update.",
            buttons: ["Restart", "Later"],
        })
        .then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall();
            } else {
                store.delete("pendingUpdate");
                console.log("Update will be applied later.");
            }
        });
});

autoUpdater.on("error", (err) => {
    console.error("Error when update:", err);
    const win = BrowserWindow.getFocusedWindow();
    dialog.showMessageBox(win, {
        type: "error",
        title: "Update Error",
        message: "An error occurred while checking for updates.",
        detail: err.message,
        buttons: ["OK"],
    });
    win.setProgressBar(-1);
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

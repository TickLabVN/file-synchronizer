import { app, BrowserWindow, dialog, Tray, Menu, nativeImage } from "electron";
import "dotenv/config";
import createWindow from "./window";
import { constants } from "./lib/constants";
import registerIpcHandlers from "./ipcHandlers";
const { BACKEND_URL, store } = constants;
import { getTokenKeytar, getBoxTokenKeytar } from "./lib/credentials";
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { syncOnLaunch } from "./handlers/sync";
import path from "path";
import fs from "fs";

// eslint-disable-next-line no-unused-vars
let isUpdating = false;
let mainWindow;
let tray;
let isQuiting = false;

async function shouldSync() {
    const tokens = (await getTokenKeytar()) || (await getBoxTokenKeytar());
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    let centralFolderPath = null;
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        ({ centralFolderPath } = JSON.parse(raw));
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
    return Boolean(tokens && centralFolderPath);
}

// Prevent multiple instances of the app from running
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Register IPC handlers for various functionalities
registerIpcHandlers();

function broadcast(channel, payload) {
    BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send(channel, payload);
    });
}

app.whenReady().then(async () => {
    // Check if the Google Drive tokens are saved
    const saved = await getTokenKeytar();
    if (saved) {
        fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saved),
        }).catch(console.error);
    }

    // Check if the Box tokens are saved
    const boxSaved = await getBoxTokenKeytar();
    if (boxSaved) {
        fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(boxSaved),
        }).catch(console.error);
    }

    mainWindow = createWindow();

    if (!is.dev) {
        autoUpdater.autoDownload = false;
        autoUpdater.checkForUpdates();
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
            buttons: ["OK"],
        });
        store.delete("pendingUpdate");
    }

    app.on("activate", () => {
        if (mainWindow) {
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        } else {
            mainWindow = createWindow();
        }
    });

    // Create a tray icon
    const trayIcon = nativeImage.createFromPath(icon);
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
        { label: "Open App", click: () => mainWindow.show() },
        {
            label: "Quit",
            click: () => {
                isQuiting = true;
                app.quit();
            },
        },
    ]);
    tray.setToolTip("File Synchornizer");
    tray.setContextMenu(contextMenu);
    tray.on("click", () =>
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    );

    // Close the app when the main window is closed
    mainWindow.on("close", (e) => {
        if (!isQuiting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    // First sync on launch
    if (await shouldSync()) {
        console.log("[Background] Starting syncOnLaunch on app ready");
        try {
            await syncOnLaunch();
            console.log("[Background] syncOnLaunch completed");
            broadcast("app:tracked-files-updated");
        } catch (err) {
            console.error("[Background] syncOnLaunch error:", err);
        }
    } else {
        console.log("[Background] No sync needed on launch");
    }
});

// Set five minutes interval to sync on launch
const FIVE_MIN = 5 * 60 * 1000;
setInterval(async () => {
    if (await shouldSync()) {
        try {
            await syncOnLaunch();
            console.log("[Background] syncOnLaunch completed");
            broadcast("app:tracked-files-updated");
        } catch (err) {
            console.error("[Background] syncOnLaunch error:", err);
        }
    } else {
        console.log("[Background] No sync needed at this interval");
    }
}, FIVE_MIN);

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
            if (response === 0 && win) {
                isUpdating = true;
                broadcast("app:update-available", info);
                autoUpdater.downloadUpdate();
            }
        });
});

// Handle downloaded updates
autoUpdater.on("update-downloaded", (info) => {
    const win = BrowserWindow.getFocusedWindow();
    store.set("pendingUpdate", {
        version: info.version,
    });
    isUpdating = false;
    broadcast("app:update-downloaded", info);
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
    isUpdating = false;
    dialog.showMessageBox(win, {
        type: "error",
        title: "Update Error",
        message: "An error occurred while checking for updates.",
        detail: err.message,
        buttons: ["OK"],
    });
});

import { app, BrowserWindow, dialog, Tray, Menu, nativeImage } from "electron";
import "dotenv/config";
import createWindow from "./window";
import { constants } from "./lib/constants";
import registerIpcHandlers from "./ipcHandlers";
import {
    listGDTokens,
    getGDTokens,
    listBoxTokens,
    getBoxTokens,
} from "./lib/credentials";
import pkg from "electron-updater";
import { is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { syncAllOnLaunch } from "./handlers/sync";
import path from "path";
import fs from "fs";
import createCentralFolder from "./utils/centralConfig";
import getDriveClient from "./utils/getDriveClient.js";
import { getBoxClient } from "./utils/getBoxClient.js";
import { cleanupDriveLockOnExit, cleanupBoxLockOnExit } from "./utils/lock.js";

const { BACKEND_URL, store } = constants;
const { autoUpdater } = pkg;
const BASE_INTERVAL = 10 * 1000;
const JITTER_RANGE = 30 * 1000;
function nextDelay() {
    return BASE_INTERVAL + (Math.random() * 2 - 1) * JITTER_RANGE;
}

let isUpdating = false;
let mainWindow;
let tray;
let isQuiting = false;
let activeProvider = null; // "google" | "box"
let hasCleanedLocks = false;

async function cleanupAllLocks() {
    /* ----- GOOGLE DRIVE ----- */
    const gdAccounts = await listGDTokens();
    for (const { email, tokens } of gdAccounts) {
        try {
            await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
            const drive = await getDriveClient();
            const {
                data: { files },
            } = await drive.files.list({
                q: "name='__ticklabfs_backup' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: "files(id)",
                spaces: "drive",
            });
            if (files.length) {
                await cleanupDriveLockOnExit(drive, files[0].id);
            }
        } catch (err) {
            console.error(`[exit] Drive ${email}:`, err);
        }
    }

    /* ----- BOX ----- */
    const boxAccounts = await listBoxTokens();
    for (const { login, tokens } of boxAccounts) {
        try {
            await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
            const client = await getBoxClient();
            const rootItems = await client.folders.getItems("0", {
                fields: "id,type,name",
                limit: 1000,
            });
            const backup = rootItems.entries.find(
                (it) => it.type === "folder" && it.name === "__ticklabfs_backup"
            );
            if (backup) {
                await cleanupBoxLockOnExit(client, backup.id);
            }
        } catch (err) {
            console.error(`[exit] Box ${login}:`, err);
        }
    }
}

async function shouldSync() {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    let centralFolderPath = null;
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        ({ centralFolderPath } = JSON.parse(raw));
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }

    const gd = store.get("gdActive");
    if (gd && (await getGDTokens(gd))) return !!centralFolderPath;

    const bx = store.get("boxActive");
    if (bx && (await getBoxTokens(bx))) return !!centralFolderPath;

    return false;
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

async function scheduleSync() {
    const run = async () => {
        if (await shouldSync()) {
            try {
                await syncAllOnLaunch();
                console.log("[Background] sync completed");
                broadcast("app:tracked-files-updated");
            } catch (err) {
                console.error("[Background] sync error:", err);
            }
        }
        setTimeout(run, nextDelay()); // lên lịch cho lần kế tiếp
    };
    run(); // chạy NGAY lập tức khi app khởi động
}

app.whenReady().then(async () => {
    // Create the central folder automatically
    try {
        await createCentralFolder();
    } catch (err) {
        console.error("Error creating central folder:", err);
        dialog.showErrorBox(
            "Central Folder Error",
            "Failed to create the central folder. Please check your permissions."
        );
        app.quit();
        return;
    }

    const gdActive = store.get("gdActive");
    const boxActive = store.get("boxActive");

    if (gdActive) {
        const tk = await getGDTokens(gdActive);
        if (tk) {
            await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tk),
            });
            activeProvider = "google";
        }
    } else if (boxActive) {
        const tk = await getBoxTokens(boxActive);
        if (tk) {
            await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tk),
            });
            activeProvider = "box";
        }
    }

    /* Nếu chưa có “active” ⇒ chọn account đầu tiên tìm thấy */
    if (!activeProvider) {
        const gd = await listGDTokens();
        if (gd.length) {
            const { email, tokens } = gd[0];
            await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
            store.set("gdActive", email);
            activeProvider = "google";
        } else {
            const bx = await listBoxTokens();
            if (bx.length) {
                const { login, tokens } = bx[0];
                await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(tokens),
                });
                store.set("boxActive", login);
                activeProvider = "box";
            }
        }
    }
    mainWindow = createWindow();

    mainWindow.webContents.on("did-finish-load", () => {
        broadcast("cloud-accounts-updated");
    });

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

    app.once("before-quit", async (e) => {
        if (hasCleanedLocks || isUpdating) return;
        e.preventDefault();
        hasCleanedLocks = true;
        try {
            await cleanupAllLocks();
        } catch (err) {
            console.error("[exit] cleanupAllLocks:", err);
        } finally {
            app.quit(); // graceful
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
    scheduleSync();
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

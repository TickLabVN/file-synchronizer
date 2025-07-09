import { app, BrowserWindow, dialog } from "electron";
import { constants } from "../lib/constants";
import registerIpcHandlers from "../ipc/ipcHandlers";
import { listGDTokens, listBoxTokens } from "../lib/credentials";
import createCentralFolder from "../utils/centralConfig";
import getDriveClient from "../utils/getDriveClient";
import { getBoxClient } from "../utils/getBoxClient";
import { cleanupDriveLockOnExit, cleanupBoxLockOnExit } from "../utils/lock";
import createMainWindow from "../windows/mainWindow";
import { setMainWindow, broadcast } from "../windows/WindowManager";
import { startSyncScheduler } from "./syncScheduler";
import { initialiseUpdater, isUpdating } from "./updater";
import createAppTray from "../windows/AppTray";

const { BACKEND_URL, store } = constants;

let isQuit: boolean = false;
let hasCleanedLocks: boolean = false;

async function cleanupAllLocks(): Promise<void> {
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
            if (files && files.length) {
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

export default async function bootstrap(): Promise<void> {
    // Prevent multiple instances of the app from running
    const gotLock: boolean = app.requestSingleInstanceLock();
    if (!gotLock) {
        app.quit();
        return;
    }
    app.on("second-instance", () => {
        const win: BrowserWindow | undefined = BrowserWindow.getAllWindows()[0];
        if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });

    // Register IPC handlers for various functionalities
    registerIpcHandlers();

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

        const gdAccounts = await listGDTokens(); // ⇐ [{ email, tokens }]
        for (const { tokens } of gdAccounts) {
            await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
        }

        const bxAccounts = await listBoxTokens(); // ⇐ [{ login, tokens }]
        for (const { tokens } of bxAccounts) {
            await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
        }

        const mainWindow = createMainWindow();
        setMainWindow(mainWindow);

        mainWindow.webContents.on("did-finish-load", () =>
            broadcast("cloud-accounts-updated")
        );

        initialiseUpdater();
        startSyncScheduler();

        // Notify successful update
        const pending = store.get("pendingUpdate") as
            | { version?: string }
            | undefined;
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
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        });

        app.once("before-quit", async (e) => {
            if (hasCleanedLocks || isUpdating()) return;
            e.preventDefault();
            hasCleanedLocks = true;
            try {
                await cleanupAllLocks();
            } catch (err) {
                console.error("[exit] cleanupAllLocks:", err);
            } finally {
                app.quit();
            }
        });
        // Create the system tray icon
        createAppTray(mainWindow, () => {
            isQuit = true;
        });
        // Close the app when the main window is closed
        mainWindow.on("close", (e) => {
            if (!isQuit) {
                e.preventDefault();
                mainWindow.hide();
            }
        });
    });
}

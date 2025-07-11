import { app, BrowserWindow, dialog } from "electron";
import registerIpcHandlers from "../ipc/ipcHandlers";
import createCentralFolder from "../utils/createCentralFolder";
import createMainWindow from "../windows/mainWindow";
import { setMainWindow, broadcast } from "../windows/WindowManager";
import { startSyncScheduler } from "./syncScheduler";
import { initialiseUpdater, isUpdating } from "./updater";
import createAppTray from "../windows/appTray";
import provider from "./provider";
import { allProviders } from "../lib/providerRegistry";
import { store } from "../lib/constants";

let isQuit: boolean = false;
let hasCleanedLocks: boolean = false;

/**
 * Cleans up all locks on exit by removing backup folders from Google Drive and Box.
 * This function is called when the app is about to quit.
 * @returns {Promise<void>} A promise that resolves when the cleanup is complete.
 */
async function cleanupAllLocks(): Promise<void> {
    const BACKUP_FOLDER = "__ticklabfs_backup";
    for (const provider of allProviders()) {
        try {
            if (provider.cleanupLockOnExit) {
                await provider.cleanupLockOnExit(BACKUP_FOLDER);
            }
        } catch (err) {
            console.error(`[exit] cleanup lock for ${provider.id}:`, err);
        }
    }
}

/**
 * Asynchronously bootstraps the Electron application.
 * This function initializes the application, sets up IPC handlers, creates the main window,
 * @returns {Promise<void>} A promise that resolves when the bootstrap process is complete.
 * handles Google Drive and Box tokens, and sets up the system tray icon.
 */
export default async function bootstrap(): Promise<void> {
    // Register cloud providers
    await provider();
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

        // Create the main application window
        const mainWindow = createMainWindow();
        setMainWindow(mainWindow);

        // Load the main application page
        mainWindow.webContents.on("did-finish-load", () =>
            broadcast("cloud-accounts-updated")
        );

        // Check updates and initialize the updater
        initialiseUpdater();

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

        // Start the sync scheduler
        startSyncScheduler();

        // Create the system tray icon
        createAppTray(mainWindow, () => {
            isQuit = true;
        });

        // Activate the main window when the app is activated
        app.on("activate", () => {
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        });

        // Handle the app's before-quit event to clean up locks
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

        // Close the app when the main window is closed
        mainWindow.on("close", (e) => {
            if (!isQuit) {
                e.preventDefault();
                mainWindow.hide();
            }
        });
    });
}

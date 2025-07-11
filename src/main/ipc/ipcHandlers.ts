import { ipcMain } from "electron";
import * as auth from "../handlers/auth";
import * as selection from "../handlers/selection";
import * as settings from "../handlers/settings";
import * as sync from "../handlers/sync";
import * as tracked from "../handlers/trackedFiles";

/**
 * Registers IPC handlers for various application functionalities.
 * This function sets up the communication between the main process and renderer processes
 * for handling authentication, file selection, application settings, synchronization,
 * and tracking of files.
 */
export default function registerIpcHandlers(): void {
    /* ----------  Auth (provider‑agnostic)  ---------- */
    ipcMain.handle("provider:sign-in", auth.signIn);
    ipcMain.handle("provider:list-accounts", auth.listAccounts);
    ipcMain.handle("provider:use-account", auth.useAccount);
    ipcMain.handle("provider:get-profile", auth.getProfile);
    ipcMain.handle("provider:sign-out", auth.signOut);

    /* ----------  File / folder selection  ---------- */
    ipcMain.handle("fs:select-files", selection.selectFiles);
    ipcMain.handle("fs:select-folders", selection.selectFolders);
    ipcMain.handle("fs:list-directory", selection.listDirectory);
    ipcMain.handle("fs:open-in-explorer", selection.openInExplorer);

    /* ----------  Application settings  ---------- */
    ipcMain.handle("app:get-settings", settings.getSettings);
    ipcMain.handle("app:set-settings", settings.setSettings);

    /* ----------  Sync operations  ---------- */
    ipcMain.handle("sync:sync-files", sync.syncFiles);
    ipcMain.handle("sync:pull", sync.pull);
    ipcMain.handle("sync:auto-sync", sync.autoSync);

    /* ----------  Tracked items  ---------- */
    ipcMain.handle("tracked:track-file", tracked.trackedFile);
    ipcMain.handle("tracked:delete-file", tracked.deleteTrackedFile);
}

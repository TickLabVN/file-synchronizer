import { ipcMain } from "electron";
import * as auth from "../handlers/auth";
import * as selection from "../handlers/selection";
import * as settings from "../handlers/settings";
import * as sync from "../handlers/sync";
import * as trackedFiles from "../handlers/trackedFiles";

export default function registerIpcHandlers(): void {
    // GOOGLE DRIVE
    ipcMain.handle("google-drive:sign-in", auth.handleSignIn);
    ipcMain.handle("google-drive:list-accounts", auth.listAccounts);
    ipcMain.handle("google-drive:use-account", auth.useAccount);
    ipcMain.handle("google-drive:get-profile", auth.getGoogleProfile);
    ipcMain.handle("google-drive:sign-out", auth.handleSignOut);

    // BOX
    ipcMain.handle("box:sign-in", auth.handleBoxSignIn);
    ipcMain.handle("box:list-accounts", auth.listBoxAccounts);
    ipcMain.handle("box:use-account", auth.useBoxAccount);
    ipcMain.handle("box:get-profile", auth.getBoxProfile);
    ipcMain.handle("box:sign-out", auth.handleBoxSignOut);

    // Register IPC handlers for file and folder selection
    ipcMain.handle("app:select-files", selection.selectFiles);
    ipcMain.handle("app:select-folders", selection.selectFolders);
    ipcMain.handle("app:select-stop-sync-files", selection.selectStopSyncFiles);
    ipcMain.handle("app:list-directory", selection.listDirectory);
    ipcMain.handle("app:open-in-explorer", selection.openInExplorer);

    // Register IPC handlers for settings
    ipcMain.handle("app:get-settings", settings.getSettings);
    ipcMain.handle("app:update-settings", settings.updateSettings);

    // Register IPC handlers for sync operations
    ipcMain.handle("app:sync-files", sync.syncFiles);
    ipcMain.handle("app:sync-on-launch", sync.syncOnLaunch);
    ipcMain.handle("app:pull-from-drive", sync.pullFromDrive);
    // Register IPC handlers for Box sync
    ipcMain.handle("app:sync-box-files", sync.syncBoxFiles);
    ipcMain.handle("app:sync-box-on-launch", sync.syncBoxOnLaunch);
    ipcMain.handle("app:pull-from-box", sync.pullFromBox);

    // Register IPC handlers for tracked files
    ipcMain.handle("app:get-tracked-files", trackedFiles.getTrackedFiles);
    ipcMain.handle("app:delete-tracked-file", trackedFiles.deleteTrackedFile);
    ipcMain.handle(
        "app:get-tracked-files-box",
        trackedFiles.getTrackedFilesBox
    );
    ipcMain.handle(
        "app:delete-tracked-file-box",
        trackedFiles.deleteTrackedFileBox
    );
}

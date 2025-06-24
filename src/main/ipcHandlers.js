import { ipcMain } from "electron";
import * as auth from "./handlers/auth";
import * as selection from "./handlers/selection";
import * as settings from "./handlers/settings";
import * as sync from "./handlers/sync";
import * as trackedFiles from "./handlers/trackedFiles";

export default function registerIpcHandlers() {
    // Register IPC handlers for Google Drive authentication and user information
    ipcMain.handle("google-drive:sign-in", auth.handleSignIn);
    ipcMain.handle("google-drive:get-tokens", auth.getTokens);
    ipcMain.handle("google-drive:get-username", auth.getUserName);
    ipcMain.handle("app:sign-out", auth.handleSignOut);
    // Register IPC handlers for Box authentication
    ipcMain.handle("box:sign-in", auth.handleBoxSignIn);
    ipcMain.handle("box:get-tokens", auth.getBoxTokens);
    ipcMain.handle("box:get-username", auth.getBoxUserName);
    ipcMain.handle("box:sign-out", auth.handleBoxSignOut);

    // Register IPC handlers for file and folder selection
    ipcMain.handle("app:select-files", selection.selectFiles);
    ipcMain.handle("app:select-folders", selection.selectFolders);
    ipcMain.handle("app:select-stop-sync-files", selection.selectStopSyncFiles);

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

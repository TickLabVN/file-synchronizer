import { ipcMain } from "electron";
import * as auth from "./handlers/auth";
import * as centralConfig from "./handlers/centralConfig";
import * as selection from "./handlers/selection";
import * as settings from "./handlers/settings";
import * as sync from "./handlers/sync";

export default function registerIpcHandlers() {
    // Register IPC handlers for Google Drive authentication and user information
    ipcMain.handle("google-drive:sign-in", auth.handleSignIn);
    ipcMain.handle("google-drive:get-tokens", auth.getTokens);
    ipcMain.handle("google-drive:get-username", auth.getUserName);
    ipcMain.handle("app:sign-out", auth.handleSignOut);

    // Register IPC handlers for central folder management
    ipcMain.handle(
        "app:select-central-folder",
        centralConfig.selectCentralFolder
    );
    ipcMain.handle("app:save-central-folder", centralConfig.saveCentralFolder);
    ipcMain.handle("app:get-central-folder", centralConfig.getCentralFolder);

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
}

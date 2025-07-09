import { BrowserWindow, dialog } from "electron";
import pkg from "electron-updater";
import { constants } from "../lib/constants";
import { broadcast } from "../windows/WindowManager";
import { is } from "@electron-toolkit/utils";

const { autoUpdater } = pkg;
const { store } = constants;

let updating = false;
export const isUpdating = (): boolean => updating;

export function initialiseUpdater(): void {
    if (is.dev) {
        console.log("Running in development mode, skipping auto-updater.");
        return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();

    // Have a new version
    autoUpdater.on("update-available", (info) => {
        const win = BrowserWindow.getFocusedWindow();
        dialog
            .showMessageBox(win || BrowserWindow.getAllWindows()[0], {
                type: "info",
                title: "Have a new version",
                message: `A new version ${info.version} is available. Downloading now...`,
                buttons: ["OK", "Cancel"],
            })
            .then(({ response }) => {
                if (response === 0) {
                    updating = true;
                    broadcast("app:update-available", info);
                    console.log(
                        "[Update] Downloading new version:",
                        info.version
                    );
                    autoUpdater.downloadUpdate();
                }
            });
    });

    // Update downloaded
    autoUpdater.on("update-downloaded", (info) => {
        const win = BrowserWindow.getFocusedWindow();
        store.set("pendingUpdate", { version: info.version });
        updating = false;
        broadcast("app:update-downloaded", info);

        dialog
            .showMessageBox(win || BrowserWindow.getAllWindows()[0], {
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
                    console.log("[Update] Update will be applied later.");
                }
            });
    });

    // Update not available
    autoUpdater.on("error", (err: Error) => {
        console.error("[Update] Error checking for updates:", err);
        const win = BrowserWindow.getFocusedWindow();
        updating = false;
        dialog.showMessageBox(win || BrowserWindow.getAllWindows()[0], {
            type: "error",
            title: "Update Error",
            message: "An error occurred while checking for updates.",
            detail: err.message,
            buttons: ["OK"],
        });
    });
}

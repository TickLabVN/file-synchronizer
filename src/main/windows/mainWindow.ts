import { BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { is } from "@electron-toolkit/utils";
//@ts-ignore: Electron vites asset import
import icon from "../../../resources/icon.png?asset";

const fileURL = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURL);

/**
 * Creates the main application window.
 * @returns {BrowserWindow} The created BrowserWindow instance.
 */
export default function createMainWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        frame: false,
        titleBarStyle: "hidden",
        icon: icon,
        webPreferences: {
            preload: path.join(__dirname, "../preload/index.mjs"),
            contextIsolation: true,
            sandbox: false,
        },
    });
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
        win.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
    // Window-controls over IPC
    ipcMain.on("window-minimize", () => win.minimize());
    ipcMain.on("window-maximize", () =>
        win.isMaximized() ? win.unmaximize() : win.maximize()
    );
    ipcMain.on("window-close", () => win.close());
    ipcMain.handle("window-isMaximized", () => win.isMaximized());
    return win;
}

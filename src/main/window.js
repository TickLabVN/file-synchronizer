import { BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import icon from "../../resources/icon.png?asset";
import "dotenv/config";
import { is } from "@electron-toolkit/utils";

const fileURL = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURL);
let win;

// Handle window controls for custom title bar
ipcMain.on("window-minimize", () => win.minimize());
ipcMain.on("window-maximize", () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});
ipcMain.on("window-close", () => win.close());
ipcMain.handle("window-isMaximized", () => win.isMaximized());

export default function createWindow() {
    win = new BrowserWindow({
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

    return win;
}

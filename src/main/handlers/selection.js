import { app, dialog, BrowserWindow, shell } from "electron";
import fs from "fs";
import path from "path";
import "dotenv/config";
import { constants } from "../lib/constants";

const { store, mapping } = constants;

async function getDirSize(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    let total = 0;
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            total += await getDirSize(full);
        } else {
            total += (await fs.promises.stat(full)).size;
        }
    }
    return total;
}
// Handle selecting multiple files
export async function selectFiles() {
    const win = BrowserWindow.getFocusedWindow();

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ["openFile", "multiSelections"],
    });
    if (canceled) return null;
    return Promise.all(
        filePaths.map(async (p) => ({
            path: p,
            size: (await fs.promises.stat(p)).size,
            isDirectory: false,
        }))
    );
}

// Handle selecting multiple folders
export async function selectFolders() {
    const win = BrowserWindow.getFocusedWindow();

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ["openDirectory", "multiSelections"],
    });
    if (canceled) return null;
    return Promise.all(
        filePaths.map(async (p) => ({
            path: p,
            size: await getDirSize(p),
            isDirectory: true,
        }))
    );
}

// Handle selecting files to stop syncing
export async function selectStopSyncFiles() {
    const win = BrowserWindow.getFocusedWindow();

    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    let centralFolderPath;
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        centralFolderPath = JSON.parse(raw).centralFolderPath;
    } catch {
        throw new Error("Central folder not set");
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Select files under Central Folder",
        defaultPath: centralFolderPath,
        properties: ["openFile", "multiSelections"],
    });

    if (canceled) return null;

    const invalid = filePaths.filter((p) => !p.startsWith(centralFolderPath));
    if (invalid.length) {
        dialog.showErrorBox(
            "Invalid selection",
            "Please select files that are under the Central Folder path."
        );
        return null;
    }

    const selectedStats = await Promise.all(
        filePaths.map(async (p) => {
            try {
                const st = await fs.promises.stat(p);
                return { path: p, ino: st.ino, dev: st.dev };
            } catch {
                return null;
            }
        })
    );

    const matchedSrcs = [];
    // eslint-disable-next-line no-unused-vars
    for (const [src, _] of Object.entries(mapping)) {
        let st;
        try {
            st = await fs.promises.stat(src);
        } catch {
            continue;
        }
        for (const sel of selectedStats) {
            if (sel && sel.ino === st.ino && sel.dev === st.dev) {
                matchedSrcs.push(src);
                break;
            }
        }
    }

    const settings = store.get("settings", {});
    const prev = settings.stopSyncPaths || [];
    const next = Array.from(new Set([...prev, ...matchedSrcs]));
    store.set("settings", { ...settings, stopSyncPaths: next });
    return next;
}

export async function listDirectory(_, dirPath) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return Promise.all(
        entries.map(async (e) => {
            const full = path.join(dirPath, e.name);
            return {
                path: full,
                isDirectory: e.isDirectory(),
                size: e.isDirectory()
                    ? null
                    : (await fs.promises.stat(full)).size,
            };
        })
    );
}

export async function openInExplorer(_, fullPath) {
    try {
        if (!fs.existsSync(fullPath)) return false;
        const st = fs.statSync(fullPath);
        // Folder ⇒ mở thư mục; File ⇒ highlight trong Explorer/Finder
        if (st.isDirectory()) {
            await shell.openPath(fullPath);
        } else {
            await shell.showItemInFolder(fullPath);
        }
        return true;
    } catch (e) {
        console.error("Open path failed:", e);
        return false;
    }
}

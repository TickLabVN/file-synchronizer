import { dialog, BrowserWindow, shell } from "electron";
import fs from "fs";
import path from "path";
import getDirSize from "../utils/getDirSize";

// Handle selecting multiple files
export async function selectFiles(): Promise<
    { path: string; size: number; isDirectory: boolean }[] | null
> {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
        throw new Error("No focused window to show dialog");
    }

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
export async function selectFolders(): Promise<
    { path: string; size: number; isDirectory: boolean }[] | null
> {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
        throw new Error("No focused window to show dialog");
    }

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

// List directory contents with size and type
export async function listDirectory(
    _: unknown,
    dirPath: string
): Promise<{ path: string; isDirectory: boolean; size: number | null }[]> {
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

// Handler to get all tracked files with their metadata
export async function openInExplorer(
    _: unknown,
    fullPath: string
): Promise<boolean> {
    try {
        if (!fs.existsSync(fullPath)) return false;
        const st = fs.statSync(fullPath);
        if (st.isDirectory()) {
            await shell.openPath(fullPath);
        } else {
            shell.showItemInFolder(fullPath);
        }
        return true;
    } catch (e) {
        console.error("[openInExplorer] Error opening path:", e);
        return false;
    }
}

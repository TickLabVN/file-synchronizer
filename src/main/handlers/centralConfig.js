import { app, dialog, BrowserWindow } from "electron";
import path from "path";
import fs from "fs";

// Handle choosing a central folder
export async function selectCentralFolder() {
    const win = BrowserWindow.getFocusedWindow();

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ["openDirectory"],
    });
    if (canceled) return null;
    return filePaths[0];
}

// Handle saving the central folder path
export async function saveCentralFolder(_, folderPath) {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const data = { centralFolderPath: folderPath };
    await fs.promises.writeFile(
        cfgPath,
        JSON.stringify(data, null, 2),
        "utf-8"
    );
    return true;
}

// Handle retrieving the central folder path from the config
export async function getCentralFolder() {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        const { centralFolderPath } = JSON.parse(raw);
        return centralFolderPath || null;
    } catch {
        return null;
    }
}

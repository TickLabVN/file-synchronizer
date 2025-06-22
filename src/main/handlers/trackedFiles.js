import { app } from "electron";
import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
const { mapping, store, boxMapping } = constants;
import getDriveClient from "../utils/getDriveClient";
import { getBoxClient } from "../utils/getBoxClient";

// Handler to get all tracked files with their last sync timestamp
export async function getTrackedFiles() {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    return Promise.all(
        Object.entries(mapping).map(async ([src, rec]) => {
            let isDirectory = false;
            try {
                const stats = await fs.promises.stat(src);
                isDirectory = stats.isDirectory();
            } catch (err) {
                console.warn(`Cannot stat ${src}:`, err);
            }
            return {
                src,
                lastSync: rec.lastSync || null,
                isDirectory,
            };
        })
    );
}

// Handler to get all tracked files with their Box metadata
export async function getTrackedFilesBox() {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    return Promise.all(
        Object.entries(boxMapping).map(async ([src, rec]) => {
            let isDirectory = false;
            try {
                const stats = await fs.promises.stat(src);
                isDirectory = stats.isDirectory();
            } catch (err) {
                console.warn(`Cannot stat ${src}:`, err);
            }
            return {
                src,
                lastSync: rec.lastSync || null,
                isDirectory,
                boxId: rec.id || null,
            };
        })
    );
}

// Handler to delete a tracked file (both local link and Drive entry)
export async function deleteTrackedFile(_, src) {
    if (!mapping[src]) {
        throw new Error(`File not tracked: ${src}`);
    }
    // Delete on Drive
    const drive = await getDriveClient();
    try {
        await drive.files.delete({ fileId: mapping[src].id });
    } catch (err) {
        console.error("Drive delete error:", err);
    }
    // Delete local symlink in central folder
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const { centralFolderPath } = JSON.parse(
        await fs.promises.readFile(cfgPath, "utf-8")
    );
    const linkPath = path.join(centralFolderPath, path.basename(src));
    try {
        await fs.promises.unlink(linkPath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("Local unlink error:", err);
        }
    }
    // Remove mapping entries (for file and any children)
    Object.keys(mapping).forEach((key) => {
        if (key === src || key.startsWith(src + path.sep)) {
            delete mapping[key];
        }
    });
    // Persist updated
    await store.set("driveMapping", mapping);
    const settings = store.get("settings", { stopSyncPaths: [] });
    settings.stopSyncPaths = settings.stopSyncPaths.filter((p) => p !== src);
    await store.set("settings", settings);
    return true;
}

// Handler to delete a tracked file (both local link and Box entry)
export async function deleteTrackedFileBox(_, src) {
    if (!boxMapping[src]) {
        throw new Error(`File not tracked in Box: ${src}`);
    }

    const client = await getBoxClient();
    const { id, isFolder } = boxMapping[src];

    try {
        if (isFolder) {
            await client.folders.delete(id, { recursive: true });
        } else {
            await client.files.delete(id);
        }
    } catch (err) {
        console.error("Box delete error:", err);
    }

    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const { centralFolderPath } = JSON.parse(
        await fs.promises.readFile(cfgPath, "utf-8")
    );
    const linkPath = path.join(centralFolderPath, path.basename(src));

    try {
        await fs.promises.unlink(linkPath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("Local unlink error:", err);
        }
    }

    Object.keys(boxMapping).forEach((key) => {
        if (key === src || key.startsWith(src + path.sep)) {
            delete boxMapping[key];
        }
    });

    await store.set("boxMapping", boxMapping);

    const settings = store.get("settings", { stopSyncPaths: [] });
    settings.stopSyncPaths = settings.stopSyncPaths.filter((p) => p !== src);
    await store.set("settings", settings);

    return true;
}

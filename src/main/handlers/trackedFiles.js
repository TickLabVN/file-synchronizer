import { app } from "electron";
import path, { sep as SEP } from "path";
import fs from "fs";
import { constants } from "../lib/constants";
const { mapping, store, boxMapping } = constants;
import getDriveClient from "../utils/getDriveClient";
import { getBoxClient } from "../utils/getBoxClient";

// Handler to get all tracked files with their last sync timestamp
export async function getTrackedFiles() {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    return Promise.all(
        Object.entries(mapping).map(async ([src, rec]) => {
            let isDirectory = false;
            let size = null;
            try {
                const stats = await fs.promises.stat(src);
                isDirectory = stats.isDirectory();
                size = isDirectory ? await getDirSize(src) : stats.size;
            } catch (err) {
                console.warn(`Cannot stat ${src}:`, err);
            }
            return {
                src,
                lastSync: rec.lastSync || null,
                isDirectory,
                size,
                provider: rec.provider ?? "google",
                username: rec.username ?? null,
            };
        })
    );
}

// Handler to get all tracked files with their Box metadata
export async function getTrackedFilesBox() {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    return Promise.all(
        Object.entries(boxMapping).map(async ([src, rec]) => {
            let isDirectory = false;
            let size = null;
            try {
                const stats = await fs.promises.stat(src);
                isDirectory = stats.isDirectory();
                size = isDirectory ? await getDirSize(src) : stats.size;
            } catch (err) {
                console.warn(`Cannot stat ${src}:`, err);
            }
            return {
                src,
                lastSync: rec.lastSync || null,
                isDirectory,
                size,
                boxId: rec.id || null,
                provider: rec.provider ?? "box",
                username: rec.username ?? null,
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
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
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
    const normalize = (p) => path.normalize(p).replace(/[/\\]+/g, SEP);
    Object.keys(mapping).forEach((key) => {
        const normKey = normalize(key);
        const normSrc = normalize(src);
        if (normKey === normSrc || normKey.startsWith(normSrc + SEP)) {
            delete mapping[key];
        }
    });
    // Persist updated
    await store.set("driveMapping", mapping);

    const settings = store.get("settings", {}) || {};
    const current = Array.isArray(settings.stopSyncPaths)
        ? settings.stopSyncPaths
        : [];
    settings.stopSyncPaths = current.filter((p) => p !== src);

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

    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
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
        const normKey = path.normalize(key).replace(/[/\\]+/g, SEP);
        const normSrc = path.normalize(src).replace(/[/\\]+/g, SEP);
        if (normKey === normSrc || normKey.startsWith(normSrc + SEP)) {
            delete boxMapping[key];
        }
    });

    await store.set("boxMapping", boxMapping);

    const settings = store.get("settings", {}) || {};
    const current = Array.isArray(settings.stopSyncPaths)
        ? settings.stopSyncPaths
        : [];
    settings.stopSyncPaths = current.filter((p) => p !== src);

    await store.set("settings", settings);

    return true;
}

async function getDirSize(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    let total = 0;
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) total += await getDirSize(full);
        else total += (await fs.promises.stat(full)).size;
    }
    return total;
}

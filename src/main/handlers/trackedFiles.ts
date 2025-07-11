import { app } from "electron";
import path, { sep as SEP } from "path";
import fs from "fs";
import { constants } from "../lib/constants";
const { driveMapping, store, boxMapping } = constants;
import getDriveClient from "../utils/getDriveClient";
import { getBoxClient } from "../utils/getBoxClient";
import getDirSize from "../utils/getDirSize";

// Handler to get all tracked files with their last sync timestamp
export async function getTrackedFiles(): Promise<
    Array<{
        src: string;
        lastSync: number | null;
        isDirectory: boolean;
        size: number | null;
        provider: string;
        username: string | null;
    }>
> {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    return Promise.all(
        Object.entries(
            driveMapping as Record<
                string,
                { lastSync?: number; provider?: string; username?: string }
            >
        ).map(async ([src, rec]) => {
            let isDirectory = false;
            let size: number | null = null; // Declare size as number | null
            try {
                const stats = await fs.promises.stat(src);
                isDirectory = stats.isDirectory();
                size = isDirectory ? await getDirSize(src) : stats.size; // Assign number or null to size
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
export async function getTrackedFilesBox(): Promise<
    Array<{
        src: string;
        lastSync: number | null;
        isDirectory: boolean;
        size: number | null;
        boxId: string | null;
        provider: string;
        username: string | null;
    }>
> {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    return Promise.all(
        Object.entries(
            boxMapping as Record<
                string,
                {
                    lastSync?: number;
                    id?: string;
                    provider?: string;
                    username?: string;
                    isDirectory?: boolean;
                }
            >
        ).map(async ([src, rec]) => {
            let isDirectory = false;
            let size: number | null = null;
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
export async function deleteTrackedFile(_, src): Promise<boolean> {
    if (!(driveMapping as Record<string, { id?: string }>)[src]) {
        throw new Error(`File not tracked: ${src}`);
    }
    // Delete on Drive
    const drive = await getDriveClient();
    try {
        const typedMapping = driveMapping as Record<string, { id?: string }>;
        await drive.files.delete({ fileId: typedMapping[src].id });
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
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Local unlink error:", err);
        }
    }
    // Remove driveMapping entries (for file and any children)
    const normalize = (p: string): string =>
        path.normalize(p).replace(/[/\\]+/g, SEP);
    Object.keys(driveMapping as Record<string, unknown>).forEach((key) => {
        const normKey = normalize(key);
        const normSrc = normalize(src);
        if (normKey === normSrc || normKey.startsWith(normSrc + SEP)) {
            delete (driveMapping as Record<string, unknown>)[key];
        }
    });
    // Persist updated
    await store.set("driveMapping", driveMapping);

    interface Settings {
        stopSyncPaths?: string[];
    }

    const settings: Settings = store.get("settings", {}) || {};
    const current = Array.isArray(settings.stopSyncPaths)
        ? settings.stopSyncPaths
        : [];
    settings.stopSyncPaths = current.filter((p) => p !== src);

    await store.set("settings", settings);
    return true;
}

// Handler to delete a tracked file (both local link and Box entry)
export async function deleteTrackedFileBox(_, src): Promise<boolean> {
    if (
        !(boxMapping as Record<string, { id?: string; isDirectory?: boolean }>)[
            src
        ]
    ) {
        throw new Error(`File not tracked in Box: ${src}`);
    }

    const client = await getBoxClient();
    const { id, isDirectory } = (
        boxMapping as Record<string, { id?: string; isDirectory?: boolean }>
    )[src];

    try {
        if (isDirectory) {
            if (!id) {
                throw new Error("Folder ID is undefined");
            }
            await client.folders.delete(id, { recursive: true });
        } else {
            if (!id) {
                throw new Error("File ID is undefined");
            }
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
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Local unlink error:", err);
        }
    }

    Object.keys(boxMapping as Record<string, unknown>).forEach((key) => {
        const normKey = path.normalize(key).replace(/[/\\]+/g, SEP);
        const normSrc = path.normalize(src).replace(/[/\\]+/g, SEP);
        if (normKey === normSrc || normKey.startsWith(normSrc + SEP)) {
            delete (boxMapping as Record<string, unknown>)[key];
        }
    });

    await store.set("boxMapping", boxMapping);

    interface Settings {
        stopSyncPaths?: string[];
    }
    const settings: Settings = store.get("settings", {}) || {};
    const current = Array.isArray(settings.stopSyncPaths)
        ? settings.stopSyncPaths
        : [];
    settings.stopSyncPaths = current.filter((p) => p !== src);

    await store.set("settings", settings);

    return true;
}

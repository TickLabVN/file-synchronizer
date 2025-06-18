import { app } from "electron";
import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
const { mapping, store } = constants;
import getDriveClient from "../utils/getDriveClient";

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
        console.error("Local unlink error:", err);
    }
    // Remove mapping entries (for file and any children)
    Object.keys(mapping).forEach((key) => {
        if (key === src || key.startsWith(src + path.sep)) {
            delete mapping[key];
        }
    });
    // Persist updated mapping
    await store.set("driveMapping", mapping);
    return true;
}

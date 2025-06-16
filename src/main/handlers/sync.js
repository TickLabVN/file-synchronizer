import { app } from "electron";
import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
import traverseAndUpload from "../utils/traverseAndUpload";
import traverseCompare from "../utils/traverseCompare";
import downloadTree from "../utils/downloadTree";
import getDriveClient from "../utils/getDriveClient";
import "dotenv/config";

const { store, mapping } = constants;

// Handle syncing files/folders to Google Drive and creating symlinks
export async function syncFiles(_, paths) {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    const drive = await getDriveClient();
    const folderName = "FS-Backup-Data";

    // find or create central Drive folder
    const listRes = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
    });
    let driveFolderId;
    if (listRes.data.files.length) {
        driveFolderId = listRes.data.files[0].id;
    } else {
        const createRes = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
        });
        driveFolderId = createRes.data.id;
    }

    for (const p of paths) {
        await traverseAndUpload(p, driveFolderId, drive);
        // create or replace symlink in central folder
        const linkPath = path.join(centralFolderPath, path.basename(p));
        try {
            await fs.promises.unlink(linkPath);
            // eslint-disable-next-line no-empty
        } catch {}

        // Determine symlink type and handle Windows EPERM by falling back to copy
        const stats = await fs.promises.stat(p);
        const linkType = stats.isDirectory() ? "junction" : "file";
        try {
            await fs.promises.symlink(p, linkPath, linkType);
        } catch (err) {
            if (process.platform === "win32" && err.code === "EPERM") {
                // Windows symlink not permitted: fallback to copy
                if (stats.isDirectory()) {
                    await fs.promises.cp(p, linkPath, { recursive: true });
                } else {
                    try {
                        await fs.promises.link(p, linkPath);
                    } catch {
                        await fs.promises.copyFile(p, linkPath);
                    }
                }
            } else {
                throw err;
            }
        }
    }
    await store.set("driveMapping", mapping);
    return true;
}

// Handle syncing on app launch
export async function syncOnLaunch() {
    const settings = store.get("settings", {
        autoDeleteOnLaunch: false,
        autoUpdateOnLaunch: false,
        stopSyncPaths: [],
    });
    const {
        autoDeleteOnLaunch,
        autoUpdateOnLaunch,
        stopSyncPaths = [],
    } = settings;

    if (!autoDeleteOnLaunch && !autoUpdateOnLaunch) {
        console.log(
            "Skip sync-on-launch: both autoDelete and autoUpdate are disabled"
        );
        return true;
    }

    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    let centralFolderPath;
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        centralFolderPath = JSON.parse(raw).centralFolderPath;
    } catch {
        console.log("No central folder config found, skipping sync-on-launch");
        return true;
    }

    if (Object.keys(mapping).length === 0) {
        console.log("Skip sync-on-launch: no files mapped yet");
        return true;
    }

    const drive = await getDriveClient();

    if (autoDeleteOnLaunch) {
        console.log("Starting auto-delete on launch...");
        const listRes = await drive.files.list({
            q: "name='FS-Backup-Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: "files(id)",
            spaces: "drive",
        });
        if (!listRes.data.files.length) {
            console.warn(
                "Drive backup folder not found, skipping deletion check"
            );
        } else {
            const driveFolderId = listRes.data.files[0].id;

            // eslint-disable-next-line no-unused-vars
            for (const [src, _] of Object.entries(mapping)) {
                try {
                    await fs.promises.stat(src);
                } catch (err) {
                    if (err.code === "ENOENT") {
                        const linkPath = path.join(
                            centralFolderPath,
                            path.basename(src)
                        );
                        try {
                            await fs.promises.unlink(linkPath);
                            console.log(`Deleted local link: ${linkPath}`);
                        } catch (unlinkErr) {
                            console.error(
                                `Failed to delete link at ${linkPath}`,
                                unlinkErr
                            );
                        }
                    } else {
                        throw err;
                    }
                }
            }

            for (const [src, rec] of Object.entries(mapping)) {
                if (rec.parentId === driveFolderId) {
                    const linkPath = path.join(
                        centralFolderPath,
                        path.basename(src)
                    );
                    try {
                        await fs.promises.lstat(linkPath);
                    } catch (err) {
                        if (err.code === "ENOENT") {
                            try {
                                await drive.files.delete({ fileId: rec.id });
                                console.log(
                                    `Deleted on Drive: ${rec.id} (src=${src})`
                                );
                            } catch (driveErr) {
                                console.error(
                                    "Failed to delete on Drive:",
                                    driveErr
                                );
                            }
                            for (const key of Object.keys(mapping)) {
                                if (
                                    key === src ||
                                    key.startsWith(src + path.sep)
                                ) {
                                    delete mapping[key];
                                }
                            }
                        } else {
                            throw err;
                        }
                    }
                }
            }
        }
    }

    if (autoUpdateOnLaunch) {
        console.log("Starting auto-update on launch...");
        for (const [src, rec] of Object.entries(mapping)) {
            if (stopSyncPaths.includes(src)) {
                console.log(
                    `Skipping sync for ${src} as it is in stopSyncPaths`
                );
                continue;
            }
            try {
                await traverseCompare(src, rec.id, drive);
            } catch (e) {
                console.error("Error syncing on launch for", src, e);
            }
        }
    }

    await store.set("driveMapping", mapping);
    return true;
}

// Handle pulling data from Google Drive to the central folder
export async function pullFromDrive() {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const { centralFolderPath } = JSON.parse(
        await fs.promises.readFile(cfgPath, "utf-8")
    );
    if (!centralFolderPath) throw new Error("Central folder not set");

    const drive = await getDriveClient();
    const {
        data: { files: root },
    } = await drive.files.list({
        q: "name='FS-Backup-Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
        spaces: "drive",
    });
    if (!root.length) throw new Error("Drive backup folder not found");
    const rootId = root[0].id;

    const pulledEntries = await downloadTree(rootId, centralFolderPath, drive);
    await store.set("driveMapping", mapping);

    const rootEntries = pulledEntries.filter(
        (entry) => entry.parentId === rootId
    );

    for (const entry of rootEntries) {
        const src = entry.path;
        const basename = path.basename(src);
        const destLink = path.join(centralFolderPath, basename);
        try {
            await fs.promises.unlink(destLink);
            // eslint-disable-next-line no-empty
        } catch {}

        const stats = await fs.promises.stat(src);
        const type = stats.isDirectory() ? "junction" : "file";
        try {
            await fs.promises.symlink(src, destLink, type);
        } catch (err) {
            if (process.platform === "win32" && err.code === "EPERM") {
                if (stats.isDirectory()) {
                    await fs.promises.cp(src, destLink, { recursive: true });
                } else {
                    try {
                        await fs.promises.link(src, destLink);
                    } catch {
                        await fs.promises.copyFile(src, destLink);
                    }
                }
            } else {
                throw err;
            }
        }
    }

    return true;
}

import { app, BrowserWindow } from "electron";
import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
import traverseAndUpload from "../utils/traverseAndUpload";
import traverseCompare from "../utils/traverseCompare";
import downloadTree from "../utils/downloadTree";
import getDriveClient from "../utils/getDriveClient";
import "dotenv/config";
import { cleanupDrive } from "../utils/cleanupDrive";
import cleanupBox from "../utils/cleanupBox";
import { getBoxClient } from "../utils/getBoxClient";
import { traverseAndUploadBox } from "../utils/traverseAndUploadBox";
import traverseCompareBox from "../utils/traverseCompareBox";
import downloadTreeBox from "../utils/downloadTreeBox";
import { listGDTokens, listBoxTokens } from "../lib/credentials";

const { store, mapping, boxMapping } = constants;
function notifyRenderer() {
    BrowserWindow.getAllWindows().forEach((w) =>
        w.webContents.send("tracked-files-updated")
    );
}
export async function syncAllOnLaunch() {
    const { BACKEND_URL } = constants;
    // 0. Không cần chạy nếu chưa cấu hình thư mục trung tâm
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    try {
        await fs.promises.access(cfgPath);
    } catch {
        console.log("Chưa có central-config, bỏ qua syncAllOnLaunch");
        return;
    }

    /* --- GOOGLE DRIVE --- */
    const gdAccounts = await listGDTokens();
    for (const { email, tokens } of gdAccounts) {
        try {
            await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
            console.log(`[sync] Google account ${email}`);
            await syncOnLaunch(); // đã có sẵn trong file này
        } catch (err) {
            console.error(`[sync] Drive acc ${email} error:`, err);
        }
    }

    /* --- BOX --- */
    const boxAccounts = await listBoxTokens();
    for (const { login, tokens } of boxAccounts) {
        try {
            await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokens),
            });
            console.log(`[sync] Box account ${login}`);
            await syncBoxOnLaunch(); // đã có sẵn trong file này
        } catch (err) {
            console.error(`[sync] Box acc ${login} error:`, err);
        }
    }
}
// Handle syncing files/folders to Google Drive and creating symlinks
export async function syncFiles(_, { paths, exclude = [] }) {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    const drive = await getDriveClient();
    const folderName = "__ticklabfs_backup";
    const {
        data: { user: driveUser },
    } = await drive.about.get({ fields: "user" });
    const driveUsername =
        driveUser?.displayName || driveUser?.emailAddress || "Unknown";

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
    const failed = [];
    for (const p of paths) {
        // Skip excluded paths
        if (exclude.includes(p)) {
            console.log(`Skipping excluded path: ${p}`);
            continue;
        }
        try {
            await traverseAndUpload(
                p,
                driveFolderId,
                drive,
                exclude,
                "google",
                driveUsername
            );
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
            mapping[p] = {
                ...(mapping[p] || {}),
                parentId: driveFolderId,
                lastSync: new Date().toISOString(),
                provider: "google",
                username: driveUsername,
                isDirectory: stats.isDirectory(),
            };
            await store.set("driveMapping", mapping);
            notifyRenderer();
        } catch (err) {
            if (err.code === "ENOENT") {
                console.warn(
                    `Path "${p}" not found locally, cleaning up on Drive...`
                );
                await cleanupDrive(p, drive);
                await store.set("driveMapping", mapping);
                failed.push({ path: p, message: err.message });
                continue;
            }
            throw err;
        }
    }
    return {
        success: failed.length === 0,
        failed: failed,
    };
}

export async function syncBoxFiles(_, { paths, exclude = [] }) {
    // 4a. Locate the user’s “central folder” (where we create symlinks)
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const rawCfg = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(rawCfg);
    if (!centralFolderPath) throw new Error("Central folder not set");

    // 4b. Prepare Box client
    const client = await getBoxClient();
    const me = await client.users.get(client.CURRENT_USER_ID, {
        fields: "name,login",
    });
    const boxUsername = me.name || me.login;

    // 4c. Find or create the dedicated backup folder at the Box root
    const folderName = "__ticklabfs_backup";
    let rootFolderId;
    const rootItems = await client.folders.getItems("0", {
        fields: "id,type,name",
        limit: 1000,
    });
    const existing = rootItems.entries.find(
        (it) => it.type === "folder" && it.name === folderName
    );
    if (existing) {
        rootFolderId = existing.id;
    } else {
        const created = await client.folders.create("0", folderName);
        rootFolderId = created.id;
    }

    // 4d. Iterate over each requested local path
    const failed = [];
    for (const p of paths) {
        // 4d‑a. Skip excluded paths
        if (exclude.includes(p)) {
            console.log(`Skipping excluded path: ${p}`);
            continue;
        }
        try {
            // 4d‑i. Mirror the local tree on Box
            await traverseAndUploadBox(
                p,
                rootFolderId,
                client,
                exclude,
                "box",
                boxUsername
            );

            // 4d‑ii. Ensure a symlink (or copy fallback) exists in central folder
            const linkPath = path.join(centralFolderPath, path.basename(p));
            try {
                await fs.promises.unlink(linkPath);
            } catch {
                /* ignore — link did not exist */
            }

            const stats = await fs.promises.stat(p);
            const linkType = stats.isDirectory() ? "junction" : "file";

            try {
                await fs.promises.symlink(p, linkPath, linkType);
            } catch (err) {
                // On Windows the user may lack the SeCreateSymbolicLink privilege
                if (process.platform === "win32" && err.code === "EPERM") {
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
            boxMapping[p] = {
                ...(mapping[p] || {}),
                parentId: rootFolderId,
                lastSync: new Date().toISOString(),
                provider: "box",
                username: boxUsername,
                isDirectory: stats.isDirectory(),
            };

            // 4d‑iii. Persist updated mapping
            await store.set("boxMapping", boxMapping);
            notifyRenderer();
        } catch (err) {
            // 4d‑iv. Handle a path that disappeared locally
            if (err.code === "ENOENT") {
                console.warn(
                    `Path "${p}" not found locally, cleaning up on Box…`
                );
                await cleanupBox(p, client);
                await store.set("boxMapping", boxMapping);
                failed.push({ path: p, message: err.message });
                continue;
            }
            throw err;
        }
    }

    return { success: failed.length === 0, failed };
}

// Handle syncing on app launch
export async function syncOnLaunch() {
    const settings = store.get("settings", {
        stopSyncPaths: [],
    });
    const { stopSyncPaths = [] } = settings;

    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
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
    const {
        data: { user: driveUser },
    } = await drive.about.get({ fields: "user" });

    const driveUsername =
        driveUser.displayName || driveUser.emailAddress || "Unknown";

    console.log("Starting auto-delete on launch...");
    const listRes = await drive.files.list({
        q: "name='__ticklabfs_backup' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
        spaces: "drive",
    });
    if (!listRes.data.files.length) {
        console.warn("Drive backup folder not found, skipping deletion check");
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
                            if (key === src || key.startsWith(src + path.sep)) {
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

    console.log("Starting auto-update on launch...");
    for (const [src, rec] of Object.entries(mapping)) {
        if (rec.provider !== "google") continue;
        if (rec.username !== driveUsername) continue;
        if (
            stopSyncPaths.some((p) => src === p || src.startsWith(p + path.sep))
        ) {
            console.log(`Skipping sync for ${src} as it is in stopSyncPaths`);
            continue;
        }
        try {
            const changed = await traverseCompare(src, rec.id, drive);
            if (changed) {
                rec.lastSync = new Date().toISOString();
                console.log(`Updated lastSync for ${src} to ${rec.lastSync}`);
            }
        } catch (e) {
            console.error("Error syncing on launch for", src, e);
        }
    }

    await store.set("driveMapping", mapping);
    return true;
}

// Handle syncing on app launch for Box
export async function syncBoxOnLaunch() {
    const settings = store.get("settings", {
        stopSyncPaths: [],
    });
    const { stopSyncPaths = [] } = settings;

    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    let centralFolderPath;
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        centralFolderPath = JSON.parse(raw).centralFolderPath;
    } catch {
        console.log(
            "No central folder config found, skipping Box sync-on-launch"
        );
        return true;
    }

    if (Object.keys(boxMapping).length === 0) {
        console.log("Skip Box sync-on-launch: no files mapped yet");
        return true;
    }

    const client = await getBoxClient();
    const me = await client.users.get(client.CURRENT_USER_ID, {
        fields: "name,login",
    });
    const boxUsername = me.name || me.login;

    console.log("Starting Box auto-delete on launch...");
    const rootItems = await client.folders.getItems("0", {
        fields: "id,type,name",
        limit: 1000,
    });
    const folderName = "__ticklabfs_backup";
    let rootFolderId;
    const existing = rootItems.entries.find(
        (it) => it.type === "folder" && it.name === folderName
    );
    if (existing) {
        rootFolderId = existing.id;
    } else {
        console.warn("Box backup folder not found, skipping deletion check");
        return true;
    }

    // eslint-disable-next-line no-unused-vars
    for (const [src, _] of Object.entries(boxMapping)) {
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

    for (const [src, rec] of Object.entries(boxMapping)) {
        if (rec.parentId === rootFolderId) {
            const linkPath = path.join(centralFolderPath, path.basename(src));
            try {
                await fs.promises.lstat(linkPath);
            } catch (err) {
                if (err.code === "ENOENT") {
                    try {
                        if (rec.isFolder) {
                            await client.folders.delete(rec.id, {
                                recursive: true,
                            });
                        } else {
                            await client.files.delete(rec.id);
                        }
                        console.log(`Deleted on Box: ${rec.id} (src=${src})`);
                    } catch (boxErr) {
                        console.error("Failed to delete on Box:", boxErr);
                    }
                    for (const key of Object.keys(boxMapping)) {
                        if (key === src || key.startsWith(src + path.sep)) {
                            delete boxMapping[key];
                        }
                    }
                } else {
                    throw err;
                }
            }
        }
    }
    console.log("Starting Box auto-update on launch...");
    for (const [src, rec] of Object.entries(boxMapping)) {
        if (rec.provider !== "box") continue;
        if (rec.username !== boxUsername) continue;
        if (
            stopSyncPaths.some((p) => src === p || src.startsWith(p + path.sep))
        ) {
            console.log(
                `Skipping Box sync for ${src} as it is in stopSyncPaths`
            );
            continue;
        }
        try {
            const changed = await traverseCompareBox(src, rec.id, client);
            if (changed) {
                rec.lastSync = new Date().toISOString();
                console.log(`Updated lastSync for ${src} to ${rec.lastSync}`);
            }
        } catch (e) {
            console.error("Error syncing on launch for Box", src, e);
        }
    }
    await store.set("boxMapping", boxMapping);
    return true;
}

// Handle pulling data from Google Drive to the central folder
export async function pullFromDrive() {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const { centralFolderPath } = JSON.parse(
        await fs.promises.readFile(cfgPath, "utf-8")
    );
    if (!centralFolderPath) throw new Error("Central folder not set");

    const drive = await getDriveClient();
    const {
        data: { user: driveUser },
    } = await drive.about.get({ fields: "user" });
    const driveUsername =
        driveUser?.displayName || driveUser?.emailAddress || "Unknown";
    const {
        data: { files: root },
    } = await drive.files.list({
        q: "name='__ticklabfs_backup' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
        spaces: "drive",
    });
    if (!root.length) throw new Error("Drive backup folder not found");
    const rootId = root[0].id;

    const pulledEntries = await downloadTree(
        rootId,
        centralFolderPath,
        drive,
        [],
        "google",
        driveUsername
    );
    await store.set("driveMapping", mapping);

    const rootEntries = pulledEntries.filter(
        (entry) => entry.parentId === rootId
    );

    for (const entry of rootEntries) {
        if (entry.origOS !== process.platform) {
            console.warn(
                `Skipping ${entry.path} as it was created on a different OS (${entry.origOS})`
            );
            continue;
        }
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

    notifyRenderer();
    console.log("Pull from Drive completed successfully");
    return true;
}

// Handle pulling data from Box to the central folder
export async function pullFromBox() {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const { centralFolderPath } = JSON.parse(
        await fs.promises.readFile(cfgPath, "utf-8")
    );
    if (!centralFolderPath) throw new Error("Central folder not set");
    const client = await getBoxClient();
    const me = await client.users.get(client.CURRENT_USER_ID, {
        fields: "name,login",
    });
    const boxUsername = me.name || me.login;
    const rootItems = await client.folders.getItems("0", {
        fields: "id,type,name",
        limit: 1000,
    });
    const folderName = "__ticklabfs_backup";
    let rootFolderId;
    const existing = rootItems.entries.find(
        (it) => it.type === "folder" && it.name === folderName
    );
    if (existing) {
        rootFolderId = existing.id;
    } else {
        console.warn("Box backup folder not found, skipping pull");
        return true;
    }
    const pulledEntries = await downloadTreeBox(
        rootFolderId,
        centralFolderPath,
        client,
        [],
        "box",
        boxUsername
    );
    await store.set("boxMapping", boxMapping);
    const rootEntries = pulledEntries.filter(
        (entry) => entry.parentId === rootFolderId
    );
    for (const entry of rootEntries) {
        if (entry.origOS !== process.platform) {
            console.warn(
                `Skipping ${entry.path} as it was created on a different OS (${entry.origOS})`
            );
            continue;
        }
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

    notifyRenderer();
    console.log("Pull from Box completed successfully");
    return true;
}

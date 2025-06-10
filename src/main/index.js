import { app, BrowserWindow, ipcMain, session, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import icon from "../../resources/icon.png?asset";
import { google } from "googleapis";
import "dotenv/config";
import Store from "electron-store";
import { is } from "@electron-toolkit/utils";
import fs from "fs";

const fileURL = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURL);

// Ensure the environment variables are set
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Initialize the OAuth2 client with the credentials
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Create an instance of electron-store to manage settings
const store = new Store();

// Create an instance of electron-store to manage settings
const mapping = store.get("driveMapping", {});

// Handle the request to sign in to Google Drive
ipcMain.handle("google-drive:sign-in", async () => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    });

    return new Promise((resolve, reject) => {
        const authWin = new BrowserWindow({
            width: 500,
            height: 600,
            icon: icon,
            title: "Sign in to Google Drive",
            parent: BrowserWindow.getFocusedWindow(),
            modal: true,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
            },
        });
        const filter = { urls: [`${REDIRECT_URI}/*`] };
        let handled = false;

        function onBeforeRequestHandler(details, callback) {
            try {
                const code = new URL(details.url).searchParams.get("code");
                if (code) {
                    handled = true;
                    session.defaultSession.webRequest.onBeforeRequest(
                        filter,
                        null
                    );
                    authWin.removeAllListeners("closed");

                    const params = new URLSearchParams({
                        client_id: CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        code,
                        redirect_uri: REDIRECT_URI,
                        grant_type: "authorization_code",
                    });

                    fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: params.toString(),
                    })
                        .then((res) => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            return res.json();
                        })
                        .then((tokens) => {
                            store.set("google-drive-tokens", tokens);
                            oauth2Client.setCredentials(tokens);
                            resolve(tokens);
                        })
                        .catch((err) => reject(err))
                        .finally(() => authWin.close());
                    return;
                }
                callback({ cancel: false });
            } catch (err) {
                session.defaultSession.webRequest.onBeforeRequest(filter, null);
                reject(err);
                authWin.close();
            }
        }

        session.defaultSession.webRequest.onBeforeRequest(
            filter,
            onBeforeRequestHandler
        );

        authWin.on("closed", () => {
            session.defaultSession.webRequest.onBeforeRequest(filter, null);
            if (!handled) {
                reject(new Error("Authentication window was closed by user"));
            }
        });

        authWin.loadURL(authUrl);
    });
});

// Handle the request to get saved tokens
ipcMain.handle("google-drive:get-tokens", () => {
    return store.get("google-drive-tokens") || null;
});

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
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
};

// Listen for token changes and save them
oauth2Client.on("tokens", (tokens) => {
    const current = store.get("google-drive-tokens", {});
    store.set("google-drive-tokens", { ...current, ...tokens });
});

// Fetch the user's display name from Google Drive
async function fetchUserName() {
    const drv = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drv.about.get({ fields: "user(displayName)" });
    return res.data.user.displayName;
}

// Handle the request to get the user's display name
ipcMain.handle("google-drive:get-username", async () => {
    if (!oauth2Client.credentials.access_token) return null;
    const name = await fetchUserName();
    store.set("google-drive-username", name);
    return name;
});

// Handle choosing a central folder
ipcMain.handle("app:select-central-folder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openDirectory"],
    });
    if (canceled) return null;
    return filePaths[0];
});

// Handle saving the central folder path
ipcMain.handle("app:save-central-folder", async (_, folderPath) => {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const data = { centralFolderPath: folderPath };
    await fs.promises.writeFile(
        cfgPath,
        JSON.stringify(data, null, 2),
        "utf-8"
    );
    return true;
});

// Handle retrieving the central folder path from the config
ipcMain.handle("app:get-central-folder", async () => {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        const { centralFolderPath } = JSON.parse(raw);
        return centralFolderPath || null;
    } catch {
        return null;
    }
});

// Handle signing out of Google Drive
ipcMain.handle("app:sign-out", () => {
    store.delete("google-drive-tokens");
    store.delete("google-drive-username");
    return true;
});

// Handle selecting multiple files
ipcMain.handle("app:select-files", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
    });
    return canceled ? null : filePaths;
});

// Handle selecting multiple folders
ipcMain.handle("app:select-folders", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openDirectory", "multiSelections"],
    });
    return canceled ? null : filePaths;
});

// Handle syncing files/folders to Google Drive and creating symlinks
ipcMain.handle("app:sync-files", async (_, paths) => {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const raw = await fs.promises.readFile(cfgPath, "utf-8");
    const { centralFolderPath } = JSON.parse(raw);
    if (!centralFolderPath) throw new Error("Central folder not set");

    const drive = google.drive({ version: "v3", auth: oauth2Client });
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

    // recursive upload helper
    async function traverseAndUpload(srcPath, parentId) {
        const stats = await fs.promises.stat(srcPath);
        const key = srcPath;
        const record = mapping[key];

        if (stats.isDirectory()) {
            const existingFolder = record && record.parentId === parentId;
            let folderId = existingFolder ? record.id : null;
            if (!folderId) {
                const folderRes = await drive.files.create({
                    requestBody: {
                        name: path.basename(srcPath),
                        mimeType: "application/vnd.google-apps.folder",
                        parents: [parentId],
                    },
                    fields: "id",
                });
                folderId = folderRes.data.id;
                mapping[key] = { id: folderId, parentId };
            }
            const entries = await fs.promises.readdir(srcPath);
            for (const entry of entries) {
                await traverseAndUpload(path.join(srcPath, entry), folderId);
            }
        } else {
            const isSameParent = record && record.parentId === parentId;
            if (isSameParent) {
                await drive.files.update({
                    fileId: record.id,
                    media: { body: fs.createReadStream(srcPath) },
                });
            } else {
                const fileRes = await drive.files.create({
                    requestBody: {
                        name: path.basename(srcPath),
                        parents: [parentId],
                    },
                    media: { body: fs.createReadStream(srcPath) },
                });
                mapping[key] = { id: fileRes.data.id, parentId };
            }
        }
    }

    for (const p of paths) {
        await traverseAndUpload(p, driveFolderId);
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
});

async function traverseCompare(srcPath, fileId, drive) {
    try {
        const stats = await fs.promises.stat(srcPath);
        if (stats.isDirectory()) {
            const entries = await fs.promises.readdir(srcPath);
            for (const entry of entries) {
                const childPath = path.join(srcPath, entry);
                const rec = mapping[childPath];
                if (rec) {
                    await traverseCompare(childPath, rec.id, drive);
                }
            }
        } else {
            const meta = await drive.files.get({
                fileId,
                fields: "modifiedTime",
            });
            const remoteTime = new Date(meta.data.modifiedTime);
            const localTime = stats.mtime;
            if (localTime > remoteTime) {
                await drive.files.update({
                    fileId,
                    media: { body: fs.createReadStream(srcPath) },
                });
            }
        }
    } catch (err) {
        if (err.code === "ENOENT") {
            try {
                await drive.files.delete({ fileId });
            } catch (driveErr) {
                console.error("Failed to delete on Drive:", driveErr);
            }
            delete mapping[srcPath];
            console.log(
                `Deleted ${srcPath} locally : removed on Drive (ID=${fileId})`
            );
            return;
        } else {
            throw err;
        }
    }
}

// Handle syncing on app launch
ipcMain.handle("app:sync-on-launch", async () => {
    const settings = store.get("settings", {
        autoDeleteOnLaunch: false,
        autoUpdateOnLaunch: false,
    });
    const { autoDeleteOnLaunch, autoUpdateOnLaunch } = settings;

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

    const drive = google.drive({ version: "v3", auth: oauth2Client });

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
            try {
                await traverseCompare(src, rec.id, drive);
            } catch (e) {
                console.error("Error syncing on launch for", src, e);
            }
        }
    }

    await store.set("driveMapping", mapping);
    return true;
});

// Handle retrieving the current settings
ipcMain.handle("app:get-settings", () => {
    return store.get("settings", {
        autoDeleteOnLaunch: false,
        autoUpdateOnLaunch: false,
        darkMode: false,
    });
});

// Handle updating the settings
ipcMain.handle("app:update-settings", async (_, newSettings) => {
    const curr = store.get("settings", {});
    const updated = { ...curr, ...newSettings };
    store.set("settings", updated);
    return updated;
});

// Handle pulling data from Google Drive to the central folder
ipcMain.handle("app:pull-from-drive", async () => {
    const cfgPath = path.join(app.getPath("userData"), "central_folder.json");
    const { centralFolderPath } = JSON.parse(
        await fs.promises.readFile(cfgPath, "utf-8")
    );
    if (!centralFolderPath) throw new Error("Central folder not set");

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const {
        data: { files: root },
    } = await drive.files.list({
        q: "name='FS-Backup-Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
        spaces: "drive",
    });
    if (!root.length) throw new Error("Drive backup folder not found");
    const rootId = root[0].id;

    async function downloadTree(parentId, localDir) {
        await fs.promises.mkdir(localDir, { recursive: true });

        let pageToken = null;
        do {
            const { data } = await drive.files.list({
                q: `'${parentId}' in parents and trashed=false`,
                fields: "nextPageToken, files(id, name, mimeType)",
                pageToken,
            });

            for (const file of data.files) {
                const targetPath = path.join(localDir, file.name);
                const isFolder =
                    file.mimeType === "application/vnd.google-apps.folder";

                if (isFolder) {
                    await downloadTree(file.id, targetPath);
                } else {
                    try {
                        await fs.promises.access(targetPath, fs.constants.F_OK);
                        continue;
                        // eslint-disable-next-line no-empty
                    } catch {}

                    const dest = fs.createWriteStream(targetPath);
                    const res = await drive.files.get(
                        { fileId: file.id, alt: "media" },
                        { responseType: "stream" }
                    );
                    await new Promise((resolve, reject) => {
                        res.data
                            .on("end", resolve)
                            .on("error", reject)
                            .pipe(dest);
                    });
                }
            }
            pageToken = data.nextPageToken;
        } while (pageToken);
    }

    await downloadTree(rootId, centralFolderPath);
    return true;
});

app.whenReady().then(() => {
    // Check if the Google Drive tokens are saved
    const saved = store.get("google-drive-tokens");
    if (saved) {
        oauth2Client.setCredentials(saved);
    }

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

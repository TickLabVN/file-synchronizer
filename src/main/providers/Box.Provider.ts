import path from "path";
import fs from "fs";
import axios from "axios";
import { app, BrowserWindow } from "electron";
import BoxSDK from "box-node-sdk";
import BoxClient from "box-node-sdk/lib/box-client";
import { Readable } from "stream";

import type {
    ICloudProvider,
    AuthAccount,
    SyncOptions,
    SyncResult,
    TrackedFiles,
} from "../lib/ICloudProvider";

import { CredentialStore } from "../lib/credentials";
import { BACKEND_URL, store, deviceId } from "../lib/constants";

import traverseAndUpload from "../utils/traverseAndUpload.Generic";
import traverseCompare from "../utils/traverseCompare.Generic";
import downloadTree from "../utils/downloadTree.Generic";
import cleanup from "../utils/cleanup.Generic";
import {
    UploadHooks,
    CompareHooks,
    DownloadHooks,
    CleanupHooks,
} from "../utils/types";
import { mappingStore } from "../utils/mappingStore";
import getDirSize from "../utils/getDirSize";
// @ts-ignore – icon as asset
import icon from "../../../resources/icon.png?asset";

// Define the structure of Box tokens
type BoxTokens = {
    access_token: string;
    refresh_token: string;
    name?: string;
    [k: string]: unknown;
};
// Define the structure of box folder entries
type BoxFolderEntry = {
    id: string;
    type: string;
    name: string;
};

// Define the structure of a Box error
type BoxError = {
    code?: number | string;
    response?: { status?: number };
    message?: string;
};

// Define the structure of a Box lock entry
type BoxLockEntry = {
    id: string;
    type: string;
    name: string;
    created_at: string;
    description?: string;
};

// Box provider implementation for file synchronization.
export default class BoxProvider implements ICloudProvider {
    // Unique identifier for the provider
    readonly id = "box";
    readonly displayName = "Box";

    // Credential store for managing Box accounts
    private readonly credStore = new CredentialStore<BoxTokens>(
        "com.filesynchronizer.box",
        "boxAccounts"
    );

    /**
     * Active account for Box provider.
     * If no account is active, it will be null.
     */
    private get activeAccount(): string | null {
        return (store.get("boxActive") as string) || null;
    }

    /**
     * Sets the active account for Box provider.
     * If the account is null, it removes the active account from the store.
     */
    private set activeAccount(login: string | null) {
        if (login) store.set("boxActive", login);
        else store.delete("boxActive");
    }

    /* ------------------------------------------------------------------ */
    /*                    AUTHENTICATION METHODS                          */
    /* ------------------------------------------------------------------ */

    /**
     * Initiates the sign-in process for Box.
     * Opens a browser window for user authentication and retrieves tokens.
     *
     * @returns A promise that resolves to the authenticated account information.
     */
    async signIn(): Promise<AuthAccount> {
        const authUrl = `${BACKEND_URL}/auth/box`;

        return new Promise<AuthAccount>((resolve, reject) => {
            const authWin = new BrowserWindow({
                width: 500,
                height: 600,
                modal: true,
                title: "Sign in to Box",
                icon: icon,
                parent: BrowserWindow.getFocusedWindow() || undefined,
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    sandbox: false,
                    partition: `box-auth-${Date.now()}`,
                },
            });

            let handled = false;

            const handleRedirect = async (url: string): Promise<void> => {
                if (!url.startsWith("myapp://oauth")) return;
                handled = true;
                const code = new URL(url).searchParams.get("code");
                if (!code) {
                    reject(new Error("[Box.auth] No code returned"));
                    authWin.close();
                    return;
                }
                try {
                    const { data: tokens } = await axios.get(
                        `${BACKEND_URL}/auth/box/token?code=${code}`
                    );

                    // Persist tokens & inform backend
                    await axios.post(
                        `${BACKEND_URL}/auth/box/set-tokens`,
                        tokens
                    );

                    // Retrieve profile (login / name) using freshly-set tokens
                    const { data: profile } = await axios.get(
                        `${BACKEND_URL}/auth/box/me`
                    );

                    const login: string = profile.login;
                    const displayName: string | undefined = profile.name;
                    tokens.name = profile.name;

                    await this.credStore.add(login, tokens);

                    this.activeAccount = login;

                    resolve({
                        id: login,
                        displayName: displayName || login,
                        tokens,
                    });
                } catch (err) {
                    reject(err as Error);
                } finally {
                    authWin.close();
                }
            };

            authWin.webContents.on("will-redirect", (_, url) =>
                handleRedirect(url)
            );
            authWin.webContents.on("will-navigate", (_, url) =>
                handleRedirect(url)
            );
            authWin.on("closed", () => {
                if (!handled)
                    reject(
                        new Error(
                            "[Box.auth] Authentication window was closed by user"
                        )
                    );
            });

            authWin.loadURL(authUrl);
        });
    }

    /**
     * Lists all accounts stored in the credential store.
     *
     * @returns A promise that resolves to an array of AuthAccount objects.
     */
    async listAccounts(): Promise<AuthAccount[]> {
        const list = await this.credStore.list();
        return list.map(({ account, tokens }) => {
            const t = tokens as BoxTokens;
            const uname = t.name || account;
            return { id: account, displayName: uname, tokens };
        });
    }

    /**
     * Uses the specified account for Box operations.
     * Sets the active account and retrieves its tokens.
     *
     * @param id - The account ID to use.
     * @returns A promise that resolves to true if the account was successfully set.
     */
    async useAccount(id: string): Promise<boolean> {
        const tokens = await this.credStore.get(id);
        if (!tokens) throw new Error(`No saved tokens for ${id}`);
        await axios.post(`${BACKEND_URL}/auth/box/set-tokens`, tokens);
        this.activeAccount = id;
        return true;
    }

    /**
     * Signs out of the specified Box account.
     * Deletes the account from the credential store and clears the active account.
     *
     * @param id - The account ID to sign out from.
     * @returns A promise that resolves to true if the sign-out was successful.
     */
    async signOut(id: string): Promise<boolean> {
        await this.credStore.delete(id);
        if (this.activeAccount === id) this.activeAccount = null;
        return true;
    }

    /**
     * Retrieves the profile information for the specified Box account.
     * This includes the account ID, display name, and tokens.
     *
     * @param id - The account ID for which to retrieve the profile.
     * @returns A promise that resolves to an AuthAccount object containing the profile information.
     */
    async getProfile(id: string): Promise<AuthAccount> {
        const tokens = await this.credStore.get(id);
        if (!tokens) throw new Error(`No saved tokens for ${id}`);
        const { data: profile } = await axios.get(`${BACKEND_URL}/auth/box/me`);
        return {
            id: profile.login,
            displayName: profile.name || profile.login,
            tokens,
        };
    }

    /* ------------------------------------------------------------------ */
    /*                         CLIENT HELPERS                             */
    /* ------------------------------------------------------------------ */

    /**
     * Creates a Box client using the stored tokens for the active account.
     * Throws an error if no active account is set or if the refresh token is missing.
     *
     * @returns A promise that resolves to a Box client instance.
     */
    private async getBoxClient(): Promise<BoxClient> {
        if (!this.activeAccount)
            throw new Error("[Box.client] No active Box account selected");
        const stored = await this.credStore.get(this.activeAccount);
        if (!stored?.refresh_token)
            throw new Error(
                `[Box.client] No refresh token for ${this.activeAccount}`
            );

        const { data: fresh } = await axios.post(
            `${BACKEND_URL}/auth/box/refresh-tokens`,
            {
                refresh_token: stored.refresh_token,
            }
        );
        const merged = { ...stored, ...fresh };

        await this.credStore.add(this.activeAccount, merged);
        await axios.post(`${BACKEND_URL}/auth/box/set-tokens`, fresh);

        return BoxSDK.getBasicClient(fresh.access_token);
    }

    /* ------------------------------------------------------------------ */
    /*                            HOOKS                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Builds the upload hooks for interacting with Box.
     * These hooks define how files and folders are uploaded to Box.
     *
     * @param box - The Box client instance.
     * @returns An object containing the upload hooks.
     */
    private buildUploadHooks(box: BoxClient): UploadHooks {
        return {
            uploadFolder: async (name, parentId, localPath) => {
                const folder = await box.folders.create(parentId, name);
                const folderId: string = folder.id;
                try {
                    await box.folders.addMetadata(
                        folderId,
                        "global",
                        "properties",
                        {
                            originalPath: localPath,
                            os: process.platform,
                        }
                    );
                } catch (err: unknown) {
                    if ((err as BoxError).response?.status !== 409)
                        console.warn("[Box] folder metadata", err);
                }
                return folderId;
            },

            uploadFile: async (localPath, parentId) => {
                const uploadRes = await box.files.uploadFile(
                    parentId,
                    path.basename(localPath),
                    fs.createReadStream(localPath)
                );
                const uploaded = Array.isArray(uploadRes.entries)
                    ? uploadRes.entries[0]
                    : uploadRes;
                const fileId: string = uploaded.id;
                try {
                    await box.files.addMetadata(
                        fileId,
                        "global",
                        "properties",
                        {
                            originalPath: localPath,
                            os: process.platform,
                        }
                    );
                } catch (err: unknown) {
                    if ((err as BoxError).response?.status !== 409)
                        console.warn("[Box] file metadata", err);
                }
                return fileId;
            },

            updateFile: async (remoteId, localPath) => {
                await box.files.uploadNewFileVersion(
                    remoteId,
                    fs.createReadStream(localPath)
                );
            },

            setMetadata: async (remoteId, meta) => {
                try {
                    await box.files.updateMetadata(
                        remoteId,
                        "global",
                        "properties",
                        meta
                    );
                } catch (err: unknown) {
                    if ((err as BoxError).response?.status !== 409)
                        console.warn("[Box] setMetadata", err);
                }
            },
        } satisfies UploadHooks;
    }

    /**
     * Builds the compare hooks for Box.
     * These hooks define how to compare local files with remote files in Box.
     *
     * @param box - The Box client instance.
     * @returns An object containing the compare hooks.
     */
    private buildCompareHooks(box: BoxClient): CompareHooks {
        return {
            getRemoteMTime: async (remoteId) => {
                const file = await box.files.get(remoteId, {
                    fields: "modified_at",
                });
                return new Date(file.modified_at);
            },

            deleteRemote: async (remoteId, isDir) => {
                if (isDir)
                    await box.folders.delete(remoteId, { recursive: true });
                else await box.files.delete(remoteId);
            },

            newVersion: async (remoteId, localPath) => {
                await box.files.uploadNewFileVersion(
                    remoteId,
                    fs.createReadStream(localPath)
                );
            },
        } satisfies CompareHooks;
    }

    /**
     * Builds the download hooks for Box.
     * These hooks define how to download files and list children in Box.
     *
     * @param box - The Box client instance.
     * @returns An object containing the download hooks.
     */
    private buildDownloadHooks(box: BoxClient): DownloadHooks {
        return {
            listChildren: async (parentId) => {
                const limit = 1000;
                let offset = 0;
                const children: Array<{
                    id: string;
                    name: string;
                    isFolder: boolean;
                    meta?: unknown;
                }> = [];
                while (true) {
                    const { entries } = await box.folders.getItems(parentId, {
                        fields: "id,type,name",
                        limit,
                        offset,
                    });
                    for (const item of entries) {
                        let meta: Record<string, unknown> = {};
                        try {
                            if (item.type === "file")
                                meta = await box.files.getMetadata(
                                    item.id,
                                    "global",
                                    "properties"
                                );
                            else if (item.type === "folder")
                                meta = await box.folders.getMetadata(
                                    item.id,
                                    "global",
                                    "properties"
                                );
                        } catch (err: unknown) {
                            if ((err as BoxError).response?.status !== 404)
                                console.warn("[Box] metadata error", err);
                        }
                        children.push({
                            id: item.id,
                            name: item.name,
                            isFolder: item.type === "folder",
                            meta,
                        });
                    }
                    if (entries.length < limit) break;
                    offset += entries.length;
                }
                return children;
            },

            readFile: async (remoteId, dest) => {
                await new Promise<void>((resolve, reject) => {
                    box.files.getReadStream(
                        remoteId,
                        undefined,
                        (err: unknown, stream: Readable) => {
                            if (err) return reject(err);
                            stream
                                .pipe(dest)
                                .on("finish", resolve)
                                .on("error", reject);
                        }
                    );
                });
            },
        } satisfies DownloadHooks;
    }

    /**
     * Builds the cleanup hooks for Box.
     * These hooks define how to delete remote files and folders in Box.
     *
     * @param box - The Box client instance.
     * @returns An object containing the cleanup hooks.
     */
    private buildCleanupHooks(box: BoxClient): CleanupHooks {
        return {
            deleteRemote: async (remoteId, isDir) => {
                if (isDir)
                    await box.folders.delete(remoteId, { recursive: true });
                else await box.files.delete(remoteId);
            },
        } satisfies CleanupHooks;
    }

    /* ------------------------------------------------------------------ */
    /*                       SYNC MAIN METHODS                            */
    /* ------------------------------------------------------------------ */

    /**
     * Synchronizes the specified paths with Box.
     * Acquires a lock to prevent concurrent sync operations.
     *
     * @param options - The sync options including paths and exclusions.
     * @returns A promise that resolves to the sync result.
     */
    async sync(options: SyncOptions): Promise<SyncResult> {
        const { paths, exclude = [] } = options;
        const box = await this.getBoxClient();
        const backupFolderId = await this.ensureBackupFolder(box);
        const uploadHooks = this.buildUploadHooks(box);

        const { acquired, lockId } = await this.acquireLock(
            backupFolderId,
            deviceId
        );
        if (!acquired) {
            console.log("[Box.sync] Skipping sync, lock already held");
            return { success: true, failed: null };
        }

        try {
            const me = await box.users.get(box.CURRENT_USER_ID, {
                fields: "name,login",
            });
            const username = me.name || me.login;

            const cfgPath = path.join(
                app.getPath("userData"),
                "central-config.json"
            );
            const cfgRaw = await fs.promises.readFile(cfgPath, "utf-8");
            const { centralFolderPath } = JSON.parse(cfgRaw);
            if (!centralFolderPath) throw new Error("Central folder not set");

            const failed: Array<{ path: string; error: string }> = [];

            for (const p of paths) {
                if (exclude.includes(p)) continue;
                try {
                    await traverseAndUpload(p, backupFolderId, uploadHooks, {
                        exclude,
                        provider: this.id,
                        account: username,
                    });
                    await this.ensureSymlink(p, centralFolderPath);
                } catch (err: unknown) {
                    if (
                        err &&
                        typeof err === "object" &&
                        "code" in err &&
                        (err as { code?: string }).code === "ENOENT"
                    ) {
                        console.warn(
                            `[Box.sync] Path "${p}" missing locally, cleaning up on Box...`
                        );
                        await cleanup(p, this.buildCleanupHooks(box));
                        failed.push({
                            path: p,
                            error:
                                (err as { message?: string }).message ??
                                "ENOENT",
                        });
                        continue;
                    }
                    const msg =
                        err instanceof Error
                            ? err.message
                            : typeof err === "string"
                              ? err
                              : JSON.stringify(err);
                    failed.push({ path: p, error: msg });
                }
            }

            return {
                success: failed.length === 0,
                failed: failed.length ? failed[0] : null,
            };
        } finally {
            if (lockId) await this.releaseLock(lockId).catch(() => {});
        }
    }

    /**
     * Automatically synchronizes files with Box.
     * Acquires a lock and checks for changes in tracked files.
     *
     * @returns A promise that resolves to true if the sync was successful, false otherwise.
     */
    async autoSync(): Promise<boolean> {
        if (!this.activeAccount) return true;
        const box = await this.getBoxClient();
        const backupFolderId = await this.ensureBackupFolder(box);
        const { acquired, lockId } = await this.acquireLock(
            backupFolderId,
            deviceId
        );
        if (!acquired) {
            console.log("[Box.autoSync] Skipping auto-sync, lock already held");
            return true;
        }

        const compareHooks = this.buildCompareHooks(box);
        const me = await box.users.get(box.CURRENT_USER_ID, {
            fields: "name,login",
        });
        const username = me.name || me.login;

        let anyChanged = false;
        try {
            for (const key of mappingStore.keys()) {
                const rec = mappingStore.get(key);
                if (!rec) continue;
                if (rec.provider !== this.id || rec.account !== username)
                    continue;
                try {
                    const changed = await traverseCompare(
                        key,
                        rec.id,
                        compareHooks
                    );
                    anyChanged ||= changed;
                } catch (err) {
                    console.error("[Box.autoSync]", key, err);
                }
            }
            return anyChanged;
        } finally {
            if (lockId) await this.releaseLock(lockId).catch(() => {});
        }
    }

    /**
     * Pulls the latest changes from Box to the local filesystem.
     * Downloads files from the backup folder and creates symlinks in the central folder.
     *
     * @returns A promise that resolves to true if the pull was successful.
     */
    async pull(): Promise<boolean> {
        const box = await this.getBoxClient();
        const backupFolderId = await this.ensureBackupFolder(box);
        const downloadHooks = this.buildDownloadHooks(box);

        const me = await box.users.get(box.CURRENT_USER_ID, {
            fields: "name,login",
        });
        const username = me.name || me.login;

        const cfgPath = path.join(
            app.getPath("userData"),
            "central-config.json"
        );
        const cfg = JSON.parse(await fs.promises.readFile(cfgPath, "utf-8"));
        const centralFolderPath = cfg.centralFolderPath as string | undefined;
        if (!centralFolderPath) throw new Error("Central folder not set");

        await downloadTree(backupFolderId, centralFolderPath, downloadHooks, {
            provider: this.id,
            account: username,
        });
        return true;
    }

    /* ------------------------------------------------------------------ */
    /*                          TRACKED FILES                             */
    /* ------------------------------------------------------------------ */

    /**
     * Retrieves the list of tracked files for the Box provider.
     * Each tracked file includes its ID, whether it's a directory, last sync time, size, and other metadata.
     *
     * @returns A promise that resolves to an array of tracked files.
     */
    async getTrackedFiles(): Promise<TrackedFiles[]> {
        const result: TrackedFiles = {};
        for (const key of mappingStore.keys()) {
            const rec = mappingStore.get(key);
            if (!rec || rec.provider !== this.id) continue;
            let isDirectory = rec.isDirectory;
            let size: number | null = null;
            try {
                const stats = await fs.promises.stat(key);
                isDirectory = stats.isDirectory();
                size = isDirectory ? await getDirSize(key) : stats.size;
            } catch {
                size = null;
            }
            result[key] = {
                id: rec.id,
                isDirectory,
                lastSync: new Date(rec.lastSync).getTime(),
                size,
                provider: rec.provider,
                username: rec.account,
                src: key,
            };
        }
        return [result];
    }

    /**
     * Deletes a tracked file from Box.
     * Removes the file from Box and deletes the symlink in the central folder.
     *
     * @param src - The source path of the tracked file to delete.
     * @returns A promise that resolves to true if the deletion was successful.
     */
    async deleteTrackedFile(src: string): Promise<boolean> {
        const rec = mappingStore.get(src);
        if (!rec) throw new Error("File not tracked in Box: " + src);
        const box = await this.getBoxClient();
        try {
            if (rec.isDirectory)
                await box.folders.delete(rec.id, { recursive: true });
            else await box.files.delete(rec.id);
        } catch (err) {
            console.warn("[Box.deleteTrackedFile] remote delete", err);
        }

        const cfgPath = path.join(
            app.getPath("userData"),
            "central-config.json"
        );
        const { centralFolderPath } = JSON.parse(
            await fs.promises.readFile(cfgPath, "utf-8")
        );
        const linkPath = path.join(centralFolderPath, path.basename(src));
        try {
            await fs.promises.unlink(linkPath);
        } catch {
            console.warn(
                "[Box.deleteTrackedFile] unlink symlink failed",
                linkPath
            );
        }

        mappingStore.deleteSubtree(src);
        return true;
    }

    /* ------------------------------------------------------------------ */
    /*                               LOCKS                                */
    /* ------------------------------------------------------------------ */

    /**
     * Acquires a lock for the specified backup folder in Box.
     * This prevents concurrent sync operations from interfering with each other.
     *
     * @param backupFolderId - The ID of the backup folder to lock.
     * @param deviceId - The unique identifier for the device requesting the lock.
     * @param ttlMs - Time-to-live for the lock in milliseconds (default is 10 minutes).
     * @returns A promise that resolves to an object indicating whether the lock was acquired and its ID.
     */
    async acquireLock(
        backupFolderId: string,
        deviceId: string,
        ttlMs: number = 10 * 60 * 1e3
    ): Promise<{ acquired: boolean; lockId?: string }> {
        const box = await this.getBoxClient();
        const LOCK_NAME = "__ticklabfs_sync.lock";
        if (!(await this.folderExists(box, backupFolderId))) {
            backupFolderId = await this.ensureBackupFolder(box);
        }
        const { entries } = await box.folders.getItems(backupFolderId, {
            fields: "id,name,created_at",
            limit: 1000,
        });

        const existing = entries.find(
            (e: BoxLockEntry) => e.type === "file" && e.name === LOCK_NAME
        );

        if (existing) {
            const sameDevice = existing.description === deviceId;
            const age = Date.now() - new Date(existing.created_at).getTime();
            if (age < ttlMs && !sameDevice) return { acquired: false };
            try {
                await box.files.delete(existing.id);
            } catch (err: unknown) {
                const status = (err as BoxError).response?.status;
                if (status !== 404 && status !== 403) {
                    console.warn(
                        "[Box.acquireLock] Failed to delete existing lock:",
                        existing.id,
                        (err as Error).message
                    );
                }
            }
        }

        const res = await box.files.uploadFile(
            backupFolderId,
            LOCK_NAME,
            Buffer.from("")
        );
        const fileEntry = res?.entries?.[0];
        if (!fileEntry?.id) {
            throw new Error(
                "Box lock upload succeeded but no file ID returned"
            );
        }
        await box.files.update(fileEntry.id, { description: deviceId });
        return { acquired: true, lockId: fileEntry.id };
    }

    /**
     * Releases the lock for the specified backup folder in Box.
     * Deletes the lock file if it exists.
     *
     * @param lockId - The ID of the lock to release.
     * @returns A promise that resolves when the lock is released.
     */
    async releaseLock(lockId: string): Promise<void> {
        const box = await this.getBoxClient();
        if (lockId) {
            try {
                await box.files.delete(lockId);
                console.log(`[Box.release] Deleted lock ${lockId}`);
            } catch (err: unknown) {
                const status = (err as BoxError).response?.status;
                if (status === 404) {
                    console.debug(
                        `[Box.release] Lock ${lockId} already deleted`
                    );
                } else if (status === 403) {
                    console.warn(
                        `[Box.release] Lock ${lockId} could not be deleted (403 Forbidden)`
                    );
                } else {
                    console.debug(
                        `[Box.release] Lock ${lockId} already gone (status ${status})`
                    );
                }
            }
        }
    }

    /**
     * Cleans up the lock file on Box when the application exits.
     * This ensures that no stale locks remain in the backup folder.
     *
     * @param backupFolderId - The ID of the backup folder to clean up.
     * @returns A promise that resolves when the cleanup is complete.
     */
    async cleanupLockOnExit(backupFolderId: string): Promise<void> {
        const box = await this.getBoxClient();
        const LOCK_NAME = "__ticklabfs_sync.lock";
        const { entries } = await box.folders.getItems(backupFolderId, {
            fields: "id,name",
            limit: 1000,
        });
        const lock = entries.find(
            (e: BoxLockEntry) => e.type === "file" && e.name === LOCK_NAME
        );
        if (lock) {
            try {
                await box.files.delete(lock.id);
                console.log("[Box.exit] Deleted lock file on Box");
            } catch (err) {
                console.warn(
                    "[Box.exit] Failed to delete lock file on Box:",
                    err
                );
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*                             UTILITIES                              */
    /* ------------------------------------------------------------------ */

    /**
     * Ensures a symlink exists in the central folder for the specified source path.
     * If the symlink already exists, it is updated to point to the new source.
     *
     * @param src - The source path to link to.
     * @param centralDir - The central directory where the symlink should be created.
     */
    private async ensureSymlink(
        src: string,
        centralDir: string
    ): Promise<void> {
        const linkPath = path.join(centralDir, path.basename(src));
        try {
            await fs.promises.unlink(linkPath);
        } catch {
            console.warn("[Box.ensureSymlink] unlink symlink failed", linkPath);
        }

        const stats = await fs.promises.stat(src);
        const type = stats.isDirectory() ? "junction" : "file";
        try {
            await fs.promises.symlink(src, linkPath, type);
        } catch (err: unknown) {
            if (
                process.platform === "win32" &&
                typeof err === "object" &&
                err !== null &&
                "code" in err &&
                (err as { code?: string }).code === "EPERM"
            ) {
                if (stats.isDirectory()) {
                    await fs.promises.cp(src, linkPath, { recursive: true });
                } else {
                    try {
                        await fs.promises.link(src, linkPath);
                    } catch {
                        await fs.promises.copyFile(src, linkPath);
                    }
                }
            } else {
                throw err;
            }
        }
    }

    /**
     * Ensures the backup folder exists in Box.
     * Creates the folder if it does not exist and returns its ID.
     *
     * @param box - The Box client instance.
     * @returns A promise that resolves to the ID of the backup folder.
     */
    private async ensureBackupFolder(box: BoxClient): Promise<string> {
        const folderName = "__ticklabfs_backup";
        const { entries } = await box.folders.getItems("0", {
            fields: "id,type,name",
            limit: 1000,
        });

        const existing = entries.find(
            (it: BoxFolderEntry) =>
                it.type === "folder" && it.name === folderName
        );
        if (existing) return existing.id;
        const created = await box.folders.create("0", folderName);
        return created.id;
    }

    /**
     * Checks if a folder exists in Box by its ID.
     * Returns true if the folder exists, false otherwise.
     *
     * @param box - The Box client instance.
     * @param id - The ID of the folder to check.
     * @returns A promise that resolves to true if the folder exists, false otherwise.
     */
    private async folderExists(box: BoxClient, id: string): Promise<boolean> {
        try {
            await box.folders.get(id, { fields: "id" });
            return true;
        } catch (err: unknown) {
            const status = (err as BoxError).response?.status;
            if (status === 404) return false;
            return false;
        }
    }
}

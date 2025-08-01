import path from "path";
import fs from "fs";
import axios from "axios";
import { app, BrowserWindow } from "electron";
import { google, drive_v3 } from "googleapis";
import mime from "mime-types";
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
// @ts-ignore: importing icon as an asset
import icon from "../../../resources/icon.png?asset";
import { loadStopLists, isStopped } from "../utils/stopSync";
import ensureSymlink from "../utils/ensureSymlink";
import pickRootPaths from "../utils/pickRootPaths";
import { broadcast } from "../windows/WindowManager";

// Define the structure of Google Drive tokens
type GoogleDriveTokens = {
  id_token: string;
  [key: string]: unknown;
};

// Define the structure of a Google Drive error
type GoogleDriveError = {
  code?: number | string;
  response?: { status?: number };
  message?: string;
};

// Define the name of the lock file used for synchronization
const LOCK_NAME = "__ticklabfs_sync.lock";

// Google Drive provider implementation for file synchronization.
export default class GoogleDriveProvider implements ICloudProvider {
  // Unique identifier for the provider
  readonly id = "google";
  readonly displayName = "Google Drive";

  // Credential store for managing Google Drive accounts
  private readonly credStore = new CredentialStore<GoogleDriveTokens>(
    "com.filesynchronizer.googledrive",
    "gdAccounts"
  );

  /**
   * Gets the currently active Google Drive account.
   * If no account is active, returns null.
   */
  private get activeAccount(): string | null {
    return (store.get("gdActive") as string) || null;
  }

  /**
   * Sets the currently active Google Drive account.
   * If the account is null, it removes the active account from the store.
   *
   * @param email - The email of the account to set as active, or null to clear.
   */
  private set activeAccount(email: string | null) {
    if (email) store.set("gdActive", email);
    else store.delete("gdActive");
  }

  /* ------------------------------------------------------------------ */
  /*                       AUTHENTICATION METHODS                       */
  /* ------------------------------------------------------------------ */

  /**
   * Signs in the user to Google Drive and retrieves their account information.
   *
   * @returns A promise that resolves to the authenticated user's account information.
   */
  async signIn(): Promise<AuthAccount> {
    const authUrl = `${BACKEND_URL}/auth/google`;

    return new Promise<AuthAccount>((resolve, reject) => {
      const authWin = new BrowserWindow({
        width: 500,
        height: 600,
        modal: true,
        title: "Sign in to Google Drive",
        icon: icon,
        parent: BrowserWindow.getFocusedWindow() || undefined,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });

      let handled = false;

      const handleRedirect = async (url: string): Promise<void> => {
        if (url.startsWith("myapp://oauth")) {
          handled = true;
          const code = new URL(url).searchParams.get("code");
          if (!code) {
            reject(new Error("[Drive.auth] No code returned"));
            authWin.close();
            return;
          }
          try {
            const { data: tokens } = await axios.get(
              `${BACKEND_URL}/auth/google/token?code=${code}`
            );

            const payload = JSON.parse(
              Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
            );
            const email = payload.email as string;
            const name = payload.name as string | undefined;
            if (name) tokens.name = name;

            await this.credStore.add(email, tokens);

            await axios.post(`${BACKEND_URL}/auth/google/set-tokens`, tokens);

            resolve({
              id: email,
              displayName: name || email,
              tokens,
            });
          } catch (err) {
            reject(err as Error);
          } finally {
            authWin.close();
          }
        }
      };

      authWin.webContents.on("will-redirect", (_, url) => {
        handleRedirect(url);
      });
      authWin.webContents.on("will-navigate", (_, url) => {
        handleRedirect(url);
      });

      authWin.on("closed", () => {
        if (!handled) {
          reject(
            new Error("[Drive.auth] Authentication window was closed by user")
          );
        }
      });

      authWin.loadURL(authUrl);
    });
  }

  /**
   * Lists all Google Drive accounts stored in the credential store.
   *
   * @returns A promise that resolves to an array of AuthAccount objects.
   */
  async listAccounts(): Promise<AuthAccount[]> {
    const list = await this.credStore.list();
    return list.map(({ account, tokens }) => {
      const t = tokens as GoogleDriveTokens & { name?: string };
      let name = t.name || account;
      if (!t.name) {
        try {
          const payload = JSON.parse(
            Buffer.from(
              (tokens as GoogleDriveTokens).id_token.split(".")[1],
              "base64"
            ).toString()
          );
          name = payload.name || payload.email || account;
        } catch {
          console.warn("[Drive.listAccounts] Failed to parse tokens", tokens);
        }
      }
      return { id: account, displayName: name, tokens };
    });
  }

  /**
   * Sets the active Google Drive account by its identifier.
   *
   * @param id - The unique identifier of the account to use.
   * @returns A promise that resolves to true if the account was successfully set.
   */
  async useAccount(id: string): Promise<boolean> {
    const tokens = await this.credStore.get(id);
    if (!tokens) throw new Error(`No saved tokens for ${id}`);
    await axios.post(`${BACKEND_URL}/auth/google/set-tokens`, tokens);
    this.activeAccount = id;
    return true;
  }

  /**
   * Signs out the user from the specified Google Drive account.
   *
   * @param id - The unique identifier of the account to sign out.
   * @returns A promise that resolves to true if the sign-out was successful.
   */
  async signOut(id: string): Promise<boolean> {
    await this.credStore.delete(id);
    if (this.activeAccount === id) this.activeAccount = null;
    return true;
  }

  /**
   * Retrieves the profile information of the specified Google Drive account.
   *
   * @param id - The unique identifier of the account to retrieve the profile for.
   * @returns A promise that resolves to an AuthAccount object containing the profile information.
   */
  async getProfile(id: string): Promise<AuthAccount> {
    const tokens = await this.credStore.get(id);
    if (!tokens || typeof tokens !== "object" || !("id_token" in tokens))
      return {
        id,
        displayName: id,
        tokens: tokens || null,
      } as AuthAccount;

    const idToken = (tokens as GoogleDriveTokens).id_token;
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64").toString()
    );
    return {
      id,
      displayName: tokens.name || payload.name || payload.email,
      tokens,
    };
  }

  /* ------------------------------------------------------------------ */
  /*                           CLIENT HELPERS                           */
  /* ------------------------------------------------------------------ */

  /**
   * Gets the Google Drive client with the active account's credentials.
   *
   * @returns A promise that resolves to a Google Drive API client.
   */
  private async getDriveClient(): Promise<drive_v3.Drive> {
    if (!this.activeAccount) throw new Error("No active Google account");
    const stored = await this.credStore.get(this.activeAccount);
    if (!stored)
      throw new Error(
        "[Drive.client] Tokens not found for " + this.activeAccount
      );

    await axios.post(`${BACKEND_URL}/auth/google/set-tokens`, stored);

    const { data: fresh } = await axios.get(
      `${BACKEND_URL}/auth/google/refresh-tokens`
    );
    const merged = { ...stored, ...fresh };
    await this.credStore.add(this.activeAccount, merged);

    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials(fresh);
    return google.drive({ version: "v3", auth: oauth2 });
  }

  /* ------------------------------------------------------------------ */
  /*                            HOOKS                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Builds the upload hooks for interacting with Google Drive.
   * @param drive - The Google Drive API client.
   * @returns An object containing methods for uploading files and folders.
   */
  private buildUploadHooks(drive: drive_v3.Drive): UploadHooks {
    return {
      uploadFolder: async (name, parentId, localPath) => {
        const { data } = await drive.files.create({
          requestBody: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
            appProperties: {
              originalPath: localPath,
              os: process.platform,
            },
          },
          fields: "id",
        });
        return data.id as string;
      },

      uploadFile: async (localPath, parentId) => {
        const { data } = await drive.files.create({
          requestBody: {
            name: path.basename(localPath),
            parents: [parentId],
            appProperties: {
              originalPath: localPath,
              os: process.platform,
            },
          },
          media: {
            mimeType: mime.lookup(localPath) || undefined,
            body: fs.createReadStream(localPath),
          },
          fields: "id",
        });
        return data.id as string;
      },

      updateFile: async (remoteId, localPath) => {
        await drive.files.update({
          fileId: remoteId,
          media: {
            mimeType: mime.lookup(localPath) || undefined,
            body: fs.createReadStream(localPath),
          },
          requestBody: {
            appProperties: {
              originalPath: localPath,
              os: process.platform,
            },
          },
        });
      },

      setMetadata: async (remoteId, meta) => {
        await drive.files.update({
          fileId: remoteId,
          requestBody: {
            appProperties: meta,
          },
        });
      },
    } satisfies UploadHooks;
  }

  /**
   * Builds the compare hooks for comparing local and remote files.
   * @param drive - The Google Drive API client.
   * @returns An object containing methods for comparing files.
   */
  private buildCompareHooks(drive: drive_v3.Drive): CompareHooks {
    return {
      getRemoteMTime: async (remoteId) => {
        const { data } = await drive.files.get({
          fileId: remoteId,
          fields: "modifiedTime",
        });
        return new Date(data.modifiedTime!);
      },

      deleteRemote: async (remoteId) => {
        await drive.files.delete({ fileId: remoteId });
      },

      newVersion: async (remoteId, localPath) => {
        await drive.files.update({
          fileId: remoteId,
          media: {
            mimeType: mime.lookup(localPath) || undefined,
            body: fs.createReadStream(localPath),
          },
        });
      },
    } satisfies CompareHooks;
  }

  /**
   * Builds the download hooks for downloading files and folders from Google Drive.
   * @param drive - The Google Drive API client.
   * @return An object containing methods for downloading files and listing folder contents.
   */
  private buildDownloadHooks(drive: drive_v3.Drive): DownloadHooks {
    return {
      listChildren: async (parentId) => {
        const { data } = await drive.files.list({
          q: `'${parentId}' in parents and trashed=false`,
          fields: "files(id,name,mimeType,appProperties)",
          spaces: "drive",
        });
        return (data.files || [])
          .filter((f) => f.name !== LOCK_NAME)
          .map((f) => ({
            id: f.id!,
            name: f.name!,
            isFolder: f.mimeType === "application/vnd.google-apps.folder",
            meta: f.appProperties as unknown,
          }));
      },

      readFile: async (remoteId, dest) => {
        const res = await drive.files.get(
          { fileId: remoteId, alt: "media" },
          { responseType: "stream" }
        );
        await new Promise<void>((resolve, reject) => {
          (res.data as Readable)
            .pipe(dest)
            .on("finish", resolve)
            .on("error", reject);
        });
      },
    } satisfies DownloadHooks;
  }

  /**
   * Builds the cleanup hooks for cleaning up remote files and folders.
   * @param drive - The Google Drive API client.
   * @returns An object containing methods for cleaning up remote files.
   */
  private buildCleanupHooks(drive: drive_v3.Drive): CleanupHooks {
    return {
      deleteRemote: async (remoteId) => {
        await drive.files.delete({ fileId: remoteId });
      },
    } satisfies CleanupHooks;
  }

  /* ------------------------------------------------------------------ */
  /*                       SYNC MAIN METHODS                            */
  /* ------------------------------------------------------------------ */

  /**
   * Synchronizes the specified paths with Google Drive.
   * It uploads files and folders to the backup folder in Google Drive.
   *
   * @param options - The synchronization options including paths and exclusions.
   * @returns A promise that resolves to a SyncResult indicating success or failure.
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const { paths, exclude = [] } = options;
    const drive = await this.getDriveClient();
    const folderId = await this.ensureBackupFolder(drive);
    const hooks = this.buildUploadHooks(drive);

    const { acquired, lockId } = await this.acquireLock(folderId, deviceId);
    if (!acquired) {
      console.log("[Drive.sync] Skipping sync, lock already held");
      broadcast("app:toast", "Google Drive sync skipped, lock already held");
      return { success: true, failed: null };
    }
    try {
      const {
        data: { user },
      } = await drive.about.get({ fields: "user" });
      const driveUsername =
        user?.displayName || user?.emailAddress || "Unknown";

      const cfgPath = path.join(app.getPath("userData"), "central-config.json");
      const cfgRaw = await fs.promises.readFile(cfgPath, "utf-8");
      const { centralFolderPath } = JSON.parse(cfgRaw);
      if (!centralFolderPath) throw new Error("Central folder not set");

      const failed: Array<{ path: string; error: string }> = [];

      for (const p of paths) {
        if (exclude.includes(p)) {
          console.log(`[Drive.sync] Skipping excluded path: ${p}`);
          continue;
        }
        try {
          await traverseAndUpload(p, folderId, hooks, {
            exclude,
            provider: this.id,
            account: driveUsername,
          });

          await ensureSymlink(p, centralFolderPath);
        } catch (err: unknown) {
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code?: string }).code === "ENOENT"
          ) {
            console.warn(
              `[Drive.sync] Path "${p}" missing locally, cleaning up on Drive...`
            );
            await cleanup(p, this.buildCleanupHooks(drive));
            failed.push({
              path: p,
              error: (err as { message?: string }).message ?? "ENOENT",
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
      if (lockId) {
        try {
          await this.releaseLock(lockId);
        } catch (err) {
          console.warn("[Drive.sync] Failed to release lock:", err);
          broadcast(
            "app:toast",
            "Google Drive sync failed to release lock on cloud"
          );
        }
      }
    }
  }

  /**
   * Automatically synchronizes files and folders with Google Drive.
   * It compares local files with remote files and updates them as necessary.
   */
  async autoSync(): Promise<boolean> {
    if (!this.activeAccount) return true;
    const drive = await this.getDriveClient();
    const compareHooks = this.buildCompareHooks(drive);
    const backupFolderId = await this.ensureBackupFolder(drive);
    const { stop: stopSync, resume: resumeSync } = loadStopLists();
    const { acquired, lockId } = await this.acquireLock(
      backupFolderId,
      deviceId
    );
    if (!acquired) {
      console.log("[Drive.autoSync] Skipping auto-sync, lock already held");
      broadcast(
        "app:toast",
        "Google Drive auto-sync skipped, lock already held"
      );
      return true;
    }

    const {
      data: { user },
    } = await drive.about.get({ fields: "user" });
    const username = user?.displayName || user?.emailAddress || "Unknown";

    let anyChanged = false;
    try {
      for (const key of mappingStore.keys()) {
        const rec = mappingStore.get(key);
        if (!rec) continue;
        if (rec.provider !== this.id || rec.account !== username) continue;
        if (isStopped(key, stopSync, resumeSync)) {
          console.log(`[Drive.autoSync] Skipping stopped path: ${key}`);
          continue;
        }
        try {
          const changed = await traverseCompare(
            key,
            rec.id,
            compareHooks,
            stopSync
          );
          anyChanged ||= changed;
        } catch (err) {
          console.error("[Drive.autoSync]", key, err);
        }
      }
      return anyChanged;
    } finally {
      if (lockId) {
        try {
          await this.releaseLock(lockId);
        } catch (err) {
          console.warn("[Drive.autoSync] Failed to release lock:", err);
          broadcast(
            "app:toast",
            "Google Drive auto-sync failed to release lock on cloud"
          );
        }
      }
    }
  }

  /**
   * Pulls the latest files and folders from Google Drive.
   * It downloads the contents of the backup folder and updates the local mapping.
   */
  async pull(): Promise<boolean> {
    const drive = await this.getDriveClient();
    const rootId = await this.ensureBackupFolder(drive);
    const hooks = this.buildDownloadHooks(drive);
    const backupFolderId = await this.ensureBackupFolder(drive);

    const {
      data: { user },
    } = await drive.about.get({ fields: "user" });
    const username = user?.displayName || user?.emailAddress || "Unknown";

    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const { centralFolderPath } = JSON.parse(
      await fs.promises.readFile(cfgPath, "utf-8")
    );
    if (!centralFolderPath) throw new Error("Central folder not set");

    const { acquired, lockId } = await this.acquireLock(
      backupFolderId,
      deviceId
    );
    if (!acquired) {
      console.log("[Drive.pull] Skipping pull, lock already held");
      broadcast("app:toast", "Google Drive pull skipped, lock already held");
      return true;
    }

    try {
      await downloadTree(rootId, centralFolderPath, hooks, {
        provider: this.id,
        account: username,
      });

      const roots = pickRootPaths(username, this.id).filter(
        (p) => !p.startsWith(centralFolderPath + path.sep)
      );
      for (const p of roots) {
        try {
          await ensureSymlink(p, centralFolderPath);
        } catch (err) {
          console.warn("[ensureSymlink]", p, err);
        }
      }

      return true;
    } finally {
      if (lockId) {
        try {
          await this.releaseLock(lockId);
        } catch (err) {
          console.warn("[Drive.pull] Failed to release lock:", err);
          broadcast(
            "app:toast",
            "Google Drive pull failed to release lock on cloud"
          );
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*                       TRACKED FILES                                */
  /* ------------------------------------------------------------------ */

  /**
   * Retrieves the list of tracked files and folders in Google Drive.
   * It checks the local mapping store and returns the metadata for each tracked file.
   *
   * @returns A promise that resolves to an array of TrackedFiles objects.
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
        console.warn("[Drive.getTrackedFiles] stat failed for", key);
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
   * Deletes a tracked file or folder from Google Drive.
   * It removes the file from the remote storage and updates the local mapping.
   *
   * @param src - The source path of the file to delete.
   * @returns A promise that resolves to true if the deletion was successful.
   */
  async deleteTrackedFile(src: string): Promise<boolean> {
    const rec = mappingStore.get(src);
    if (!rec) throw new Error("File not tracked: " + src);
    const drive = await this.getDriveClient();

    try {
      await drive.files.delete({ fileId: rec.id });
    } catch (err) {
      console.warn("[Drive.deleteTrackedFile] remote delete", err);
    }

    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    const { centralFolderPath } = JSON.parse(
      await fs.promises.readFile(cfgPath, "utf-8")
    );
    const linkPath = path.join(centralFolderPath, path.basename(src));
    try {
      await fs.promises.unlink(linkPath);
    } catch {
      console.warn("[Drive.deleteTrackedFile] unlink failed, maybe not exist");
    }

    mappingStore.deleteSubtree(src);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*                            LOCKS                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Acquires a lock for the specified backup folder in Google Drive.
   * It creates a lock file with the device ID and a TTL (time-to-live).
   *
   * @param backupFolderId - The ID of the backup folder in Google Drive.
   * @param deviceId - The unique identifier of the device requesting the lock.
   * @param ttlMs - The time-to-live for the lock in milliseconds (default is 10 minutes).
   * @returns A promise that resolves to an object indicating whether the lock was acquired and its ID.
   */
  async acquireLock(
    backupFolderId: string,
    deviceId: string,
    ttlMs: number = 10 * 60 * 1e3
  ): Promise<{ acquired: boolean; lockId?: string }> {
    const drive = await this.getDriveClient();
    if (!(await this.folderExists(drive, backupFolderId))) {
      backupFolderId = await this.ensureBackupFolder(drive);
    }
    const { data } = await drive.files.list({
      q: `'${backupFolderId}' in parents and name='${LOCK_NAME}' and trashed=false`,
      fields: "files(id, createdTime, appProperties)",
      spaces: "drive",
    });

    if (data.files && data.files.length) {
      const lock = data.files[0];
      const sameDevice = lock.appProperties?.deviceId === deviceId;

      const createdTime = lock.createdTime ?? 0;
      const age = Date.now() - new Date(createdTime).getTime();
      if (age < ttlMs && !sameDevice) return { acquired: false };

      if (typeof lock.id === "string") {
        await drive.files.delete({ fileId: lock.id }).catch(() => {});
      }
    }

    const emptyStream = Readable.from([]);
    const res = await drive.files.create({
      requestBody: {
        name: LOCK_NAME,
        parents: [backupFolderId],
        mimeType: "application/octet-stream",
        appProperties: { deviceId, created: Date.now().toString() },
      },
      media: {
        mimeType: "application/octet-stream",
        body: emptyStream,
      },
      fields: "id",
    });
    return { acquired: true, lockId: res.data.id ?? undefined };
  }

  /**
   * Releases the lock by deleting the lock file in Google Drive.
   * If the lock ID is not provided, it does nothing.
   *
   * @param lockId - The ID of the lock file to delete.
   */
  async releaseLock(lockId: string): Promise<void> {
    const drive = await this.getDriveClient();
    if (lockId) {
      try {
        await drive.files.delete({ fileId: lockId });
        console.log(`[Drive.releaseLock] Deleted lock ${lockId}`);
      } catch (err: unknown) {
        const error = err as GoogleDriveError;
        const status = error.code ?? error.response?.status;
        if (status !== 404 && status !== 403) {
          console.warn("Failed to release lock:", lockId, error.message);
        } else {
          console.debug(
            `[Drive.releaseLock] Lock ${lockId} already gone (status ${status})`
          );
        }
      }
    }
  }

  /**
   * Cleans up the lock file on exit by deleting it from Google Drive.
   * This is useful to ensure that no stale locks remain after the application exits.
   *
   * @param backupFolderId - The ID of the backup folder in Google Drive.
   */
  async cleanupLockOnExit(): Promise<void> {
    const drive = await this.getDriveClient();
    const backupFolderId = await this.ensureBackupFolder(drive);
    const { data } = await drive.files.list({
      q: `'${backupFolderId}' in parents and name='${LOCK_NAME}' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });
    if (data.files && data.files.length) {
      const fileId = data.files[0].id;
      if (typeof fileId === "string") {
        try {
          await drive.files.delete({ fileId });
          console.log("[Drive.exit] Deleted lock file on Google Drive");
        } catch (err) {
          console.warn(
            "[Drive.exit] Failed to delete lock file on Google Drive:",
            err
          );
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*                         UTILITIES                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Ensures that the backup folder exists in Google Drive.
   * If it does not exist, it creates a new folder.
   *
   * @param drive - The Google Drive API client.
   * @returns A promise that resolves to the ID of the backup folder.
   */
  private async ensureBackupFolder(drive: drive_v3.Drive): Promise<string> {
    const folderName = "__ticklabfs_backup";
    const { data } = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });
    if (data.files?.length) return data.files[0].id!;
    const { data: created } = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    return created.id!;
  }

  /**
   * Checks if a folder with the given ID exists in Google Drive.
   *
   * @param drive - The Google Drive API client.
   * @param id - The ID of the folder to check.
   * @returns A promise that resolves to true if the folder exists, false otherwise.
   */
  private async folderExists(
    drive: drive_v3.Drive,
    id: string
  ): Promise<boolean> {
    try {
      await drive.files.get({ fileId: id, fields: "id" });
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      return code === 404 ? false : true;
    }
  }
}

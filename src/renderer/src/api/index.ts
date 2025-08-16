import type { AccountInfo } from "@/types/account.type";
import type { Entry, TrackedFiles } from "@/types/entry.type";
import type { Setting } from "@/types/setting.type";
import type { SyncOptions, SyncResult } from "@/types/sync.type";

declare global {
  interface Window {
    api: {
      /* ---------- Auth ---------- */
      signIn: (providerId: string) => Promise<AccountInfo>;
      listAccounts: (providerId: string) => Promise<AccountInfo[]>;
      useAccount: (providerId: string, accountId: string) => Promise<void>;
      getProfile: (providerId: string, accountId: string) => Promise<void>;
      signOut: (providerId: string, accountId: string) => Promise<void>;

      /* ---------- File system ---------- */
      selectFiles: () => Promise<Entry[]>;
      selectFolders: () => Promise<Entry[]>;
      listDirectory: (path: string) => Promise<Entry[]>;
      openInExplorer: (path: string) => Promise<void>;

      /* ---------- Settings ---------- */
      getSettings: () => Promise<Setting>;
      setSettings: (settings: Record<string, boolean>) => Promise<void>;

      /* ---------- Sync ---------- */
      syncFiles: (providerId: string, options: SyncOptions) => Promise<SyncResult>;
      pull: (providerId: string) => Promise<boolean>;
      autoSync: () => Promise<void>;

      /* ---------- Tracked files ---------- */
      trackedFile: (providerId: string) => Promise<TrackedFiles[]>;
      deleteTrackedFile: (providerId: string, src: string) => Promise<void>;

      /* ---------- Events từ main ---------- */
      onUpdateAvailable: (cb: unknown) => void;
      onUpdateDownloaded: (cb: unknown) => void;
      onTrackedFilesUpdated: (cb: unknown) => void;
    };
  }
}

/* ---------- Auth ---------- */
export const signIn = (providerId: string): Promise<AccountInfo> => window.api.signIn(providerId);
export const listAccounts = (providerId: string): Promise<AccountInfo[]> => window.api.listAccounts(providerId);
export const useAccount = (providerId: string, accountId: string): Promise<void> =>
  window.api.useAccount(providerId, accountId);
export const getProfile = (providerId: string, accountId: string): Promise<void> =>
  window.api.getProfile(providerId, accountId);
export const signOut = (providerId: string, accountId: string): Promise<void> =>
  window.api.signOut(providerId, accountId);

/* ---------- File system ---------- */
export const selectFiles = (): Promise<Entry[]> => window.api.selectFiles();
export const selectFolders = (): Promise<Entry[]> => window.api.selectFolders();
export const listDirectory = (path: string): Promise<Entry[]> => window.api.listDirectory(path);
export const openInExplorer = (path: string): Promise<void> => window.api.openInExplorer(path);

/* ---------- Settings ---------- */
export const getSettings = (): Promise<Setting> => window.api.getSettings();
export const setSettings = (settings: Record<string, boolean>): Promise<void> => window.api.setSettings(settings);

/* ---------- Sync ---------- */
export const syncFiles = (providerId: string, options: SyncOptions): Promise<SyncResult> =>
  window.api.syncFiles(providerId, options);
export const pull = (providerId: string): Promise<boolean> => window.api.pull(providerId);
export const autoSync = (): Promise<void> => window.api.autoSync();

/* ---------- Tracked files ---------- */
export const trackedFile = (providerId: string): Promise<TrackedFiles[]> => window.api.trackedFile(providerId);
export const deleteTrackedFile = (providerId: string, src: string): Promise<void> =>
  window.api.deleteTrackedFile(providerId, src);

/* ---------- Events from main ---------- */
export const onUpdateAvailable = (cb: unknown): void => window.api.onUpdateAvailable(cb);
export const onUpdateDownloaded = (cb: unknown): void => window.api.onUpdateDownloaded(cb);
export const onTrackedFilesUpdated = (cb: unknown): void => window.api.onTrackedFilesUpdated(cb);

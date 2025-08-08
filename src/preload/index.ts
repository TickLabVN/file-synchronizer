import { contextBridge, ipcRenderer } from "electron";

// Define a helper function to invoke IPC methods
const invoke = (channel: string, ...args: unknown[]): Promise<unknown> => ipcRenderer.invoke(channel, ...args);

// Expose API methods to the renderer process
contextBridge.exposeInMainWorld("api", {
  // Authentication handlers
  signIn: (providerId: string) => invoke("provider:sign-in", providerId),
  listAccounts: (providerId: string) => invoke("provider:list-accounts", providerId),
  useAccount: (providerId: string, accountId: string) => invoke("provider:use-account", providerId, accountId),
  getProfile: (providerId: string, accountId: string) => invoke("provider:get-profile", providerId, accountId),
  signOut: (providerId: string, accountId: string) => invoke("provider:sign-out", providerId, accountId),

  // File system handlers
  selectFiles: () => invoke("fs:select-files"),
  selectFolders: () => invoke("fs:select-folders"),
  listDirectory: (dirPath: string) => invoke("fs:list-directory", dirPath),
  openInExplorer: (fullPath: string) => invoke("fs:open-in-explorer", fullPath),

  // Application settings handlers
  getSettings: () => invoke("app:get-settings"),
  setSettings: (settings: Record<string, boolean>) => invoke("app:set-settings", settings),

  // Sync operations
  syncFiles: (providerId: string, options: unknown) => invoke("sync:sync-files", providerId, options),
  pull: (providerId: string) => invoke("sync:pull", providerId),
  autoSync: () => invoke("sync:auto-sync"),

  // Tracked files handlers
  trackedFile: (providerId: string) => invoke("tracked:track-file", providerId),
  deleteTrackedFile: (providerId: string, src: string) => invoke("tracked:delete-file", providerId, src),

  // Event listeners
  onUpdateAvailable: (cb: (info: unknown) => void) => ipcRenderer.on("app:update-available", (_e, info) => cb(info)),
  onUpdateDownloaded: (cb: (info: unknown) => void) => ipcRenderer.on("app:update-downloaded", (_e, info) => cb(info)),
  onTrackedFilesUpdated: (cb: (data: unknown) => void) =>
    ipcRenderer.on("app:tracked-files-updated", (_e, data) => cb(data)),
});

// Expose Node.js versions
contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

// Expose window control methods
contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => invoke("window-isMaximized"),
});

// Expose IPC renderer methods for use in the preload script
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) =>
      ipcRenderer.on(channel, listener),
    removeListener: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) =>
      ipcRenderer.removeListener(channel, listener),
  },
});

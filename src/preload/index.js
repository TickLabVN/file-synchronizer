import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    // Google Drive authentication functions
    signIn: () => ipcRenderer.invoke("google-drive:sign-in"),
    listAccounts: () => ipcRenderer.invoke("google-drive:list-accounts"),
    useAccount: (email) =>
        ipcRenderer.invoke("google-drive:use-account", email),
    getProfile: (email) =>
        ipcRenderer.invoke("google-drive:get-profile", email),
    signOut: (email) => ipcRenderer.invoke("google-drive:sign-out", email),
    // Box authentication functions
    boxSignIn: () => ipcRenderer.invoke("box:sign-in"),
    listBoxAccounts: () => ipcRenderer.invoke("box:list-accounts"),
    useBoxAccount: (login) => ipcRenderer.invoke("box:use-account", login),
    getBoxProfile: (login) => ipcRenderer.invoke("box:get-profile", login),
    boxSignOut: (login) => ipcRenderer.invoke("box:sign-out", login),

    // File and folder selection functions
    selectFiles: () => ipcRenderer.invoke("app:select-files"),
    selectFolders: () => ipcRenderer.invoke("app:select-folders"),
    selectStopSyncFiles: () => ipcRenderer.invoke("app:select-stop-sync-files"),
    listDirectory: (path) => ipcRenderer.invoke("app:list-directory", path),
    openInExplorer: (path) => ipcRenderer.invoke("app:open-in-explorer", path),

    // Settings functions
    getSettings: () => ipcRenderer.invoke("app:get-settings"),
    updateSettings: (settings) =>
        ipcRenderer.invoke("app:update-settings", settings),

    // Sync related functions
    syncFiles: (paths) => ipcRenderer.invoke("app:sync-files", paths),
    syncOnLaunch: () => ipcRenderer.invoke("app:sync-on-launch"),
    pullFromDrive: () => ipcRenderer.invoke("app:pull-from-drive"),
    syncBoxFiles: (paths) => ipcRenderer.invoke("app:sync-box-files", paths),
    syncBoxOnLaunch: () => ipcRenderer.invoke("app:sync-box-on-launch"),
    pullFromBox: () => ipcRenderer.invoke("app:pull-from-box"),

    // Update related functions
    onUpdateAvailable: (cb) =>
        ipcRenderer.on("app:update-available", (_e, info) => cb(info)),
    onUpdateDownloaded: (cb) =>
        ipcRenderer.on("app:update-downloaded", (_e, info) => cb(info)),

    // Tracked files and folders functions
    getTrackedFiles: () => ipcRenderer.invoke("app:get-tracked-files"),
    onTrackedFilesUpdated: (cb) =>
        ipcRenderer.on("app:tracked-files-updated", (_e, data) => cb(data)),
    deleteTrackedFile: (file) =>
        ipcRenderer.invoke("app:delete-tracked-file", file),
    getTrackedFilesBox: () => ipcRenderer.invoke("app:get-tracked-files-box"),
    deleteTrackedFileBox: (file) =>
        ipcRenderer.invoke("app:delete-tracked-file-box", file),
});

contextBridge.exposeInMainWorld("versions", {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld("windowControls", {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
    isMaximized: () => ipcRenderer.invoke("window-isMaximized"),
});

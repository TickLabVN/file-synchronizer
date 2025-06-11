import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    // Google Drive related functions
    signIn: () => ipcRenderer.invoke("google-drive:sign-in"),
    getTokens: () => ipcRenderer.invoke("google-drive:get-tokens"),
    getGDUserName: () => ipcRenderer.invoke("google-drive:get-username"),
    signOut: () => ipcRenderer.invoke("app:sign-out"),

    // Central folder management functions
    selectCentralFolder: () => ipcRenderer.invoke("app:select-central-folder"),
    getCentralFolderConfig: () => ipcRenderer.invoke("app:get-central-folder"),
    saveCentralFolderConfig: (path) =>
        ipcRenderer.invoke("app:save-central-folder", path),

    // File and folder selection functions
    selectFiles: () => ipcRenderer.invoke("app:select-files"),
    selectFolders: () => ipcRenderer.invoke("app:select-folders"),
    selectStopSyncFiles: () => ipcRenderer.invoke("app:select-stop-sync-files"),

    // Settings functions
    getSettings: () => ipcRenderer.invoke("app:get-settings"),
    updateSettings: (settings) =>
        ipcRenderer.invoke("app:update-settings", settings),

    // Sync related functions
    syncFiles: (paths) => ipcRenderer.invoke("app:sync-files", paths),
    syncOnLaunch: () => ipcRenderer.invoke("app:sync-on-launch"),
    pullFromDrive: () => ipcRenderer.invoke("app:pull-from-drive"),
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

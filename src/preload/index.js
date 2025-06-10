import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    signIn: () => ipcRenderer.invoke("google-drive:sign-in"),
    getTokens: () => ipcRenderer.invoke("google-drive:get-tokens"),
    getGDUserName: () => ipcRenderer.invoke("google-drive:get-username"),
    selectCentralFolder: () => ipcRenderer.invoke("app:select-central-folder"),
    getCentralFolderConfig: () => ipcRenderer.invoke("app:get-central-folder"),
    saveCentralFolderConfig: (path) =>
        ipcRenderer.invoke("app:save-central-folder", path),
    signOut: () => ipcRenderer.invoke("app:sign-out"),
    selectFiles: () => ipcRenderer.invoke("app:select-files"),
    selectFolders: () => ipcRenderer.invoke("app:select-folders"),
    syncFiles: (paths) => ipcRenderer.invoke("app:sync-files", paths),
    syncOnLaunch: () => ipcRenderer.invoke("app:sync-on-launch"),
    getSettings: () => ipcRenderer.invoke("app:get-settings"),
    updateSettings: (settings) =>
        ipcRenderer.invoke("app:update-settings", settings),
});

contextBridge.exposeInMainWorld("versions", {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
});

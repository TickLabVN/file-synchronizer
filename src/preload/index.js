import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    signIn: () => ipcRenderer.invoke("google-drive:sign-in"),
    getTokens: () => ipcRenderer.invoke("google-drive:get-tokens"),
    getGDUserName: () => ipcRenderer.invoke("google-drive:get-username"),
    selectCentralFolder: () => ipcRenderer.invoke("app:select-central-folder"),
    getCentralFolderConfig: () => ipcRenderer.invoke("app:get-central-folder"),
    saveCentralFolderConfig: (path) =>
        ipcRenderer.invoke("app:save-central-folder", path),
});

contextBridge.exposeInMainWorld("versions", {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
});

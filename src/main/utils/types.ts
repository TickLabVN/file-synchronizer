import * as fs from "fs";

export interface RemoteMeta {
    id: string; // remote ID of the file/folder
    parentId: string; // ID of the parent folder in the remote storage
    isDirectory: boolean; // true if it's a folder, false if it's a file
    lastSync: string; // ISO date string of the last sync time
    provider: string; // name of the remote storage provider, e.g., "Google Drive"
    account: string; // account identifier for the remote storage, e.g., "John Doe"
}

export interface UploadHooks {
    uploadFolder(
        name: string,
        parentId: string,
        localPath: string
    ): Promise<string>;
    uploadFile(localPath: string, parentId: string): Promise<string>;
    updateFile(remoteId: string, localPath: string): Promise<void>;
    setMetadata(remoteId: string, meta: Record<string, string>): Promise<void>;
}

export interface DownloadHooks {
    listChildren(
        parentId: string
    ): Promise<
        Array<{ id: string; name: string; isFolder: boolean; meta?: unknown }>
    >;
    readFile(remoteId: string, dest: fs.WriteStream): Promise<void>;
}

export interface CompareHooks {
    getRemoteMTime(remoteId: string): Promise<Date>;
    deleteRemote(remoteId: string, isDir: boolean): Promise<void>;
    newVersion(remoteId: string, localPath: string): Promise<void>;
}

export interface CleanupHooks {
    deleteRemote(remoteId: string, isDir: boolean): Promise<void>;
}

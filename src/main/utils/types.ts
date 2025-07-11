import * as fs from "fs";

/**
 * RemoteMeta represents metadata for a file or folder in remote storage.
 * It includes the remote ID, parent folder ID, type (file/folder), last sync time,
 * provider name, and account identifier.
 */
export interface RemoteMeta {
    id: string; // remote ID of the file/folder
    parentId: string; // ID of the parent folder in the remote storage
    isDirectory: boolean; // true if it's a folder, false if it's a file
    lastSync: string; // ISO date string of the last sync time
    provider: string; // name of the remote storage provider, e.g., "Google Drive"
    account: string; // account identifier for the remote storage, e.g., "John Doe"
}

/**
 * UploadHooks defines the methods required for uploading files and folders to remote storage.
 * It includes methods for uploading folders, files, updating files, and setting metadata.
 */
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

/**
 * DownloadHooks defines the methods required for downloading files and folders from remote storage.
 * It includes methods for listing children of a folder and reading a file into a writable stream.
 */
export interface DownloadHooks {
    listChildren(
        parentId: string
    ): Promise<
        Array<{ id: string; name: string; isFolder: boolean; meta?: unknown }>
    >;
    readFile(remoteId: string, dest: fs.WriteStream): Promise<void>;
}

/**
 * CompareHooks defines the methods required for comparing local and remote files.
 * It includes methods for getting the remote modification time, deleting a remote file,
 * and handling new versions of files.
 */
export interface CompareHooks {
    getRemoteMTime(remoteId: string): Promise<Date>;
    deleteRemote(remoteId: string, isDir: boolean): Promise<void>;
    newVersion(remoteId: string, localPath: string): Promise<void>;
}

/**
 * CleanupHooks defines the methods required for cleaning up remote files and folders.
 * It includes a method for deleting a remote file or folder.
 */
export interface CleanupHooks {
    deleteRemote(remoteId: string, isDir: boolean): Promise<void>;
}

export interface AuthAccount {
    id: string; // Unique identifier for the account, e.g. 'google-12345'
    displayName?: string; // Display name of the account, e.g. 'John Doe'
    tokens: unknown; // Authentication tokens, can be any type depending on the provider
}

export interface SyncOptions {
    paths: string[]; // Paths to sync, e.g., ['/path/to/folder1', '/path/to/folder2']
    exclude?: string[]; // Paths to exclude from sync, e.g., ['/path/to/folder1/exclude']
}

export interface SyncResult {
    success: boolean; // Indicates if the sync was successful
    failed?: {
        path: string; // Path that failed to sync
        error: string; // Error message describing the failure
    } | null; // If no failures, this will be null
    message?: string; // Optional message providing additional information about the sync
}

export interface TrackedFiles {
    [key: string]: {
        id?: string; // Unique identifier for the tracked file or folder
        isDirectory?: boolean; // Indicates if the tracked item is a directory
        lastSync?: number; // Timestamp of the last sync operation
        size?: number | null; // Size of the file or directory, null if unknown
        provider?: string; // Cloud provider identifier, e.g., 'google', 'box'
        username?: string; // Username associated with the account, if applicable
        src?: string; // Local path to the tracked file or folder
    };
}

export interface ICloudProvider {
    readonly id: string; // 'google', 'box', 'dropbox'...
    readonly displayName: string; // 'Google Drive', 'Box', 'Dropbox'
    signIn(): Promise<AuthAccount>;
    listAccounts(): Promise<AuthAccount[]>;
    useAccount(id: string): Promise<boolean>;
    signOut(id: string): Promise<boolean>;
    getProfile(id: string): Promise<AuthAccount>;

    sync(options: SyncOptions): Promise<SyncResult>;
    autoSync(): Promise<boolean>;
    pull(): Promise<boolean>;

    getTrackedFiles(): Promise<TrackedFiles[]>;
    deleteTrackedFile(src: string): Promise<boolean>;

    acquireLock(
        backupFolderId: string,
        deviceId: string,
        ttlMs?: number
    ): Promise<{ acquired: boolean; lockId?: string }>;
    releaseLock(lockId: string): Promise<void>;
    cleanupLockOnExit(backupFolderId: string): Promise<void>;
}

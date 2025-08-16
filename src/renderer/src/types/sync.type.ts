export interface SyncResult {
  success: boolean; // Indicates if the sync was successful
  failed?: {
    path: string; // Path that failed to sync
    error: string; // Error message describing the failure
  } | null; // If no failures, this will be null
  message?: string; // Optional message providing additional information about the sync
}

export interface SyncOptions {
  paths: string[]; // Paths to sync, e.g., ['/path/to/folder1', '/path/to/folder2']
  exclude?: string[]; // Paths to exclude from sync, e.g., ['/path/to/folder1/exclude']
}

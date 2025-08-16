export interface Entry {
  path: string; // Full path to the file or directory
  size: number; // Size in bytes, null for directories
  isDirectory: boolean; // True if it's a directory, false if it's a file
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

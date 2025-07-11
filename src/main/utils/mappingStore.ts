import { RemoteMeta } from "./types";

/**
 * MappingStore is a utility class that manages the mapping of local paths to their remote metadata.
 * It provides methods to get, set, delete, and manage metadata for files and directories.
 */
class MappingStore {
    private data = new Map<string, RemoteMeta>();

    /**
     * Retrieves the metadata for a given path.
     * @param path - The local path to retrieve metadata for.
     * @return The RemoteMeta object if found, otherwise undefined.
     */
    get(path: string): RemoteMeta | undefined {
        return this.data.get(path);
    }

    /**
     * Sets the metadata for a given path.
     * @param path - The local path to set metadata for.
     * @param meta - The RemoteMeta object containing metadata to set.
     */
    set(path: string, meta: RemoteMeta): void {
        this.data.set(path, meta);
    }

    /**
     * Deletes the metadata for a given path.
     * @param path - The local path to delete metadata for
     */
    delete(path: string): void {
        this.data.delete(path);
    }

    /**
     * Deletes all metadata entries that start with the given root path.
     * This is useful for cleaning up entries related to a specific directory.
     * @param root - The root path to delete all related metadata entries.
     */
    deleteSubtree(root: string): void {
        for (const k of this.keys())
            if (k === root || k.startsWith(root + "/")) this.data.delete(k);
    }

    /**
     * Retrieves all keys (local paths) stored in the mapping.
     * @return An array of strings representing all local paths.
     */
    keys(): string[] {
        return [...this.data.keys()];
    }

    /**
     * Updates the last sync time for a given path to the current time.
     * This is useful for marking when a file or directory was last synchronized.
     * @param path - The local path to update the last sync time for.
     */
    touch(path: string): void {
        const m = this.get(path);
        if (m) m.lastSync = new Date().toISOString();
    }
}

export const mappingStore = new MappingStore();

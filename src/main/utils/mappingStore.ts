import { RemoteMeta } from "./types";
import { store } from "../lib/constants";
import { broadcast } from "../windows/WindowManager";
import path from "path";

/**
 * MappingStore is a utility class that manages the mapping of local paths to their remote metadata.
 * It provides methods to get, set, delete, and manage metadata for files and directories.
 */
class MappingStore {
  private data = new Map<string, RemoteMeta>();

  /**
   * Initializes the MappingStore by loading persisted mappings from the store.
   * It reads the mappings from the store and populates the internal Map.
   */
  constructor() {
    const persisted = store.get("mappings", {}) as Record<string, RemoteMeta>;
    this.data = new Map(Object.entries(persisted));
  }

  /**
   * Persists the current mappings to the store.
   * This method should be called whenever the mappings are modified
   * to ensure that changes are saved.
   */
  private flush(): void {
    store.set("mappings", Object.fromEntries(this.data));
  }

  /**
   * Removes all metadata entries that are descendants of the specified root path.
   * This is useful for cleaning up entries related to a specific directory.
   * It also updates the stop and resume sync paths in the settings.
   * @param root - The root path to remove all related metadata entries.
   */
  private removeFromStopLists(root: string): void {
    const settings = store.get("settings", {}) as {
      stopSyncPaths?: string[];
      resumeSyncPaths?: string[];
      [k: string]: unknown;
    };

    const stop = settings.stopSyncPaths ?? [];
    const resume = settings.resumeSyncPaths ?? [];

    const isDescendant = (p: string): boolean =>
      p === root || p.startsWith(root + "/") || p.startsWith(root + "\\") || p.startsWith(root + path.sep);

    const nextStop = stop.filter((p) => !isDescendant(p));
    const nextResume = resume.filter((p) => !isDescendant(p));

    if (nextStop.length !== stop.length || nextResume.length !== resume.length) {
      store.set("settings", {
        ...settings,
        stopSyncPaths: nextStop,
        resumeSyncPaths: nextResume,
      });
      broadcast("app:settings-updated");
    }
  }

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
    this.flush();
  }

  /**
   * Deletes the metadata for a given path.
   * @param path - The local path to delete metadata for
   */
  delete(path: string): void {
    this.data.delete(path);
    this.removeFromStopLists(path);
    this.flush();
  }

  /**
   * Deletes all metadata entries that start with the given root path.
   * This is useful for cleaning up entries related to a specific directory.
   * @param root - The root path to delete all related metadata entries.
   */
  deleteSubtree(root: string): void {
    const rootN = path.normalize(root);
    for (const k of this.keys()) {
      const kN = path.normalize(k);
      if (kN === rootN || kN.startsWith(rootN + path.sep)) {
        this.data.delete(k);
      }
    }
    this.removeFromStopLists(root);
    this.flush();
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
    this.flush();
  }
}

export const mappingStore = new MappingStore();

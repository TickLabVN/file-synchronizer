import path from "path";
import { CleanupHooks } from "./types";
import { mappingStore } from "./mappingStore";

/**
 * Cleans up remote files and folders based on the local mapping.
 * Deletes all remote entries that match the given source path or are subdirectories of it.
 *
 * @param srcPath - The source path to clean up in the remote storage.
 * @param hooks - The cleanup hooks to perform remote deletions.
 */
export default async function cleanup(srcPath: string, hooks: CleanupHooks): Promise<void> {
  for (const p of mappingStore.keys().filter((k) => k === srcPath || k.startsWith(srcPath + path.sep))) {
    const rec = mappingStore.get(p);
    if (rec) {
      await hooks.deleteRemote(rec.id, rec.isDirectory);
      mappingStore.delete(p);
    }
  }
}

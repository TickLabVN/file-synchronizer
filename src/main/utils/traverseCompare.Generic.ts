import path from "path";
import fs from "fs";
import { CompareHooks } from "./types";
import { mappingStore } from "./mappingStore";

/**
 * Recursively compares local files and folders with their remote counterparts.
 * If a local file is newer than the remote version, it uploads the new version.
 * If a file or folder is missing locally, it deletes the remote counterpart.
 *
 * @param srcPath - The local path to start the comparison from.
 * @param remoteId - The ID of the remote file/folder to compare against.
 * @param hooks - The CompareHooks implementation for remote operations.
 * @param stopSyncPaths - Paths where synchronization should be stopped.
 * @returns A promise that resolves to true if any changes were made, false otherwise.
 */
export default async function traverseCompare(
  srcPath: string,
  remoteId: string,
  hooks: CompareHooks,
  stopSyncPaths: string[] = []
): Promise<boolean> {
  if (stopSyncPaths.includes(srcPath)) return false;

  let changed = false;
  try {
    const stats = await fs.promises.stat(srcPath);

    if (stats.isDirectory()) {
      for (const entry of await fs.promises.readdir(srcPath)) {
        const child = path.join(srcPath, entry);
        const rec = mappingStore.get(child);
        if (rec) changed ||= await traverseCompare(child, rec.id, hooks, stopSyncPaths);
      }
    } else {
      const remoteTime = await hooks.getRemoteMTime(remoteId);
      if (stats.mtime > remoteTime) {
        await hooks.newVersion(remoteId, srcPath);
        changed = true;
        console.log(`[Compare] Updated: ${srcPath}`);
      }
    }
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "ENOENT") {
      await hooks.deleteRemote(remoteId, mappingStore.get(srcPath)?.isDirectory ?? false);
      mappingStore.deleteSubtree(srcPath);
      return true;
    }
    throw err;
  }

  if (changed) mappingStore.touch(srcPath);
  return changed;
}

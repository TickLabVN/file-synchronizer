import path from "path";
import fs from "fs";
import { RemoteMeta, UploadHooks } from "./types";
import { mappingStore } from "./mappingStore";

/**
 * Recursively traverses a local directory and uploads files and folders to a remote storage.
 * @param srcPath - The local path to the directory to upload.
 * @param parentId - The ID of the parent folder in the remote storage.
 * @param hooks - The upload hooks for interacting with the remote storage.
 * @param options - Additional options like exclude patterns, provider, and account.
 */
export default async function traverseAndUpload(
  srcPath: string,
  parentId: string,
  hooks: UploadHooks,
  { exclude = [], provider, account }: { exclude?: string[]; provider: string; account: string }
): Promise<void> {
  if (exclude.includes(srcPath)) return;

  const stats: fs.Stats = await fs.promises.stat(srcPath);
  const isDir: boolean = stats.isDirectory();
  const record: RemoteMeta | undefined = mappingStore.get(srcPath);

  // Folder handling
  if (isDir) {
    let folderId: string | null = record && record.parentId === parentId ? record.id : null;

    if (!folderId) {
      folderId = await hooks.uploadFolder(path.basename(srcPath), parentId, srcPath);
      mappingStore.set(srcPath, {
        id: folderId,
        parentId,
        isDirectory: true,
        provider,
        account,
        lastSync: new Date().toISOString(),
      });
    }

    for (const entry of await fs.promises.readdir(srcPath))
      await traverseAndUpload(path.join(srcPath, entry), folderId, hooks, { exclude, provider, account });
    return;
  }

  // File handling
  if (record && record.parentId === parentId) {
    await hooks.updateFile(record.id, srcPath);
  } else {
    const fileId = await hooks.uploadFile(srcPath, parentId);
    mappingStore.set(srcPath, {
      id: fileId,
      parentId,
      isDirectory: false,
      provider,
      account,
      lastSync: new Date().toISOString(),
    });
  }
}

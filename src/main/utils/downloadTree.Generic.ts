import fs from "fs";
import path from "path";
import { RemoteMeta, DownloadHooks } from "./types";
import { mappingStore } from "./mappingStore";

/**
 * Recursively downloads files and folders from a remote storage to a local directory.
 * @param parentId - The ID of the parent folder in the remote storage.
 * @param localDir - The local directory to download files into.
 * @param hooks - The download hooks for interacting with the remote storage.
 * @param options - Additional options like provider and account.
 * @param entries - Array to collect downloaded entries.
 * @returns A promise that resolves to an array of RemoteMeta objects for downloaded entries.
 */
export default async function downloadTree(
    parentId: string,
    localDir: string,
    hooks: DownloadHooks,
    { provider, account }: { provider: string; account: string },
    entries: RemoteMeta[] = []
): Promise<RemoteMeta[]> {
    await fs.promises.mkdir(localDir, { recursive: true });

    const children: Array<{
        id: string;
        name: string;
        isFolder: boolean;
        meta?: unknown;
    }> = await hooks.listChildren(parentId);

    for (const child of children) {
        const meta = (child.meta ?? {}) as {
            originalPath?: string;
            os?: string;
            [k: string]: unknown;
        };

        const isSameOS: boolean = meta.os === process.platform;

        const destPath: string =
            meta.originalPath && isSameOS
                ? meta.originalPath
                : path.join(localDir, child.name);

        const isDirectory: boolean = child.isFolder;

        const entry: RemoteMeta = {
            id: child.id,
            parentId,
            isDirectory,
            provider,
            account,
            lastSync: new Date().toISOString(),
        };

        if (isSameOS) mappingStore.set(destPath, entry);

        entries.push(entry);

        if (isDirectory) {
            await downloadTree(
                child.id,
                destPath,
                hooks,
                { provider, account },
                entries
            );
            continue;
        }

        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

        if (!isSameOS) {
            try {
                await fs.promises.access(destPath, fs.constants.F_OK);
                continue;
            } catch {
                console.error(`File ${destPath} already exists on a different OS. Please remove it manually.
                    Original path: ${meta.originalPath}, OS: ${meta.os}`);
            }
        }

        const ws: fs.WriteStream = fs.createWriteStream(destPath);
        await hooks.readFile(child.id, ws);
    }

    return entries;
}

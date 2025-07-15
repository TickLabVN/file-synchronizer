import fs from "fs";
import path from "path";

/**
 * Ensures that a symlink to the source path exists in the central directory.
 * If the symlink already exists, it will be updated to point to the new source.
 *
 * @param src - The source path to link to.
 * @param centralDir - The directory where the symlink should be created.
 */
export default async function ensureSymlink(
    src: string,
    centralDir: string
): Promise<void> {
    const linkPath = path.join(centralDir, path.basename(src));
    try {
        await fs.promises.unlink(linkPath);
    } catch {
        console.warn("[ensureSymlink] unlink failed, maybe not exist");
    }

    const stats = await fs.promises.stat(src);
    const type = stats.isDirectory() ? "junction" : "file";
    try {
        await fs.promises.symlink(src, linkPath, type);
    } catch (err: unknown) {
        if (
            process.platform === "win32" &&
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code?: string }).code === "EPERM"
        ) {
            if (stats.isDirectory()) {
                await fs.promises.cp(src, linkPath, { recursive: true });
            } else {
                try {
                    await fs.promises.link(src, linkPath);
                } catch {
                    await fs.promises.copyFile(src, linkPath);
                }
            }
        } else {
            throw err;
        }
    }
}

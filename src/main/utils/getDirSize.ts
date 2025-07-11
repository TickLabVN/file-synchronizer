import fs from "fs";
import path from "path";

/**
 * Recursively calculates the size of a directory.
 *
 * @param {string} dir - The path to the directory.
 * @returns {Promise<number>} The total size of the directory in bytes.
 */
export default async function getDirSize(dir: string): Promise<number> {
    const entries: fs.Dirent[] = await fs.promises.readdir(dir, {
        withFileTypes: true,
    });
    let total: number = 0;
    for (const e of entries) {
        const full: string = path.join(dir, e.name);
        if (e.isDirectory()) {
            total += await getDirSize(full);
        } else {
            total += (await fs.promises.stat(full)).size;
        }
    }
    return total;
}

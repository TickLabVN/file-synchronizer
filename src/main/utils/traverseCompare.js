import path from "path";
import fs from "fs";
import "dotenv/config";
import { constants } from "../lib/constants";
const { mapping } = constants;

// * Traverse a directory structure and compare local files with Google Drive.
/**
 * Traverse a directory structure and compare local files with Google Drive.
 * If a file is newer locally, it updates the file on Google Drive.
 * If a file or folder is missing locally, it deletes the corresponding entry on Google Drive.
 *
 * @param {string} srcPath - The local path to the source directory or file.
 * @param {string} fileId - The ID of the file or folder in Google Drive.
 * @param {object} drive - The authenticated Google Drive API client.
 */
export default async function traverseCompare(srcPath, fileId, drive) {
    try {
        const stats = await fs.promises.stat(srcPath);
        if (stats.isDirectory()) {
            const entries = await fs.promises.readdir(srcPath);
            for (const entry of entries) {
                const childPath = path.join(srcPath, entry);
                const rec = mapping[childPath];
                if (rec) {
                    await traverseCompare(childPath, rec.id, drive);
                }
            }
        } else {
            const meta = await drive.files.get({
                fileId,
                fields: "modifiedTime",
            });
            const remoteTime = new Date(meta.data.modifiedTime);
            const localTime = stats.mtime;
            if (localTime > remoteTime) {
                await drive.files.update({
                    fileId,
                    media: { body: fs.createReadStream(srcPath) },
                });
            }
        }
    } catch (err) {
        if (err.code === "ENOENT") {
            try {
                await drive.files.delete({ fileId });
            } catch (driveErr) {
                console.error("Failed to delete on Drive:", driveErr);
            }
            delete mapping[srcPath];
            console.log(
                `Deleted ${srcPath} locally : removed on Drive (ID=${fileId})`
            );
            return;
        } else {
            throw err;
        }
    }
}

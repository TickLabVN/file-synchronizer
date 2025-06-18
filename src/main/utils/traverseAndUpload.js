import path from "path";
import fs from "fs";
import "dotenv/config";
import { constants } from "../lib/constants";
const { mapping } = constants;

// * Traverse a directory structure and upload files to Google Drive
/**
 * Traverse a directory structure and upload files to Google Drive.
 * If a file or folder already exists, it updates the existing one.
 *
 * @param {string} srcPath - The local path to the source directory or file.
 * @param {string} parentId - The ID of the parent folder in Google Drive.
 * @param {object} drive - The authenticated Google Drive API client.
 */
export default async function traverseAndUpload(srcPath, parentId, drive) {
    const stats = await fs.promises.stat(srcPath);
    const key = srcPath;
    const record = mapping[key];

    if (stats.isDirectory()) {
        const existingFolder = record && record.parentId === parentId;
        let folderId = existingFolder ? record.id : null;
        if (!folderId) {
            const folderRes = await drive.files.create({
                requestBody: {
                    name: path.basename(srcPath),
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [parentId],
                    appProperties: {
                        originalPath: srcPath,
                        os: process.platform,
                    },
                },
                fields: "id",
            });
            folderId = folderRes.data.id;
            mapping[key] = {
                id: folderId,
                parentId,
                lastSync: new Date().toISOString(),
            };
        }
        const entries = await fs.promises.readdir(srcPath);
        for (const entry of entries) {
            await traverseAndUpload(path.join(srcPath, entry), folderId, drive);
        }
    } else {
        const isSameParent = record && record.parentId === parentId;
        if (isSameParent) {
            await drive.files.update({
                fileId: record.id,
                media: { body: fs.createReadStream(srcPath) },
                requestBody: {
                    appProperties: {
                        originalPath: srcPath,
                        os: process.platform,
                    },
                },
            });
        } else {
            const fileRes = await drive.files.create({
                requestBody: {
                    name: path.basename(srcPath),
                    parents: [parentId],
                    appProperties: {
                        originalPath: srcPath,
                        os: process.platform,
                    },
                },
                media: { body: fs.createReadStream(srcPath) },
            });
            mapping[key] = {
                id: fileRes.data.id,
                parentId,
                lastSync: new Date().toISOString(),
            };
        }
    }
}

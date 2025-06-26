import path from "path";
import fs from "fs";
import "dotenv/config";
import { constants } from "../lib/constants";
const { boxMapping } = constants;

export async function traverseAndUploadBox(
    srcPath,
    parentId,
    client,
    exclude = []
) {
    // Skip excluded paths
    if (exclude.includes(srcPath)) {
        console.log(`Skipping excluded path: ${srcPath}`);
        return;
    }
    const stats = await fs.promises.stat(srcPath);
    const key = srcPath;
    const rec = boxMapping[key];

    if (stats.isDirectory()) {
        // ---------------- FOLDER ----------------
        let folderId = rec && rec.parentId === parentId ? rec.id : null;
        if (!folderId) {
            const folder = await client.folders.create(
                parentId,
                path.basename(srcPath)
            );
            folderId = folder.id;

            // Attach metadata (originalPath & OS)
            try {
                await client.folders.addMetadata(
                    folderId,
                    "global",
                    "properties",
                    { originalPath: srcPath, os: process.platform }
                );
            } catch (err) {
                // 409 = metadata already exists – safe to ignore
                if (err.statusCode !== 409)
                    console.warn("Metadata folder", err);
            }

            boxMapping[key] = {
                id: folderId,
                parentId,
                isFolder: true,
                lastSync: new Date().toISOString(),
            };
        }
        const entries = await fs.promises.readdir(srcPath);
        for (const e of entries) {
            await traverseAndUploadBox(
                path.join(srcPath, e),
                folderId,
                client,
                exclude
            );
        }
    } else {
        // ---------------- FILE ----------------
        if (rec && rec.parentId === parentId) {
            // New version
            await client.files.uploadNewFileVersion(
                rec.id,
                fs.createReadStream(srcPath)
            );
        } else {
            // Fresh upload
            const uploadRes = await client.files.uploadFile(
                parentId,
                path.basename(srcPath),
                fs.createReadStream(srcPath)
            );
            const uploaded = Array.isArray(uploadRes.entries)
                ? uploadRes.entries[0]
                : uploadRes;

            // Attach metadata
            try {
                await client.files.addMetadata(
                    uploaded.id,
                    "global",
                    "properties",
                    { originalPath: srcPath, os: process.platform }
                );
            } catch (err) {
                if (err.statusCode !== 409) console.warn("Metadata file", err);
            }

            boxMapping[key] = {
                id: uploaded.id,
                parentId,
                isFolder: false,
                lastSync: new Date().toISOString(),
            };
        }
    }
}

import path from "path";
import fs from "fs";
import "dotenv/config";
import { constants } from "../lib/constants";
// Define the type for boxMapping entries
type BoxMappingEntry = {
    id: string;
    parentId: string;
    isDirectory: boolean;
    lastSync: string;
    provider?: string | null;
    username?: string | null;
};

// Define the BoxClient interface based on the methods used in this file
interface BoxClient {
    folders: {
        create(parentId: string, name: string): Promise<{ id: string }>;
        addMetadata(
            folderId: string,
            scope: string,
            template: string,
            data: object
        ): Promise<void>;
    };
    files: {
        uploadNewFileVersion(
            fileId: string,
            stream: fs.ReadStream
        ): Promise<void>;
        uploadFile(
            parentId: string,
            name: string,
            stream: fs.ReadStream
        ): Promise<{ id: string } | { entries: { id: string }[] }>;
        client: BoxClient;
        addMetadata(
            fileId: string,
            scope: string,
            template: string,
            data: object
        ): Promise<void>;
    };
}

// Assert boxMapping as a Record<string, BoxMappingEntry>
const { boxMapping } = constants as {
    boxMapping: Record<string, BoxMappingEntry>;
};

interface HasStatusCode {
    statusCode: number;
}

function hasStatusCode(e: unknown): e is HasStatusCode {
    return (
        typeof e === "object" &&
        e !== null &&
        "statusCode" in e &&
        typeof (e as HasStatusCode).statusCode === "number"
    );
}
export async function traverseAndUploadBox(
    srcPath: string,
    parentId: string,
    client: BoxClient,
    exclude: string[] = [],
    provider: string | null = null,
    username: string | null = null
): Promise<void> {
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
        let folderId: string;
        if (rec && rec.parentId === parentId) {
            folderId = rec.id;
        } else {
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
                if (hasStatusCode(err) && err.statusCode !== 409) {
                    console.warn("Metadata folder", err);
                } else {
                    throw err; // đừng nuốt lỗi khác
                }
            }

            boxMapping[key] = {
                id: folderId,
                parentId,
                isDirectory: true,
                lastSync: new Date().toISOString(),
                provider,
                username,
            };
        }
        const entries = await fs.promises.readdir(srcPath);
        for (const e of entries) {
            await traverseAndUploadBox(
                path.join(srcPath, e),
                folderId,
                client,
                exclude,
                provider,
                username
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
            const uploaded =
                (uploadRes as { entries?: { id: string }[] }).entries &&
                Array.isArray(
                    (uploadRes as { entries?: { id: string }[] }).entries
                )
                    ? (uploadRes as { entries: { id: string }[] }).entries[0]
                    : (uploadRes as { id: string });

            // Attach metadata
            try {
                await client.files.addMetadata(
                    uploaded.id,
                    "global",
                    "properties",
                    { originalPath: srcPath, os: process.platform }
                );
            } catch (err) {
                if (hasStatusCode(err) && err.statusCode !== 409) {
                    console.warn("Metadata folder", err);
                } else {
                    throw err; // đừng nuốt lỗi khác
                }
            }

            boxMapping[key] = {
                id: uploaded.id,
                parentId,
                isDirectory: false,
                lastSync: new Date().toISOString(),
                provider,
                username,
            };
        }
    }
}

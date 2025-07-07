// utils/downloadTreeBox.js
import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
interface BoxMappingValue {
    id: string;
    parentId: string;
    isFolder: boolean;
    lastSync: string;
    provider: string;
    username: string;
}

const { boxMapping } = constants as {
    boxMapping: Record<string, BoxMappingValue>;
};

/**
 * Tải toàn bộ cây thư mục trên Box về máy cục bộ.
 * • Nếu item có metadata `originalPath` và cùng OS → dùng lại path gốc
 *   (để chúng ta có thể tạo symlink vào central-folder sau đó).
 * • Nếu khác OS hoặc không có metadata → tải thẳng về dưới `localDir`.
 *
 * @param {string} parentId       ID thư mục gốc trên Box
 * @param {string} localDir       Thư mục cục bộ (thường là centralFolderPath)
 * @param {import("box-node-sdk").BoxClient} client  Box SDK client
 * @param {Array<object>} [entries]  Mảng dùng đệ quy để trả về danh sách đã tải
 * @returns {Promise<Array<object>>} Danh sách tất cả item đã xử lý
 */
interface DownloadEntry {
    path: string;
    id: string;
    parentId: string;
    origOS: string | undefined;
    provider: string;
    username: string;
}

export default async function downloadTreeBox(
    parentId: string,
    localDir: string,
    client: {
        folders: {
            getItems: (
                id: string,
                options?: { fields?: string; limit?: number; offset?: number }
            ) => Promise<{
                entries: Array<{ id: string; type: string; name: string }>;
            }>;
            getMetadata: (
                id: string,
                scope: string,
                templateKey: string
            ) => Promise<Record<string, unknown>>;
        };
        files: {
            getMetadata: (
                id: string,
                scope: string,
                templateKey: string
            ) => Promise<Record<string, unknown>>;
            getReadStream: (
                id: string,
                options?: unknown,
                callback?: (
                    err: Error | null,
                    stream?: NodeJS.ReadableStream
                ) => void
            ) => NodeJS.ReadableStream;
        };
    },
    entries: DownloadEntry[] = [],
    provider: string = "box",
    username: string = "default"
): Promise<DownloadEntry[]> {
    // Bảo đảm thư mục đích tồn tại
    await fs.promises.mkdir(localDir, { recursive: true });

    const limit = 1000;
    let offset = 0;

    /* Lặp phân trang qua mọi mục con của parentId */

    while (true) {
        const { entries: items } = await client.folders.getItems(parentId, {
            fields: "id,type,name",
            limit,
            offset,
        });

        for (const item of items) {
            // ----- LẤY METADATA originalPath & os -----
            interface MetaData {
                originalPath?: string;
                os?: string;
                [key: string]: unknown;
            }
            let meta: MetaData = {};
            try {
                if (item.type === "file") {
                    meta = (await client.files.getMetadata(
                        item.id,
                        "global",
                        "properties"
                    )) as MetaData;
                } else if (item.type === "folder") {
                    meta = (await client.folders.getMetadata(
                        item.id,
                        "global",
                        "properties"
                    )) as MetaData;
                }
            } catch (err) {
                // 404 = chưa có metadata → bỏ qua
                if (err.statusCode !== 404) throw err;
            }

            const origPath = meta.originalPath;
            const origOS = meta.os;
            const isSameOS = origOS === process.platform;

            // ----- XÁC ĐỊNH ĐÍCH LƯU FILE/FOLDER -----
            const targetPath =
                origPath && isSameOS
                    ? origPath
                    : path.join(localDir, item.name);

            const isFolder = item.type === "folder";

            // Cập nhật boxMapping (ghi đè hoặc thêm mới)
            if (isSameOS) {
                boxMapping[targetPath] = {
                    id: item.id,
                    parentId,
                    isFolder,
                    lastSync: new Date().toISOString(),
                    provider,
                    username,
                };
            }
            // Ghi nhận để pullFromBox dùng tạo symlink về sau
            entries.push({
                path: targetPath,
                id: item.id,
                parentId,
                origOS,
                provider,
                username,
            });

            if (isFolder) {
                // Đệ quy cho thư mục con
                await downloadTreeBox(
                    item.id,
                    targetPath,
                    client,
                    entries,
                    provider,
                    username
                );
            } else {
                // ----- TẢI FILE -----
                await fs.promises.mkdir(path.dirname(targetPath), {
                    recursive: true,
                });

                // Nếu khác OS và file đã tồn tại → bỏ qua (giữ cache)
                if (!isSameOS) {
                    try {
                        await fs.promises.access(targetPath, fs.constants.F_OK);
                        continue; // đã có file
                    } catch {
                        /* không tồn tại, tiếp tục tải */
                    }
                }

                const dest = fs.createWriteStream(targetPath);
                await new Promise((resolve, reject) => {
                    client.files.getReadStream(item.id, null, (err, stream) => {
                        if (err) return reject(err);
                        if (!stream)
                            return reject(new Error("Stream is undefined"));
                        stream
                            .on("error", reject)
                            .on("end", resolve)
                            .pipe(dest);
                    });
                });
            }
        }

        if (items.length < limit) break; // Hết trang
        offset += items.length;
    }

    return entries;
}

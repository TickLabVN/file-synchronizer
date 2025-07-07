import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
const { boxMapping, store } = constants as unknown as {
    boxMapping: Record<
        string,
        { id: string; isFolder?: boolean; lastSync?: string }
    >;
    store: { set: (key: string, value: unknown) => Promise<void> };
};

/**
 * Duyệt cây thư mục cục bộ rồi so sánh/đồng bộ với Box.
 * - Nếu file mới hơn cục bộ  → tải lên phiên bản mới.
 * - Nếu file/thư mục mất cục bộ → xoá trên Box và xoá khỏi boxMapping.
 *
 * @param {string} srcPath   Đường dẫn cục bộ
 * @param {string} itemId    ID file/folder trên Box
 * @param {import("box-node-sdk").BoxClient} client  Box SDK client
 * @returns {Promise<boolean>} true nếu có thay đổi ở xa
 */
export default async function traverseCompareBox(
    srcPath: string,
    itemId: string,
    client
): Promise<boolean> {
    let hasChanged = false;
    const rec = boxMapping[srcPath]; // luôn có vì được map sẵn

    try {
        const stats = await fs.promises.stat(srcPath);

        if (stats.isDirectory()) {
            // ----- FOLDER -----
            const entries = await fs.promises.readdir(srcPath);
            for (const entry of entries) {
                const childPath = path.join(srcPath, entry);
                const childRec = boxMapping[childPath];
                if (childRec) {
                    const childChanged = await traverseCompareBox(
                        childPath,
                        childRec.id,
                        client
                    );
                    if (childChanged) hasChanged = true;
                }
            }
        } else {
            // ----- FILE -----
            // Lấy modified_at trên Box
            const meta = await client.files.get(itemId, {
                fields: "modified_at",
            });
            const remoteTime = new Date(meta.modified_at);
            const localTime = stats.mtime;

            if (localTime > remoteTime) {
                // Cục bộ mới hơn → đẩy phiên bản mới
                await client.files.uploadNewFileVersion(
                    itemId,
                    fs.createReadStream(srcPath)
                );
                hasChanged = true;
            }
        }
    } catch (err) {
        // File/folder đã bị xoá cục bộ → xoá trên Box
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            try {
                if (rec?.isFolder) {
                    await client.folders.delete(itemId, { recursive: true });
                } else {
                    await client.files.delete(itemId);
                }
                console.log(`Deleted on Box: ${itemId} (src=${srcPath})`);
            } catch (boxErr) {
                console.error("Failed to delete on Box:", boxErr);
            }

            // Loại bỏ mọi key con trong boxMapping
            for (const key of Object.keys(boxMapping)) {
                if (key === srcPath || key.startsWith(srcPath + path.sep)) {
                    delete boxMapping[key];
                }
            }
            await store.set("boxMapping", boxMapping);
            return true;
        }
        throw err; // lỗi khác
    }

    if (hasChanged) {
        boxMapping[srcPath].lastSync = new Date().toISOString();
        await store.set("boxMapping", boxMapping);
    }
    return hasChanged;
}

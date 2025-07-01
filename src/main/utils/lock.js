import { Readable } from "stream";

/** Sử dụng chung ở nhiều file */
export const LOCK_NAME = "__ticklabfs_sync.lock";

/**
 * Xoá ngay file khoá khi thoát app.
 * KHÔNG kiểm tra TTL, cứ gặp là xoá.
 */
export async function cleanupDriveLockOnExit(drive, backupFolderId) {
    const { data } = await drive.files.list({
        q: `'${backupFolderId}' in parents and name='${LOCK_NAME}' and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
    });
    if (data.files.length) {
        try {
            await drive.files.delete({ fileId: data.files[0].id });
            console.log("[exit] Deleted lock file on Google Drive");
        } catch (err) {
            console.warn(
                "[exit] Failed to delete lock file on Google Drive:",
                err
            );
        }
    }
}

export async function cleanupBoxLockOnExit(client, backupFolderId) {
    const { entries } = await client.folders.getItems(backupFolderId, {
        fields: "id,name",
        limit: 1000,
    });
    const lock = entries.find((e) => e.type === "file" && e.name === LOCK_NAME);
    if (lock) {
        try {
            await client.files.delete(lock.id);
            console.log("[exit] Deleted lock file on Box");
        } catch (err) {
            console.warn("[exit] Failed to delete lock file on Box:", err);
        }
    }
}

/** ---------------- GOOGLE DRIVE ---------------- */
export async function acquireDriveLock(
    drive,
    backupFolderId,
    deviceId,
    ttlMs = 10 * 60 * 1e3
) {
    const LOCK_NAME = "__ticklabfs_sync.lock";
    const { data } = await drive.files.list({
        q: `'${backupFolderId}' in parents and name='${LOCK_NAME}' and trashed=false`,
        fields: "files(id, createdTime, appProperties)",
        spaces: "drive",
    });

    if (data.files.length) {
        const lock = data.files[0];
        const age = Date.now() - new Date(lock.createdTime).getTime();
        if (age < ttlMs) return { acquired: false }; // còn hiệu lực
        try {
            await drive.files.delete({ fileId: lock.id });
        } catch (e) {
            // Nếu không thể xóa, có thể do quyền hạn hoặc file đã bị xóa
            if (e.code !== 404) {
                console.error("Failed to delete old lock file:", e);
            }
            return { acquired: false }; // không thể xóa, không thể lấy khóa
        }
    }

    const emptyStream = Readable.from([]);
    const res = await drive.files.create({
        requestBody: {
            name: LOCK_NAME,
            parents: [backupFolderId],
            mimeType: "application/octet-stream",
            appProperties: { deviceId, created: Date.now().toString() },
        },
        media: {
            mimeType: "application/octet-stream",
            body: emptyStream,
        },
        fields: "id",
    });
    return { acquired: true, lockId: res.data.id };
}

export async function releaseDriveLock(drive, lockId) {
    if (lockId) {
        try {
            await drive.files.delete({ fileId: lockId });
        } catch {
            // Ignore errors, especially if the file was already deleted
            // or if the user doesn't have permission to delete it.
            // This is common in Google Drive where files can be shared.
            console.warn("Failed to release lock:", lockId);
        }
    }
}

/** ---------------- BOX ---------------- */
export async function acquireBoxLock(
    client,
    backupFolderId,
    deviceId,
    ttlMs = 10 * 60 * 1e3
) {
    const LOCK_NAME = "__ticklabfs_sync.lock";
    const { entries } = await client.folders.getItems(backupFolderId, {
        fields: "id,name,created_at",
        limit: 1000,
    });
    const existing = entries.find(
        (e) => e.type === "file" && e.name === LOCK_NAME
    );

    if (existing) {
        const age = Date.now() - new Date(existing.created_at).getTime();
        if (age < ttlMs) return { acquired: false };
        try {
            await client.files.delete(existing.id);
        } catch {
            /* ignore */
            // Nếu không thể xóa, có thể do quyền hạn hoặc file đã bị xóa
            return { acquired: false }; // không thể xóa, không thể lấy khóa
        }
    }

    const uploaded = await client.files.uploadFile(
        backupFolderId,
        LOCK_NAME,
        Buffer.from("")
    );
    return { acquired: true, lockId: uploaded.id };
}

export async function releaseBoxLock(client, lockId) {
    if (lockId) {
        try {
            await client.files.delete(lockId);
        } catch {
            /* ignore */
            // Ignore errors, especially if the file was already deleted
            // or if the user doesn't have permission to delete it.
            console.warn("Failed to release lock:", lockId);
        }
    }
}

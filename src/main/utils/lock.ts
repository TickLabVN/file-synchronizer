import { Readable } from "stream";

/** Sử dụng chung ở nhiều file */
export const LOCK_NAME = "__ticklabfs_sync.lock";

/**
 * Xoá ngay file khoá khi thoát app.
 * KHÔNG kiểm tra TTL, cứ gặp là xoá.
 */
export async function cleanupDriveLockOnExit(
    drive,
    backupFolderId
): Promise<void> {
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

export async function cleanupBoxLockOnExit(
    client,
    backupFolderId
): Promise<void> {
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
    backupFolderId: string,
    deviceId: string,
    ttlMs: number = 10 * 60 * 1e3
): Promise<{ acquired: boolean; lockId?: string }> {
    const LOCK_NAME = "__ticklabfs_sync.lock";
    const { data } = await drive.files.list({
        q: `'${backupFolderId}' in parents and name='${LOCK_NAME}' and trashed=false`,
        fields: "files(id, createdTime, appProperties)",
        spaces: "drive",
    });

    if (data.files.length) {
        const lock = data.files[0];
        const sameDevice = lock.appProperties?.deviceId === deviceId;

        const age = Date.now() - new Date(lock.createdTime).getTime();
        if (age < ttlMs && !sameDevice) return { acquired: false };

        // Xoá lock cũ (dù là sameDevice hay hết TTL)
        await drive.files.delete({ fileId: lock.id }).catch(() => {});
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

export async function releaseDriveLock(drive, lockId): Promise<void> {
    if (lockId) {
        try {
            await drive.files.delete({ fileId: lockId });
            console.log(`[release] Deleted lock ${lockId}`);
        } catch (err) {
            const status = err.code || err?.response?.status;
            if (status !== 404 && status !== 403) {
                console.warn("Failed to release lock:", lockId, err.message);
            } else {
                console.debug(
                    `[release] Lock ${lockId} already gone (status ${status})`
                );
            }
        }
    }
}

/** ---------------- BOX ---------------- */
export async function acquireBoxLock(
    client,
    backupFolderId: string,
    deviceId: string,
    ttlMs: number = 10 * 60 * 1e3
): Promise<{ acquired: boolean; lockId?: string }> {
    const LOCK_NAME = "__ticklabfs_sync.lock";
    const { entries } = await client.folders.getItems(backupFolderId, {
        fields: "id,name,created_at",
        limit: 1000,
    });
    const existing = entries.find(
        (e) => e.type === "file" && e.name === LOCK_NAME
    );

    if (existing) {
        const sameDevice = existing.description === deviceId;
        const age = Date.now() - new Date(existing.created_at).getTime();
        if (age < ttlMs && !sameDevice) return { acquired: false };
        // Xoá lock cũ (dù là sameDevice hay hết TTL)
        try {
            await client.files.delete(existing.id);
        } catch (err) {
            console.warn("Failed to delete existing lock:", err.message);
        }
    }

    const res = await client.files.uploadFile(
        backupFolderId,
        LOCK_NAME,
        Buffer.from("")
    );
    const fileEntry = res?.entries?.[0];
    if (!fileEntry?.id) {
        throw new Error("Box lock upload succeeded but no file ID returned");
    }
    await client.files.update(fileEntry.id, { description: deviceId });
    return { acquired: true, lockId: fileEntry.id };
}

export async function releaseBoxLock(client, lockId): Promise<void> {
    if (lockId) {
        try {
            await client.files.delete(lockId);
            console.log(`[release] Deleted lock ${lockId}`);
        } catch (err) {
            const status = err.statusCode || err.response?.status;
            if (status !== 404 && status !== 403) {
                console.warn("Failed to release lock:", lockId, err.message);
            } else {
                console.debug(
                    `[release] Lock ${lockId} already gone (status ${status})`
                );
            }
        }
    }
}

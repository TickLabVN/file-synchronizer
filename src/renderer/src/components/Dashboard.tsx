import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../api";
import Loading from "./Loading";
import Header from "./Header";
import CloudProvider from "./cloud/CloudProvider";
import UploadedFile from "./uploaded/UploadedFile";
import AddFilesPopup from "./uploaded/AddFilesPopup";

function mergeUnique<T extends { path: string }>(prev: T[], next: T[]): T[] {
    const existed = new Set(prev.map((it) => it.path));
    return [...prev, ...next.filter((it) => !existed.has(it.path))];
}

function pruneExcluded(
    prevExcluded: string[],
    newItems: Array<{ path: string }>
): string[] {
    if (!newItems?.length) return prevExcluded;
    return prevExcluded.filter((ex) => {
        return !newItems.some(
            (it) =>
                ex === it.path ||
                ex.startsWith(it.path + "/") ||
                ex.startsWith(it.path + "\\")
        );
    });
}

interface DashboardProps {
    auth: boolean;
    username?: string;
    provider: { type: string } | null;
}

const Dashboard: React.FC<DashboardProps> = ({ auth }) => {
    const [syncing, setSyncing] = useState(false);
    const [selectedItems, setSelectedItems] = useState<
        Array<{ path: string; isDirectory: boolean; size?: number }>
    >([]);
    const [stopSyncPaths, setStopSyncPaths] = useState<string[]>([]);
    const [resumeSyncPaths, setResumeSyncPaths] = useState<string[]>([]);
    interface TrackedFile {
        provider: string;
        username: string;
        src: string;
        [key: string]: unknown;
    }
    const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
    const [pulling, setPulling] = useState(false);
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [excludedPaths, setExcludedPaths] = useState<string[]>([]);
    const [filterAccount, setFilterAccount] = useState<
        { type: string; username: string } | undefined
    >(undefined);
    const [removedAccounts, setRemovedAccounts] = useState<
        Array<{ type: string; username: string }>
    >([]);
    const [cloudAccounts, setCloudAccounts] = useState<
        Array<{ type: string; id: string; username: string }>
    >([]);
    const isWin = navigator?.userAgent.includes("Windows");
    const SEP = isWin ? "\\" : "/";

    // lọc trước khi render
    const displayedFiles = trackedFiles.filter(
        (f) =>
            !removedAccounts.some(
                (a) => a.type === f.provider && a.username === f.username
            )
    );

    interface HandleExclude {
        (p: string): void;
    }

    const handleExclude: HandleExclude = useCallback(
        (p: string) =>
            setExcludedPaths((prev: string[]) =>
                prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
            ),
        []
    );

    const handlePullDown = async (): Promise<void> => {
        if (cloudAccounts.length === 0) {
            toast.error("No cloud account connected.");
            return;
        }
        setPulling(true);
        try {
            for (const acc of cloudAccounts) {
                if (acc.type === "google") {
                    await api.useAccount(acc.id);
                    await api.pullFromDrive();
                } else if (acc.type === "box") {
                    await api.useBoxAccount(acc.id);
                    await api.pullFromBox();
                }
            }
            await loadTrackedFiles();
            toast.success("Pull down successful!");
        } catch (err) {
            console.error(err);
            toast.error(
                "Failed to pull: " +
                    (err && typeof err === "object" && "message" in err
                        ? (err as { message?: string }).message
                        : "Unknown error")
            );
        } finally {
            setPulling(false);
        }
    };

    useEffect(() => {
        //@ts-ignore: api.getCloudAccounts is a function
        api.getSettings().then(
            ({
                stopSyncPaths = [],
                resumeSyncPaths = [],
            }: {
                stopSyncPaths?: string[];
                resumeSyncPaths?: string[];
            }) => {
                interface CompressFn {
                    (list: string[]): string[];
                }
                const compress: CompressFn = (list) => {
                    const sorted: string[] = [...list] // sao chép để không mutate
                        .filter((p) => !resumeSyncPaths.includes(p))
                        .sort((a, b) => a.length - b.length); // cha trước con
                    const res: string[] = [];
                    for (const p of sorted) {
                        if (!res.some((r) => p.startsWith(r + SEP)))
                            res.push(p);
                    }
                    return res;
                };
                const dedupStop = compress(stopSyncPaths);
                setStopSyncPaths(dedupStop);
                setResumeSyncPaths(resumeSyncPaths);
                if (dedupStop.length !== stopSyncPaths.length) {
                    api.updateSettings({ stopSyncPaths: dedupStop });
                }
            }
        );
    }, [SEP]);

    // Dashboard.tsx
    // ... bên trong loadTrackedFiles ------------------------------
    const loadTrackedFiles = useCallback(async () => {
        try {
            // helper: biến mảng mapping thành mảng TrackedFile đích thực
            const flatten = (
                arr: Array<Record<string, TrackedFile>>
            ): TrackedFile[] => arr.flatMap((m) => (m ? Object.values(m) : []));

            const [driveMap, boxMap] = await Promise.all([
                api.getTrackedFiles().catch(() => []),
                api.getTrackedFilesBox().catch(() => []),
            ]);

            setTrackedFiles([...flatten(driveMap), ...flatten(boxMap)]);
        } catch (err) {
            console.error("Failed to load tracked files", err);
            toast.error(
                "Failed to load tracked files: " +
                    (err instanceof Error ? err.message : "Unknown error")
            );
        }
    }, []);

    useEffect(() => {
        if (auth) {
            loadTrackedFiles();
        }
    }, [loadTrackedFiles, auth]);

    useEffect(() => {
        const handler = (): void => {
            loadTrackedFiles();
        };
        api.onTrackedFilesUpdated(handler);
    }, [loadTrackedFiles]);

    interface CloudAccount {
        type: string;
        id: string;
        username: string;
    }

    const handleDeleteTrackedFile = async (file: {
        src: string;
        provider?: string;
        username?: string;
    }): Promise<void> => {
        toast.info("Deleting tracked file...");
        try {
            const provider = file.provider ?? "";
            const username = file.username ?? "";
            // tìm accountId (login/email) tương ứng
            const acc: CloudAccount | undefined = cloudAccounts.find(
                (a: CloudAccount) =>
                    a.type === provider &&
                    (a.username === username || a.id === username)
            );
            const accountId: string = acc ? acc.id : username; // fallback khi đã truyền đúng id

            if (provider === "google") {
                await api.useAccount(accountId); // ← dùng email
                await api.deleteTrackedFile(file.src);
            } else if (provider === "box") {
                await api.useBoxAccount(accountId); // ← dùng login
                await api.deleteTrackedFileBox(file.src);
            } else {
                throw new Error("Unknown provider");
            }

            toast.success("Tracked file deleted successfully!");
            loadTrackedFiles();
        } catch (err) {
            console.error("Failed to delete tracked file", err);
            toast.error(
                "Failed to delete tracked file: " +
                    (err && typeof err === "object" && "message" in err
                        ? (err as { message?: string }).message
                        : "Unknown error")
            );
        }
    };

    interface IsActuallyStopped {
        (p: string): boolean;
    }

    const isActuallyStopped: IsActuallyStopped = (p: string): boolean =>
        stopSyncPaths.some((s: string) => p === s || p.startsWith(s + SEP)) &&
        !resumeSyncPaths.some((r: string) => p === r || p.startsWith(r + SEP));

    interface HandleToggleStopSync {
        (p: string): void;
    }

    const handleToggleStopSync: HandleToggleStopSync = (p: string) => {
        const isExactInStop: boolean = stopSyncPaths.includes(p);
        const isBlockedByAnc: boolean = isActuallyStopped(p) && !isExactInStop;
        const nextStop: string[] = [...stopSyncPaths];
        const nextResume: string[] = [...resumeSyncPaths];

        if (isExactInStop) {
            /* ---- 1. Đang bị chặn trực tiếp → gỡ chặn ---- */
            // gỡ p khỏi stopSync
            for (let i = nextStop.length - 1; i >= 0; i--)
                if (nextStop[i] === p) nextStop.splice(i, 1);
            // gỡ mọi resume con (không còn cần thiết)
            for (let i = nextResume.length - 1; i >= 0; i--)
                if (nextResume[i] === p || nextResume[i].startsWith(p + SEP))
                    nextResume.splice(i, 1);
            toast.success("Resumed sync for " + p);
        } else if (isBlockedByAnc) {
            /* ---- 2. Bị chặn vì thư mục cha → whitelist p ---- */
            if (!nextResume.includes(p)) nextResume.push(p);
            toast.success("Resumed sync for " + p);
        } else {
            /* ---- 3. Hiện đang sync bình thường → thêm vào stopSync ---- */
            const coveredByParent: boolean = nextStop.some(
                (s: string) => s !== p && p.startsWith(s + SEP)
            );
            if (!coveredByParent) {
                for (let i = nextStop.length - 1; i >= 0; i--) {
                    if (nextStop[i].startsWith(p + SEP)) nextStop.splice(i, 1);
                }
                nextStop.push(p);
            }

            for (let i = nextResume.length - 1; i >= 0; i--)
                if (nextResume[i] === p || nextResume[i].startsWith(p + SEP))
                    nextResume.splice(i, 1);
            toast.success("Stopped sync for " + p);
        }

        setStopSyncPaths(nextStop);
        setResumeSyncPaths(nextResume);
        api.updateSettings({
            stopSyncPaths: nextStop,
            resumeSyncPaths: nextResume,
        });
    };

    const handleChooseFiles = async (): Promise<void> => {
        const items = await api.selectFiles(); // [{ path, size, isDirectory }]
        if (Array.isArray(items) && items.length > 0) {
            setSelectedItems((prev) => mergeUnique(prev, items));
            setExcludedPaths((prev) => pruneExcluded(prev, items));
        }
    };

    const handleChooseFolders = async (): Promise<void> => {
        const items = await api.selectFolders(); // [{ path, isDirectory, size? }]
        if (Array.isArray(items) && items.length > 0) {
            setSelectedItems((prev) => mergeUnique(prev, items));
        }
    };

    interface HandleRemove {
        (p: string): void;
    }

    const handleRemove: HandleRemove = (p: string): void => {
        setSelectedItems((prev) => prev.filter((item) => item.path !== p));
        setExcludedPaths((prev) => prev.filter((x) => !x.startsWith(p)));
    };

    interface SyncTarget {
        type: string;
        id: string;
        username: string;
    }

    interface SyncResult {
        success: boolean;
        failed: Array<{ path: string }>;
    }

    const handleSync = async (target: SyncTarget): Promise<void> => {
        if (!selectedItems.length) {
            toast.error("Please select files or folders to sync.");
            return;
        }
        if (!target) {
            toast.error("Please select a target account to sync.");
            return;
        }
        setSyncing(true);
        try {
            if (target.type === "google") await api.useAccount(target.id);
            else await api.useBoxAccount(target.id);

            // B2: upload
            const payload: { paths: string[]; exclude: string[] } = {
                paths: selectedItems.map((it) => it.path),
                exclude: excludedPaths,
            };
            const result: SyncResult =
                target.type === "google"
                    ? ((await api.syncFiles(payload)) as SyncResult)
                    : ((await api.syncBoxFiles(payload)) as SyncResult);
            if (result.success) {
                toast.success("All files synced successfully!");
                setSelectedItems([]);
                setExcludedPaths([]);
            } else {
                const failedPaths = result.failed.map((f) => f.path);
                toast.error(
                    `${failedPaths.length} file(s) failed to sync. Please check and try again.`
                );
                setSelectedItems((prev) =>
                    prev.filter((item) => failedPaths.includes(item.path))
                );
            }
            loadTrackedFiles();
        } catch (err: unknown) {
            console.error(err);
            toast.error(
                "Sync failed: " +
                    (err && typeof err === "object" && "message" in err
                        ? (err as { message?: string }).message
                        : "Unknown error")
            );
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        interface CloudAccountEventDetail {
            type: string;
            username: string;
        }

        const onRemoved = (e: Event): void => {
            const { type, username } = ((
                e as CustomEvent<CloudAccountEventDetail>
            ).detail || {}) as CloudAccountEventDetail;
            setRemovedAccounts((prev) => [...prev, { type, username }]);
            loadTrackedFiles(); // reload để ẩn ngay
        };

        interface CloudAccountEventDetail {
            type: string;
            username: string;
        }

        const onAdded = (e: Event): void => {
            const { type, username } =
                (e as CustomEvent<CloudAccountEventDetail>).detail || {};
            // huỷ cờ “đã xoá” nếu người dùng login lại
            setRemovedAccounts((prev) =>
                prev.filter(
                    (x) => !(x.type === type && x.username === username)
                )
            );
            loadTrackedFiles(); // reload để hiện lại đúng item
        };

        window.addEventListener("cloud-account-removed", onRemoved);
        window.addEventListener("cloud-account-added", onAdded);
        return () => {
            window.removeEventListener("cloud-account-removed", onRemoved);
            window.removeEventListener("cloud-account-added", onAdded);
        };
    }, [loadTrackedFiles]);

    const refreshCloudAccounts = useCallback(async () => {
        //@ts-ignore: api.listAccounts is a function
        const drive = await api.listAccounts().catch(() => []);
        const google = await Promise.all(
            drive.map(async ({ id, displayName }) => {
                // Lấy profile để biết tên hiển thị
                try {
                    await api.useAccount(id);
                } catch {
                    console.warn(`Failed to use account ${id}`);
                    return null; // nếu không dùng được thì bỏ qua
                }
                return {
                    type: "google",
                    id: id, // khóa tra token
                    username: displayName || id.split("@")[0],
                };
            })
        );

        //@ts-ignore: api.listAccounts is a function
        const box = await api.listBoxAccounts().catch(() => []);
        const boxAcc = await Promise.all(
            box.map(async ({ id, displayName }) => {
                try {
                    await api.useBoxAccount(id);
                } catch {
                    console.warn(`Failed to use Box account ${id}`);
                    return null; // nếu không dùng được thì bỏ qua
                }
                //@ts-ignore: api.getProfile is a function
                const prof = await api.getBoxProfile().catch(() => null);
                return {
                    type: "box",
                    id: id,
                    username: displayName || (prof ? prof.login : id),
                };
            })
        );

        setCloudAccounts([...google, ...boxAcc]);
    }, []);

    useEffect(() => {
        refreshCloudAccounts(); // nạp lần đầu
        window.addEventListener("cloud-accounts-updated", refreshCloudAccounts);
        return () =>
            window.removeEventListener(
                "cloud-accounts-updated",
                refreshCloudAccounts
            );
    }, [refreshCloudAccounts]);

    return (
        <div className="flex h-full flex-col">
            <Header />
            <div className="flex flex-1 bg-white dark:bg-gray-900">
                <main className="flex-1 overflow-auto p-6">
                    <UploadedFile
                        handlePullDown={handlePullDown}
                        trackedFiles={displayedFiles}
                        stopSyncPaths={stopSyncPaths}
                        onToggleStopSync={handleToggleStopSync}
                        onDeleteTrackedFile={handleDeleteTrackedFile}
                        onAddClick={() => setShowAddPopup(true)}
                        filterAccount={filterAccount}
                        hasCloud={cloudAccounts.length > 0}
                        resumeSyncPaths={resumeSyncPaths}
                    />
                </main>
                <aside className="w-80 border-l border-gray-200 p-6 dark:border-gray-700">
                    <CloudProvider
                        onFilterChange={(filter) =>
                            setFilterAccount(filter ?? undefined)
                        }
                    />
                </aside>
            </div>
            {pulling && <Loading syncing={true} />}
            {syncing && <Loading syncing={syncing} />}
            <AddFilesPopup
                open={showAddPopup}
                onOpenChange={setShowAddPopup}
                chooseFiles={handleChooseFiles}
                chooseFolder={handleChooseFolders}
                handleUpload={async (account: { type: string; id: string }) => {
                    // Find the username for the selected account
                    const acc = cloudAccounts.find(
                        (a) => a.type === account.type && a.id === account.id
                    );
                    if (acc) {
                        await handleSync(acc);
                    } else {
                        toast.error("Selected account not found.");
                    }
                }}
                selectedItems={selectedItems}
                handleRemove={handleRemove}
                excludedPaths={excludedPaths}
                handleExclude={handleExclude}
            />
        </div>
    );
};

export default Dashboard;

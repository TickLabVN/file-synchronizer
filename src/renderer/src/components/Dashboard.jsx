import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../api";
import Loading from "@components/Loading";
import Header from "./Header";
import CloudProvider from "./cloud/CloudProvider";
import UploadedFile from "./uploaded/UploadedFile";
import AddFilesPopup from "./uploaded/AddFilesPopup";
function mergeUnique(prev, next) {
    const existed = new Set(prev.map((it) => it.path));
    return [...prev, ...next.filter((it) => !existed.has(it.path))];
}
function pruneExcluded(prevExcluded, newItems) {
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
const Dashboard = ({ auth, provider }) => {
    const [syncing, setSyncing] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [stopSyncPaths, setStopSyncPaths] = useState([]);
    const [resumeSyncPaths, setResumeSyncPaths] = useState([]);
    const [trackedFiles, setTrackedFiles] = useState([]);
    const [pulling, setPulling] = useState(false);
    const [showAddPopup, setShowAddPopup] = useState(false);
    const providerType = provider?.type;
    const [excludedPaths, setExcludedPaths] = useState([]);
    const [filterAccount, setFilterAccount] = useState(null);
    const [removedAccounts, setRemovedAccounts] = useState([]);
    const [cloudAccounts, setCloudAccounts] = useState([]);

    // lọc trước khi render
    const displayedFiles = trackedFiles.filter(
        (f) =>
            !removedAccounts.some(
                (a) => a.type === f.provider && a.username === f.username
            )
    );

    const handleExclude = useCallback(
        (p) =>
            setExcludedPaths((prev) =>
                prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
            ),
        []
    );

    const handlePullDown = async () => {
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
            toast.error("Failed to pull: " + (err.message || "Unknown error"));
        } finally {
            setPulling(false);
        }
    };

    useEffect(() => {
        api.getSettings().then(
            ({ stopSyncPaths = [], resumeSyncPaths = [] }) => {
                const compress = (list) => {
                    const sorted = [...list] // sao chép để không mutate
                        .filter((p) => !resumeSyncPaths.includes(p))
                        .sort((a, b) => a.length - b.length); // cha trước con
                    const res = [];
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
    }, []);

    const loadTrackedFiles = useCallback(async () => {
        try {
            const [drive, box] = await Promise.all([
                api.getTrackedFiles().catch(() => []), // ← tránh gãy cả cụm
                api.getTrackedFilesBox().catch(() => []),
            ]);
            setTrackedFiles([...drive, ...box]);
        } catch (err) {
            console.error("Failed to load tracked files", err);
            toast.error(
                "Failed to load tracked files: " +
                    (err.message || "Unknown error")
            );
        }
    }, []);

    useEffect(() => {
        if (auth) {
            loadTrackedFiles();
        }
    }, [loadTrackedFiles, auth]);

    useEffect(() => {
        const handler = () => loadTrackedFiles();
        api.onTrackedFilesUpdated(handler);
    }, [loadTrackedFiles]);

    const handleDeleteTrackedFile = async (file) => {
        toast.info("Deleting tracked file...");
        try {
            // tìm accountId (login/email) tương ứng
            const acc = cloudAccounts.find(
                (a) =>
                    a.type === file.provider &&
                    (a.username === file.username || a.id === file.username)
            );
            const accountId = acc ? acc.id : file.username; // fallback khi đã truyền đúng id

            if (file.provider === "google") {
                await api.useAccount(accountId); // ← dùng email
                await api.deleteTrackedFile(file.src);
            } else if (file.provider === "box") {
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
                    (err.message || "Unknown error")
            );
        }
    };

    const isWin = navigator?.userAgent.includes("Windows");
    const SEP = isWin ? "\\" : "/";

    const isActuallyStopped = (p) =>
        stopSyncPaths.some((s) => p === s || p.startsWith(s + SEP)) &&
        !resumeSyncPaths.some((r) => p === r || p.startsWith(r + SEP));

    const handleToggleStopSync = (p) => {
        const isExactInStop = stopSyncPaths.includes(p);
        const isBlockedByAnc = isActuallyStopped(p) && !isExactInStop;
        const nextStop = [...stopSyncPaths];
        const nextResume = [...resumeSyncPaths];

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
            const coveredByParent = nextStop.some(
                (s) => s !== p && p.startsWith(s + SEP)
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

    const handleChooseFiles = async () => {
        const items = await api.selectFiles(); // [{ path, size, isDirectory }]
        if (items) {
            setSelectedItems((prev) => mergeUnique(prev, items));
            setExcludedPaths((prev) => pruneExcluded(prev, items));
        }
    };

    const handleChooseFolders = async () => {
        const items = await api.selectFolders();
        if (items) setSelectedItems((prev) => mergeUnique(prev, items));
    };

    const handleRemove = (p) => {
        setSelectedItems((prev) => prev.filter((item) => item.path !== p));
        setExcludedPaths((prev) => prev.filter((x) => !x.startsWith(p)));
    };

    const handleSync = async (target) => {
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
            const payload = {
                paths: selectedItems.map((it) => it.path),
                exclude: excludedPaths,
            };
            const result =
                target.type === "google"
                    ? await api.syncFiles(payload)
                    : await api.syncBoxFiles(payload);
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
        } catch (err) {
            console.error(err);
            toast.error("Sync failed: " + (err.message || "Unknown error"));
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const onRemoved = (e) => {
            const { type, username } = e.detail || {};
            setRemovedAccounts((prev) => [...prev, { type, username }]);
            loadTrackedFiles(); // reload để ẩn ngay
        };

        const onAdded = (e) => {
            const { type, username } = e.detail || {};
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
        const drive = await api.listAccounts().catch(() => []);
        const google = await Promise.all(
            drive.map(async ({ email }) => {
                // Lấy profile để biết tên hiển thị
                try {
                    await api.useAccount(email);
                } catch {
                    console.warn(`Failed to use account ${email}`);
                    return null; // nếu không dùng được thì bỏ qua
                }
                const prof = await api.getProfile(email).catch(() => null);
                return {
                    type: "google",
                    id: email, // khóa tra token
                    username: prof?.name || email, // tên hiển thị khớp mapping
                };
            })
        );

        const box = await api.listBoxAccounts().catch(() => []);
        const boxAcc = await Promise.all(
            box.map(async ({ login }) => {
                try {
                    await api.useBoxAccount(login);
                } catch {
                    console.warn(`Failed to use Box account ${login}`);
                    return null; // nếu không dùng được thì bỏ qua
                }
                const prof = await api.getBoxProfile().catch(() => null);
                return {
                    type: "box",
                    id: login,
                    username: prof?.name || login,
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
                    <CloudProvider onFilterChange={setFilterAccount} />
                </aside>
            </div>
            {pulling && <Loading syncing={true} />}
            {syncing && <Loading syncing={syncing} />}
            <AddFilesPopup
                open={showAddPopup}
                onOpenChange={setShowAddPopup}
                providerType={providerType}
                chooseFiles={handleChooseFiles}
                chooseFolder={handleChooseFolders}
                handleUpload={(targetAcc) => handleSync(targetAcc)}
                selectedItems={selectedItems}
                handleRemove={handleRemove}
                excludedPaths={excludedPaths}
                handleExclude={handleExclude}
            />
        </div>
    );
};

export default Dashboard;

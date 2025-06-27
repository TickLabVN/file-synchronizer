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
    const [trackedFiles, setTrackedFiles] = useState([]);
    const [pulling, setPulling] = useState(false);
    const [showAddPopup, setShowAddPopup] = useState(false);
    const providerType = provider?.type;
    const [excludedPaths, setExcludedPaths] = useState([]);
    const [filterAccount, setFilterAccount] = useState(null);
    const [removedAccounts, setRemovedAccounts] = useState([]);

    // lọc trước khi render
    const displayedFiles = trackedFiles
        .filter(
            (f) =>
                !removedAccounts.some(
                    (a) => a.type === f.provider && a.username === f.username
                )
        )
        .filter(
            (f) =>
                !filterAccount ||
                (f.provider === filterAccount.type &&
                    f.username === filterAccount.username)
        );

    const handleExclude = useCallback(
        (p) =>
            setExcludedPaths((prev) =>
                prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
            ),
        []
    );

    const handlePullDown = async () => {
        setPulling(true);
        try {
            await Promise.all([
                api.pullFromDrive().catch(() => {}),
                api.pullFromBox().catch(() => {}),
            ]);
            toast.success("Pull down successful!");
        } catch (err) {
            console.error(err);
            toast.error(
                "Failed to pull down from Drive:" +
                    (err.message || "Unknown error")
            );
        } finally {
            setPulling(false);
        }
    };

    useEffect(() => {
        api.getSettings().then(({ stopSyncPaths = [] }) => {
            setStopSyncPaths(stopSyncPaths);
        });
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
            if (file.provider === "google") {
                await api.deleteTrackedFile(file.src);
            } else if (file.provider === "box") {
                await api.deleteTrackedFileBox(file.src);
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

    const handleRemoveStopSync = (p) => {
        const next = stopSyncPaths.filter((x) => x !== p);
        setStopSyncPaths(next);
        api.updateSettings({ stopSyncPaths: next });
        toast.success("Removed stop sync for " + p);
    };

    const handleAddStopSync = (p) => {
        const next = Array.from(new Set([...stopSyncPaths, p]));
        setStopSyncPaths(next);
        api.updateSettings({ stopSyncPaths: next });
        toast.success("Stopped sync for " + p);
    };

    const handleToggleStopSync = (p) => {
        if (stopSyncPaths.includes(p)) {
            handleRemoveStopSync(p);
        } else {
            handleAddStopSync(p);
        }
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
        // 👉 luôn dùng loadTrackedFiles đã memo-hoá
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

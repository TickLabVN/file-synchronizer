import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFile,
    faFolder,
    faTrash,
    faPause,
    faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../api";
import Loading from "@components/Loading";
import Header from "./Header";
import CloudProvider from "./cloud/CloudProvider";
const Dashboard = ({ auth, provider }) => {
    const [syncing, setSyncing] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [stopSyncPaths, setStopSyncPaths] = useState([]);
    const [trackedFiles, setTrackedFiles] = useState([]);
    const [pulling, setPulling] = useState(false);

    const handlePullDown = async () => {
        setPulling(true);
        try {
            if (provider === "google") {
                await api.pullFromDrive();
            } else if (provider === "box") {
                await api.pullFromBox();
            } else {
                throw new Error("Unsupported provider: " + provider);
            }
            if (loadTrackedFiles) {
                await loadTrackedFiles();
            }
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

    const loadTrackedFiles = useCallback(() => {
        const fetchTrackedFiles =
            provider === "google"
                ? api.getTrackedFiles
                : api.getTrackedFilesBox;
        fetchTrackedFiles()
            .then((files) => setTrackedFiles(files))
            .catch((err) => {
                console.error("Failed to load tracked files", err);
                toast.error(
                    "Failed to load tracked files: " +
                        (err.message || "Unknown error")
                );
            });
    }, [provider]);

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
            if (provider === "google") {
                await api.deleteTrackedFile(file);
            } else {
                await api.deleteTrackedFileBox(file);
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
        const paths = await api.selectFiles();
        if (paths) {
            setSelectedItems((prev) => [
                ...prev,
                ...paths.map((p) => ({ path: p, isDirectory: false })),
            ]);
        }
    };

    const handleChooseFolders = async () => {
        const paths = await api.selectFolders();
        if (paths) {
            setSelectedItems((prev) => [
                ...prev,
                ...paths.map((p) => ({ path: p, isDirectory: true })),
            ]);
        }
    };

    const handleRemove = (p) =>
        setSelectedItems((prev) => prev.filter((item) => item.path !== p));

    const handleSync = async () => {
        if (!selectedItems.length) {
            toast.error("Please select files or folders to sync.");
            return;
        }
        setSyncing(true);
        try {
            const paths = selectedItems.map((item) => item.path);
            const result =
                provider === "google"
                    ? await api.syncFiles(paths)
                    : await api.syncBoxFiles(paths);
            loadTrackedFiles();
            if (result.success) {
                toast.success("All files synced successfully!");
                setSelectedItems([]);
            } else {
                const failedPaths = result.failed.map((f) => f.path);
                toast.error(
                    `${failedPaths.length} file(s) failed to sync. Please check and try again.`
                );
                setSelectedItems((prev) =>
                    prev.filter((item) => failedPaths.includes(item.path))
                );
            }
        } catch (err) {
            console.error(err);
            toast.error("Sync failed: " + (err.message || "Unknown error"));
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <Header />
            <div className="flex flex-1 bg-white dark:bg-gray-900">
                <main className="flex-1 overflow-auto p-6">
                    <h2 className="mb-4 text-center text-lg dark:text-gray-400">
                        Choose file or folder that you need to backup
                    </h2>

                    {selectedItems.length > 0 && (
                        <ul className="scrollbar mb-4 max-h-48 space-y-2 overflow-auto">
                            {selectedItems.map(({ path, isDirectory }) => (
                                <li
                                    key={path}
                                    className="flex items-center justify-between rounded bg-gray-50 px-4 py-2 dark:bg-gray-700 dark:text-gray-400"
                                >
                                    <span className="truncate">
                                        <FontAwesomeIcon
                                            icon={
                                                isDirectory ? faFolder : faFile
                                            }
                                            className="mr-2 text-yellow-500"
                                        />{" "}
                                        {path}
                                    </span>
                                    <button
                                        onClick={() => handleRemove(path)}
                                        className="cursor-pointer text-red-500 hover:text-red-600"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {selectedItems.length == 0 && (
                        <div className="mb-6 flex items-center justify-center">
                            <input
                                type="text"
                                readOnly
                                placeholder="No file or folder selected"
                                className="w-2/3 rounded border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            />
                        </div>
                    )}

                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex space-x-4">
                            <button
                                className="w-40 cursor-pointer rounded bg-blue-500 py-2 text-white hover:bg-blue-600 dark:bg-blue-700 dark:text-gray-200 dark:hover:bg-blue-800"
                                onClick={handleChooseFiles}
                            >
                                Choose file <FontAwesomeIcon icon={faFile} />
                            </button>
                            <button
                                className="w-40 cursor-pointer rounded bg-blue-500 py-2 text-white hover:bg-blue-600 dark:bg-blue-700 dark:text-gray-200 dark:hover:bg-blue-800"
                                onClick={handleChooseFolders}
                            >
                                Choose folder{" "}
                                <FontAwesomeIcon icon={faFolder} />
                            </button>
                        </div>
                        <button
                            className="w-40 cursor-pointer rounded bg-green-600 py-2 text-white hover:bg-green-700 dark:bg-green-800 dark:text-gray-200 dark:hover:bg-green-900"
                            onClick={handleSync}
                        >
                            Upload
                        </button>
                        <button
                            className="w-40 cursor-pointer rounded bg-green-600 py-2 text-white hover:bg-green-700 dark:bg-green-800 dark:text-gray-200 dark:hover:bg-green-900"
                            onClick={handlePullDown}
                        >
                            Pull from cloud
                        </button>
                    </div>

                    {trackedFiles.length > 0 && (
                        <div className="mt-6">
                            <h2 className="mb-2 text-center text-lg dark:text-gray-400">
                                Tracked Files
                            </h2>
                            <ul className="scrollbar max-h-48 space-y-2 overflow-auto">
                                {trackedFiles.map(
                                    ({ src, lastSync, isDirectory }) => (
                                        <li
                                            key={src}
                                            className="flex items-center justify-between rounded bg-gray-50 px-4 py-2 dark:bg-gray-700 dark:text-gray-400"
                                        >
                                            <span className="flex-1 truncate">
                                                <FontAwesomeIcon
                                                    icon={
                                                        isDirectory
                                                            ? faFolder
                                                            : faFile
                                                    }
                                                    className="mr-2 text-yellow-500"
                                                />
                                                {src}
                                            </span>
                                            <span className="mr-4 ml-4 text-sm text-gray-500 dark:text-gray-400">
                                                {lastSync
                                                    ? new Date(
                                                          lastSync
                                                      ).toLocaleString(
                                                          "en-US",
                                                          {
                                                              hour12: false,
                                                          }
                                                      )
                                                    : "No sync yet"}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    handleToggleStopSync(src)
                                                }
                                                className="mr-2 cursor-pointer text-yellow-500 hover:text-yellow-600"
                                            >
                                                <FontAwesomeIcon
                                                    icon={
                                                        stopSyncPaths.includes(
                                                            src
                                                        )
                                                            ? faPause
                                                            : faPlay
                                                    }
                                                />
                                            </button>

                                            <button
                                                onClick={() =>
                                                    handleDeleteTrackedFile(src)
                                                }
                                                className="cursor-pointer text-red-500 hover:text-red-600"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTrash}
                                                />
                                            </button>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    )}
                </main>
                <aside>
                    <CloudProvider />
                </aside>
            </div>
            {pulling && <Loading syncing={true} />}
            {syncing && <Loading syncing={syncing} />}
        </div>
    );
};

export default Dashboard;

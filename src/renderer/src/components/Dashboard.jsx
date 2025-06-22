import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faRepeat,
    faFile,
    faFolder,
    faTrash,
    faGear,
    faPause,
    faPlay,
    faBox,
} from "@fortawesome/free-solid-svg-icons";
import { faGoogleDrive } from "@fortawesome/free-brands-svg-icons";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../api";
import ModalConfirmLogout from "@components/ModalConfirmLogout";
import SettingPopup from "@components/SettingPopup";
import Loading from "@components/Loading";
import Login from "./Login";
import ChooseCentralFolder from "./ChooseCentralFolder";
import ggdrive from "@assets/ggdrive.svg";
import box from "@assets/box.svg";

const Dashboard = ({
    username,
    savedCentralFolderPath,
    handleLogout,
    handleChangeCentralFolder,
    auth,
    handleSelectFolder,
    handleContinue,
    handleLoginSuccess,
    centralFolderPath,
    provider,
}) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [stopSyncPaths, setStopSyncPaths] = useState([]);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showChooseModal, setShowChooseModal] = useState(false);
    const [trackedFiles, setTrackedFiles] = useState([]);

    useEffect(() => {
        api.getSettings().then(({ stopSyncPaths = [] }) => {
            setStopSyncPaths(stopSyncPaths);
        });
    }, []);

    useEffect(() => {
        if (auth) {
            setShowLoginModal(false);
            setShowChooseModal(true);
        }
    }, [auth]);

    useEffect(() => {
        if (savedCentralFolderPath) {
            setShowChooseModal(false);
        }
    }, [savedCentralFolderPath]);

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
        if (auth && savedCentralFolderPath) {
            loadTrackedFiles();
        }
    }, [loadTrackedFiles, auth, savedCentralFolderPath]);

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
        if (!auth) {
            setShowLoginModal(true);
            return;
        }
        if (!savedCentralFolderPath) {
            setShowChooseModal(true);
            return;
        }
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

    const onLogoutClick = () => setShowLogoutModal(true);

    const confirmLogout = () => {
        setShowLogoutModal(false);
        handleLogout();
    };

    const cancelLogout = () => setShowLogoutModal(false);

    const handleSettingsClose = () => {
        setShowSettings(false);
    };

    return (
        <div className="flex h-full">
            {auth && savedCentralFolderPath && (
                <aside className="flex flex-1 flex-col justify-between border-r bg-gray-100 pt-12 dark:border-r-gray-700 dark:bg-gray-800">
                    <div>
                        <div className="border-b px-4 py-2 font-bold dark:border-gray-700 dark:text-gray-400">
                            USER
                        </div>
                        <ul>
                            <li className="border-radius mt-6 mr-1 ml-1 rounded-2xl bg-gray-400 px-4 py-2 dark:bg-gray-700 dark:text-gray-200">
                                {provider === "google" ? (
                                    <FontAwesomeIcon
                                        icon={faGoogleDrive}
                                        className="mr-2"
                                    />
                                ) : (
                                    <FontAwesomeIcon
                                        icon={faBox}
                                        className="mr-2"
                                    />
                                )}{" "}
                                {username}
                            </li>
                        </ul>
                    </div>
                    <button
                        className="m-4 cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-violet-800 dark:text-gray-200 dark:hover:bg-violet-700"
                        onClick={onLogoutClick}
                    >
                        Logout
                    </button>
                </aside>
            )}

            {showLogoutModal && (
                <ModalConfirmLogout
                    confirmLogout={confirmLogout}
                    cancelLogout={cancelLogout}
                />
            )}

            <div className="scrollbar flex h-full flex-[4] flex-col overflow-auto pt-12">
                <header className="flex items-center justify-between border-b bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
                    <h1 className="font-bold dark:text-gray-400">DASHBOARD</h1>
                </header>

                <main className="flex-1 bg-white p-6 dark:bg-gray-900">
                    {auth && savedCentralFolderPath && (
                        <div className="mb-6 flex items-center justify-between rounded border px-4 py-2 dark:border-gray-700">
                            <span className="overflow-hidden font-medium text-ellipsis dark:text-gray-400">
                                Central path: {savedCentralFolderPath}
                            </span>
                            <button
                                className="cursor-pointer text-xl text-yellow-500 hover:text-yellow-600"
                                onClick={handleChangeCentralFolder}
                            >
                                <FontAwesomeIcon icon={faRepeat} />
                            </button>
                        </div>
                    )}

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
                    </div>
                    {auth && savedCentralFolderPath && (
                        <button
                            className="fixed right-4 bottom-4 cursor-pointer rounded-full bg-gray-200 p-3 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            onClick={() => setShowSettings(true)}
                        >
                            <FontAwesomeIcon icon={faGear} size="lg" />
                        </button>
                    )}

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
            </div>
            {syncing && <Loading syncing={syncing} />}
            {showSettings && (
                <SettingPopup
                    onClose={handleSettingsClose}
                    provider={provider}
                    loadTrackedFiles={loadTrackedFiles}
                />
            )}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Login
                        providerList={[
                            {
                                id: "google",
                                label: "Google Drive",
                                icon: ggdrive,
                            },
                            {
                                id: "box",
                                label: "Box",
                                icon: box,
                            },
                        ]}
                        onSuccess={handleLoginSuccess}
                    />
                </div>
            )}

            {showChooseModal && !savedCentralFolderPath && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 bg-white">
                    <ChooseCentralFolder
                        username={username}
                        centralFolderPath={centralFolderPath}
                        handleSelectFolder={handleSelectFolder}
                        handleContinue={handleContinue}
                    />
                </div>
            )}
        </div>
    );
};

export default Dashboard;

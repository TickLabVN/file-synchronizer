import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faRepeat,
    faFile,
    faFolder,
    faTrash,
    faGear,
} from "@fortawesome/free-solid-svg-icons";
import { faGoogleDrive } from "@fortawesome/free-brands-svg-icons";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../api";
import ModalConfirmLogout from "@components/ModalConfirmLogout";
import SettingPopup from "@components/SettingPopup";
import Loading from "@components/Loading";

const Dashboard = ({
    username,
    savedCentralFolderPath,
    handleLogout,
    handleChangeCentralFolder,
}) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [stopSyncPaths, setStopSyncPaths] = useState([]);

    useEffect(() => {
        api.getSettings().then(({ stopSyncPaths = [] }) => {
            setStopSyncPaths(stopSyncPaths);
        });
    }, []);

    const handleRemoveStopSync = (p) => {
        const next = stopSyncPaths.filter((x) => x !== p);
        setStopSyncPaths(next);
        api.updateSettings({ stopSyncPaths: next });
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
            const result = await api.syncFiles(paths);
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

    const handleStopSync = async () => {
        const paths = await api.selectStopSyncFiles();
        if (paths) setStopSyncPaths(paths);
    };

    return (
        <div className="flex h-full">
            <aside className="flex flex-1 flex-col justify-between border-r bg-gray-100 pt-12 dark:border-r-gray-700 dark:bg-gray-800">
                <div>
                    <div className="border-b px-4 py-2 font-bold dark:border-gray-700 dark:text-gray-400">
                        USER
                    </div>
                    <ul>
                        <li className="border-radius mt-6 mr-1 ml-1 rounded-2xl bg-gray-400 px-4 py-2 dark:bg-gray-700 dark:text-gray-200">
                            <FontAwesomeIcon icon={faGoogleDrive} />{" "}
                            {username}{" "}
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
                            Sync to Drive
                        </button>

                        <button
                            className="w-48 cursor-pointer rounded bg-yellow-500 py-2 text-white hover:bg-yellow-600 dark:bg-yellow-700 dark:text-gray-200 dark:hover:bg-yellow-800"
                            onClick={handleStopSync}
                        >
                            Choose file to stop sync
                        </button>
                    </div>
                    <button
                        className="fixed right-4 bottom-4 cursor-pointer rounded-full bg-gray-200 p-3 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        onClick={() => setShowSettings(true)}
                    >
                        <FontAwesomeIcon icon={faGear} size="lg" />
                    </button>

                    {stopSyncPaths.length > 0 && (
                        <div className="mt-6">
                            <h2 className="mb-2 text-center text-lg dark:text-gray-400">
                                Stopped Sync Files
                            </h2>
                            <ul className="scrollbar max-h-48 space-y-2 overflow-auto">
                                {stopSyncPaths.map((p) => (
                                    <li
                                        key={p}
                                        className="flex items-center justify-between rounded bg-gray-50 px-4 py-2 dark:bg-gray-700 dark:text-gray-400"
                                    >
                                        <span className="flex-1 truncate">
                                            <FontAwesomeIcon
                                                icon={faFile}
                                                className="mr-2 text-yellow-500"
                                            />
                                            {p}
                                        </span>
                                        <button
                                            onClick={() =>
                                                handleRemoveStopSync(p)
                                            }
                                            className="cursor-pointer text-red-500 hover:text-red-600"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </main>
            </div>
            {syncing && <Loading syncing={syncing} />}
            {showSettings && <SettingPopup onClose={handleSettingsClose} />}
        </div>
    );
};

export default Dashboard;

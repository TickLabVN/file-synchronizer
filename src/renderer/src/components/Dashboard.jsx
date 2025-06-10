import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faStar,
    faFile,
    faFolder,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { faGoogleDrive } from "@fortawesome/free-brands-svg-icons";
import { useState } from "react";
import ModalConfirmLogout from "./ModalConfirmLogout";
import Loading from "./Loading";

const Dashboard = ({ username, savedCentralFolderPath, handleLogout }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const handleChooseFiles = async () => {
        const paths = await window.api.selectFiles();
        if (paths) {
            setSelectedItems((prev) => [
                ...prev,
                ...paths.map((p) => ({ path: p, isDirectory: false })),
            ]);
        }
    };

    const handleChooseFolders = async () => {
        const paths = await window.api.selectFolders();
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
            alert("Please select files or folders to sync.");
            return;
        }
        setSyncing(true);
        try {
            const paths = selectedItems.map((item) => item.path);
            await window.api.syncFiles(paths);
            alert("Sync to Drive completed successfully!");
            setSelectedItems([]);
        } catch (err) {
            console.error(err);
            alert("Sync failed: " + err.message);
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

    return (
        <div className="flex h-screen">
            <aside className="flex w-64 flex-col justify-between border-r bg-gray-100">
                <div>
                    <div className="border-b px-4 py-2 font-semibold">USER</div>
                    <ul>
                        <li className="border-radius mt-6 mr-1 ml-1 rounded-2xl bg-gray-400 px-4 py-2">
                            <FontAwesomeIcon icon={faGoogleDrive} />{" "}
                            {username}{" "}
                        </li>
                    </ul>
                </div>
                <button
                    className="m-4 cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
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

            <div className="flex flex-1 flex-col">
                <header className="flex items-center justify-between border-b bg-white px-4 py-2">
                    <h1 className="font-bold">DASHBOARD</h1>
                </header>

                <main className="flex-1 bg-white p-6">
                    <div className="mb-6 flex items-center justify-between rounded border px-4 py-2">
                        <span className="overflow-hidden font-medium text-ellipsis">
                            Central path: {savedCentralFolderPath}
                        </span>
                        <button className="text-xl text-yellow-500">
                            <FontAwesomeIcon icon={faStar} />
                        </button>
                    </div>

                    <h2 className="mb-4 text-center text-lg">
                        Choose file or folder that you need to backup
                    </h2>

                    {selectedItems.length > 0 && (
                        <ul className="mb-4 max-h-48 space-y-2 overflow-auto">
                            {selectedItems.map(({ path, isDirectory }) => (
                                <li
                                    key={path}
                                    className="flex items-center justify-between rounded bg-gray-50 px-4 py-2"
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
                                className="w-2/3 rounded border border-gray-300 bg-gray-50 px-3 py-2"
                            />
                        </div>
                    )}

                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex space-x-4">
                            <button
                                className="w-40 cursor-pointer rounded bg-blue-500 py-2 text-white hover:bg-blue-600"
                                onClick={handleChooseFiles}
                            >
                                Choose file <FontAwesomeIcon icon={faFile} />
                            </button>
                            <button
                                className="w-40 cursor-pointer rounded bg-blue-500 py-2 text-white hover:bg-blue-600"
                                onClick={handleChooseFolders}
                            >
                                Choose folder{" "}
                                <FontAwesomeIcon icon={faFolder} />
                            </button>
                        </div>
                        <button
                            className="w-40 cursor-pointer rounded bg-green-600 py-2 text-white hover:bg-green-700"
                            onClick={handleSync}
                        >
                            Sync to Drive
                        </button>
                    </div>
                </main>
            </div>
            {syncing && <Loading syncing={syncing} />}
        </div>
    );
};

export default Dashboard;

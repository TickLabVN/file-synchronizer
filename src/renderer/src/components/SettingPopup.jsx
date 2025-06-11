import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import Loading from "./Loading";
import { faFile, faTrash } from "@fortawesome/free-solid-svg-icons";

export default function SettingPopup({ onClose }) {
    const [darkMode, setDarkMode] = useState(false);
    const [autoDeleteOnLaunch, setAutoDeleteOnLaunch] = useState(false);
    const [autoUpdateOnLaunch, setAutoUpdateOnLaunch] = useState(false);
    const [pulling, setPulling] = useState(false);
    const [stopSyncPaths, setStopSyncPaths] = useState([]);

    useEffect(() => {
        window.api
            .getSettings()
            .then(({ darkMode, autoDeleteOnLaunch, autoUpdateOnLaunch }) => {
                setDarkMode(darkMode);
                setAutoDeleteOnLaunch(autoDeleteOnLaunch);
                setAutoUpdateOnLaunch(autoUpdateOnLaunch);
                setStopSyncPaths(stopSyncPaths);
            });
    }, [stopSyncPaths]);

    const toggleDelete = () => {
        const next = !autoDeleteOnLaunch;
        setAutoDeleteOnLaunch(next);
        window.api.updateSettings({ autoDeleteOnLaunch: next });
    };

    const toggleUpdate = () => {
        const next = !autoUpdateOnLaunch;
        setAutoUpdateOnLaunch(next);
        window.api.updateSettings({ autoUpdateOnLaunch: next });
    };

    const toggleDark = () => {
        const next = !darkMode;
        setDarkMode(next);
        window.api.updateSettings({ darkMode: next });
        if (next) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    const handlePullDown = async () => {
        setPulling(true);
        try {
            await window.api.pullFromDrive();
            alert("Pull down completed successfully!");
        } catch (err) {
            console.error(err);
            alert("Pull down failed: " + err.message);
        } finally {
            setPulling(false);
        }
    };

    const handleStopSync = async () => {
        const paths = await window.api.selectStopSyncFiles();
        if (paths) setStopSyncPaths(paths);
    };

    const removeStopSync = (p) => {
        const next = stopSyncPaths.filter((x) => x !== p);
        setStopSyncPaths(next);
        window.api.updateSettings({ stopSyncPaths: next });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 dark:bg-gray-900/50">
            <div className="relative w-80 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <FontAwesomeIcon icon={faCircleXmark} />
                </button>

                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Settings
                </h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-800 dark:text-gray-200">
                            Dark mode
                        </span>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={toggleDark}
                                className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-500"></div>
                            <div className="absolute top-1 left-1 h-4 w-4 rounded-full border border-gray-300 bg-white transition-transform peer-checked:translate-x-5 dark:bg-gray-200"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-gray-800 dark:text-gray-200">
                            Auto delete on launch
                        </span>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={autoDeleteOnLaunch}
                                onChange={toggleDelete}
                                className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-500"></div>
                            <div className="absolute top-1 left-1 h-4 w-4 rounded-full border border-gray-300 bg-white transition-transform peer-checked:translate-x-5 dark:bg-gray-200"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-gray-800 dark:text-gray-200">
                            Auto update on launch
                        </span>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={autoUpdateOnLaunch}
                                onChange={toggleUpdate}
                                className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-500"></div>
                            <div className="absolute top-1 left-1 h-4 w-4 rounded-full border border-gray-300 bg-white transition-transform peer-checked:translate-x-5 dark:bg-gray-200"></div>
                        </label>
                    </div>

                    <button
                        className="w-full cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
                        onClick={handleStopSync}
                    >
                        Choose file to stop sync
                    </button>

                    {stopSyncPaths.length > 0 && (
                        <ul className="scrollbar mt-2 max-h-40 space-y-2 overflow-auto">
                            {stopSyncPaths.map((p) => (
                                <li
                                    key={p}
                                    className="flex items-center justify-between rounded bg-gray-50 px-4 py-1 dark:bg-gray-700 dark:text-gray-400"
                                >
                                    <span className="flex-1 truncate">
                                        <FontAwesomeIcon
                                            icon={faFile}
                                            className="mr-2 text-yellow-500"
                                        />
                                        {p}
                                    </span>
                                    <button
                                        onClick={() => removeStopSync(p)}
                                        className="cursor-pointer text-red-500 hover:text-red-600"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <button
                        className="w-full cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800"
                        onClick={handlePullDown}
                    >
                        Pull down from Drive
                    </button>
                    {pulling && <Loading syncing={true} />}
                </div>
            </div>
        </div>
    );
}

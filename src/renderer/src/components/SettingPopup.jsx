import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";

export default function SettingPopup({ onClose }) {
    const [darkMode, setDarkMode] = useState(false);
    const [autoDeleteOnLaunch, setAutoDeleteOnLaunch] = useState(false);
    const [autoUpdateOnLaunch, setAutoUpdateOnLaunch] = useState(false);

    const handleChooseFile = () => {
        window.api.selectFilesToStopSync();
    };

    const handlePullDown = () => {
        window.api.pullFromDrive();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20">
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
                                onChange={() => setDarkMode(!darkMode)}
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
                                onChange={() =>
                                    setAutoDeleteOnLaunch(!autoDeleteOnLaunch)
                                }
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
                                onChange={() =>
                                    setAutoUpdateOnLaunch(!autoUpdateOnLaunch)
                                }
                                className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-500"></div>
                            <div className="absolute top-1 left-1 h-4 w-4 rounded-full border border-gray-300 bg-white transition-transform peer-checked:translate-x-5 dark:bg-gray-200"></div>
                        </label>
                    </div>

                    <button
                        onClick={handleChooseFile}
                        className="w-full cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    >
                        Choose file to stop sync
                    </button>

                    <button
                        onClick={handlePullDown}
                        className="w-full cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                    >
                        Pull down from Drive
                    </button>
                </div>
            </div>
        </div>
    );
}

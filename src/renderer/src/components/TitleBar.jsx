// TitleBar.jsx
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMaximize,
    faMinimize,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";

export default function TitleBar() {
    const [isMax, setIsMax] = useState(false);

    useEffect(() => {
        window.windowControls.isMaximized().then(setIsMax);
    }, []);

    const onMin = () => window.windowControls.minimize();
    const onMax = () => {
        window.windowControls.maximize();
        setIsMax((prev) => !prev);
    };
    const onClose = () => window.windowControls.close();

    return (
        <div className="flex h-12 items-center justify-between bg-gray-100 text-gray-800 select-none [-webkit-app-region:drag] dark:bg-gray-900 dark:text-gray-100">
            <div className="flex items-center space-x-2 px-2 font-medium">
                <img
                    src="/icon.png"
                    alt="app logo"
                    className="h-5 w-5 object-contain"
                />
                <span className="dark:text-gray-400">File Synchronizer</span>
            </div>
            <div className="flex">
                <button
                    onClick={onMin}
                    className="flex h-6 w-6 items-center justify-center rounded p-6 [-webkit-app-region:no-drag] hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                    —
                </button>
                <button
                    onClick={onMax}
                    className="flex h-6 w-6 items-center justify-center rounded p-6 [-webkit-app-region:no-drag] hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                    {isMax ? (
                        <FontAwesomeIcon icon={faMinimize} />
                    ) : (
                        <FontAwesomeIcon icon={faMaximize} />
                    )}
                </button>
                <button
                    onClick={onClose}
                    className="flex h-6 w-6 items-center justify-center rounded p-6 [-webkit-app-region:no-drag] hover:bg-red-500 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
        </div>
    );
}

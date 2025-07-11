import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useWindowControls from "../hooks/useWindowControls";
import {
    faExpand,
    faCompress,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";

export default function TitleBar(): React.JSX.Element {
    const { isMax, onMin, onMax, onClose } = useWindowControls();

    return (
        <div className="flex h-8 items-center justify-between bg-gray-100 text-gray-800 select-none [-webkit-app-region:drag] dark:bg-gray-900 dark:text-gray-100">
            <div className="ml-auto flex">
                <button
                    onClick={onMin}
                    title="Minimize"
                    className="flex h-4 w-6 items-center justify-center rounded px-6 py-4 [-webkit-app-region:no-drag] hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                    —
                </button>
                <button
                    onClick={onMax}
                    title={isMax ? "Restore Down" : "Maximize"}
                    className="flex h-4 w-6 items-center justify-center rounded px-6 py-4 [-webkit-app-region:no-drag] hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                    {isMax ? (
                        <FontAwesomeIcon icon={faCompress} />
                    ) : (
                        <FontAwesomeIcon icon={faExpand} />
                    )}
                </button>
                <button
                    onClick={onClose}
                    title="Close"
                    className="flex h-4 w-6 items-center justify-center rounded px-6 py-4 [-webkit-app-region:no-drag] hover:bg-red-500 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
        </div>
    );
}

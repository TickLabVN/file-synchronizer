import {
    Pause,
    Play,
    Plus,
    Trash,
    File as FileIcon,
    Folder as FolderIcon,
} from "lucide-react";
import { format } from "date-fns";

const UploadedFile = ({
    handlePullDown,
    trackedFiles,
    stopSyncPaths,
    onToggleStopSync,
    onDeleteTrackedFile,
    onAddClick,
}) => {
    return (
        <div className="rounded-lg border-2 border-dashed p-6 dark:border-gray-600 dark:bg-gray-700">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Uploaded Files</h2>
                <button
                    aria-label="Add files"
                    onClick={onAddClick}
                    className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Pull from cloud */}
            <button
                className="mb-4 w-40 rounded bg-green-600 py-2 text-white hover:bg-green-700 dark:bg-green-800 dark:hover:bg-green-900"
                onClick={handlePullDown}
            >
                Pull from Cloud
            </button>

            {/* List of tracked files */}
            {trackedFiles.length ? (
                <ul className="scrollbar max-h-72 space-y-2 overflow-auto pr-2">
                    {trackedFiles.map(({ src, lastSync, isDirectory }) => (
                        <li
                            key={src}
                            className="flex items-center justify-between rounded bg-gray-50 px-4 py-2 dark:bg-gray-800 dark:text-gray-200"
                        >
                            <span className="flex items-center space-x-2 truncate">
                                {isDirectory ? (
                                    <FolderIcon className="h-4 w-4 text-yellow-500" />
                                ) : (
                                    <FileIcon className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="truncate text-sm">{src}</span>
                            </span>
                            <span className="hidden flex-shrink-0 px-2 text-xs text-gray-500 md:block">
                                {lastSync
                                    ? format(
                                          new Date(lastSync),
                                          "yyyy-MM-dd HH:mm:ss"
                                      )
                                    : "–"}
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => onToggleStopSync(src)}
                                    className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    aria-label="Toggle sync"
                                >
                                    {stopSyncPaths.includes(src) ? (
                                        <Play size={16} />
                                    ) : (
                                        <Pause size={16} />
                                    )}
                                </button>
                                <button
                                    onClick={() => onDeleteTrackedFile(src)}
                                    className="rounded p-1 hover:bg-red-50 dark:hover:bg-red-900"
                                    aria-label="Delete"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No files tracked yet.
                </p>
            )}
        </div>
    );
};

export default UploadedFile;

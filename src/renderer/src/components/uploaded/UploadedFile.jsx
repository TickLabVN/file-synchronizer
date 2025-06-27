import { Pause, Play, Plus, Trash, Folder as FolderIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ggdrive from "@assets/ggdrive.svg";
import box from "@assets/box.svg";
import FileExtIcon from "../FileExtIcon";
const formatBytes = (n) => {
    if (!n) return "";
    const u = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    return `${(n / 1024 ** i).toFixed(i ? 1 : 0)}${u[i]}`;
};
const PROVIDER_ICONS = {
    google: ggdrive,
    box: box,
};

/**
 * Render the list of already‑synced files/folders.
 * Every item now shows:
 *   • name (basename)
 *   • full path (tooltip for overflow)
 *   • cloud provider icon (Drive / Box …)
 *   • username of the account used for the sync
 *   • last‑sync timestamp
 *   • pause/resume + delete icons
 */
export default function UploadedFile({
    handlePullDown,
    trackedFiles,
    stopSyncPaths,
    onToggleStopSync,
    onDeleteTrackedFile,
    onAddClick,
}) {
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
                    {trackedFiles.map((file) => {
                        const {
                            src,
                            lastSync,
                            isDirectory,
                            provider,
                            username,
                            size,
                        } = file;
                        const basename = src.split(/[/\\]/).pop();
                        return (
                            <li
                                key={src}
                                className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800 dark:text-gray-200"
                            >
                                {/* left – toggle */}
                                <button
                                    onClick={() => onToggleStopSync(src)}
                                    aria-label="Toggle"
                                    className="mt-1 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    {stopSyncPaths.includes(src) ? (
                                        <Play size={16} />
                                    ) : (
                                        <Pause size={16} />
                                    )}
                                </button>

                                {/* middle – main info */}
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        {isDirectory ? (
                                            <FolderIcon className="h-4 w-4 text-yellow-500" />
                                        ) : (
                                            <FileExtIcon path={src} size={16} />
                                        )}
                                        <span className="truncate font-medium">
                                            {basename}
                                        </span>
                                    </div>
                                    <p className="truncate text-xs text-gray-500">
                                        {src}
                                        {!isDirectory && size
                                            ? ` • ${formatBytes(size)}`
                                            : ""}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Last sync:{" "}
                                        {lastSync
                                            ? formatDistanceToNow(
                                                  new Date(lastSync),
                                                  { addSuffix: true }
                                              )
                                            : "never"}{" "}
                                        • {username ?? "—"}
                                    </p>
                                </div>

                                {/* right – provider + delete */}
                                {provider && (
                                    <img
                                        src={PROVIDER_ICONS[provider]}
                                        alt={provider}
                                        className="mt-1 h-4 w-4"
                                    />
                                )}
                                <button
                                    onClick={() => onDeleteTrackedFile(src)}
                                    aria-label="Delete"
                                    className="ml-2 rounded p-1 hover:bg-red-50 dark:hover:bg-red-900"
                                >
                                    <Trash size={16} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No files tracked yet.
                </p>
            )}
        </div>
    );
}

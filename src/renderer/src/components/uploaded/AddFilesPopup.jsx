import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "../ui/select";
import {
    Folder as FolderIcon,
    File as FileIcon,
    Upload as UploadIcon,
    Trash,
    ChevronRight,
    ChevronDown,
} from "lucide-react";

import * as api from "../../api";
import FileExtIcon from "../FileExtIcon";

const FileBadge = ({ path }) => <FileExtIcon path={path} size={14} />;

export default function AddFilesPopup({
    open,
    onOpenChange,
    providerType,
    chooseFiles,
    chooseFolder,
    handleUpload,
    selectedItems,
    handleRemove,
}) {
    const [provider, setProvider] = useState(providerType || "google");
    const [expanded, setExpanded] = useState({}); // track folder expand/collapse
    const [dirContents, setDirContents] = useState({});
    const [loadingPath, setLoadingPath] = useState(null);

    const toggleDir = async (p) => {
        setExpanded((prev) => ({ ...prev, [p]: !prev[p] }));
        if (dirContents[p] || loadingPath === p) return; // đã có hoặc đang tải
        try {
            setLoadingPath(p);
            const children = await api.listDirectory(p); // <- IPC
            setDirContents((prev) => ({ ...prev, [p]: children }));
        } finally {
            setLoadingPath(null);
        }
    };

    const renderEntry = (item, depth = 0) => {
        const isDir = item.isDirectory;
        const isExpanded = expanded[item.path];
        const children = dirContents[item.path] ?? [];
        const hasChild = children.length > 0;

        return (
            <li key={item.path} className="flex flex-col">
                {/* Hàng tiêu đề của file / folder */}
                <div
                    className="flex items-start gap-2 rounded bg-gray-50 px-4 py-2 dark:bg-gray-700 dark:text-gray-400"
                    style={{ paddingLeft: depth ? depth * 12 : undefined }}
                >
                    {isDir ? (
                        <>
                            <button
                                onClick={() => toggleDir(item.path)}
                                className="flex-shrink-0"
                                aria-label="Toggle folder"
                            >
                                {isExpanded ? (
                                    <ChevronDown
                                        size={14}
                                        className="text-gray-500"
                                    />
                                ) : (
                                    <ChevronRight
                                        size={14}
                                        className="text-gray-500"
                                    />
                                )}
                            </button>
                            <FolderIcon className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                        </>
                    ) : (
                        <FileBadge path={item.path} />
                    )}

                    <p
                        className="flex-1 text-sm leading-snug break-all"
                        title={item.path}
                    >
                        {item.path.split(/[/\\]/).pop()}
                    </p>

                    {/* Chỉ cho xoá ở cấp đã chọn trực tiếp */}
                    {depth === 0 && (
                        <button
                            onClick={() => handleRemove(item.path)}
                            className="flex-shrink-0 text-red-500 hover:text-red-600"
                            aria-label="Remove"
                        >
                            <Trash size={14} />
                        </button>
                    )}
                </div>

                {/* --- Đệ quy xuống con --- */}
                {isDir && isExpanded && (
                    <ul className="space-y-2">
                        {loadingPath === item.path ? (
                            <li className="pl-6 text-xs text-gray-400 italic">
                                Loading…
                            </li>
                        ) : hasChild ? (
                            children.map((child) =>
                                renderEntry(child, depth + 1)
                            )
                        ) : (
                            <li className="pl-6 text-xs text-gray-400 italic">
                                Empty
                            </li>
                        )}
                    </ul>
                )}
            </li>
        );
    };

    /* ------------------------------------ UI ---------------------------------- */
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-w-md">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl">Add Files</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 p-6 pt-4">
                    {/* Danh sách đã chọn */}
                    {selectedItems.length > 0 && (
                        <ul className="scrollbar mb-4 max-h-48 space-y-2 overflow-auto pr-1">
                            {selectedItems.map((it) => renderEntry(it))}
                        </ul>
                    )}

                    {/* Chọn thư mục */}
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={chooseFolder}
                    >
                        <FolderIcon className="mr-2 h-4 w-4" /> Choose Folder
                    </Button>

                    {/* Chọn file */}
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={chooseFiles}
                    >
                        <FileIcon className="mr-2 h-4 w-4" /> Choose File
                    </Button>

                    {/* Provider */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Cloud Provider
                        </label>
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select provider..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="google">Drive</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <Button className="w-full" onClick={handleUpload}>
                        <UploadIcon className="mr-2 h-4 w-4" /> Upload
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

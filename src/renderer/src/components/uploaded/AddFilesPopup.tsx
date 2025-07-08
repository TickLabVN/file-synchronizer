import { useEffect, useMemo, useState } from "react";
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
    Undo,
} from "lucide-react";

import * as api from "../../api";
import FileExtIcon from "../FileExtIcon";

const FileBadge: React.FC<{ path: string }> = ({ path }) => (
    <FileExtIcon path={path} size={14} />
);
interface FormatBytes {
    (bytes: number): string;
}

const formatBytes: FormatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))}${sizes[i]}`;
};

type AddFilesPopupProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chooseFiles: () => void;
    chooseFolder: () => void;
    handleUpload: (account: { type: string; id: string }) => void;
    selectedItems: Array<{
        path: string;
        isDirectory: boolean;
        size?: number;
    }>;
    handleRemove: (path: string) => void;
    excludedPaths: string[];
    handleExclude: (path: string) => void;
};

export default function AddFilesPopup({
    open,
    onOpenChange,
    chooseFiles,
    chooseFolder,
    handleUpload,
    selectedItems,
    handleRemove,
    excludedPaths,
    handleExclude,
}: AddFilesPopupProps): React.ReactElement | null {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // track folder expand/collapse
    const [dirContents, setDirContents] = useState<
        Record<string, DirectoryEntry[]>
    >({});
    const [loadingPath, setLoadingPath] = useState<string | null>(null);
    const [accountList, setAccountList] = useState<
        Array<{ label: string; value: string }>
    >([]); // [{label,value}]
    const [selected, setSelected] = useState<string | undefined>(undefined);
    const hasAccount = accountList.length > 0;
    const canUpload = hasAccount && selected && selectedItems.length;

    const totalSize = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (item.size || 0), 0);
    }, [selectedItems]);

    const fetchAccounts = async (): Promise<void> => {
        //@ts-ignore: api is defined in preload script
        const gd: Array<{ email: string }> = await api.listAccounts(); // [{email}]
        //@ts-ignore: api is defined in preload script
        const box: Array<{ login: string }> = await api.listBoxAccounts(); // [{login}]
        const list = [
            ...(await Promise.all(
                gd.map(async ({ email }) => {
                    const prof = (await api.getProfile(email)) as {
                        name?: string;
                    } | null;
                    const uname = prof?.name || email.split("@")[0];
                    return {
                        label: `Drive – ${uname}`,
                        value: JSON.stringify({ type: "google", id: email }),
                    };
                })
            )),
            ...(await Promise.all(
                box.map(async ({ login }) => {
                    const prof = (await api.getBoxProfile(login)) as {
                        name?: string;
                    } | null;
                    const uname = prof?.name || login;
                    return {
                        label: `Box – ${uname}`,
                        value: JSON.stringify({ type: "box", id: login }),
                    };
                })
            )),
        ];
        setAccountList(list);
        /* nếu tuỳ chọn hiện tại không còn hợp lệ → reset */
        setSelected(
            (prev) =>
                list.find((a) => a.value === prev)?.value ??
                list[0]?.value ??
                undefined
        );
    };

    /* mở popup → load lại ngay */
    useEffect(() => {
        if (open) fetchAccounts();
    }, [open]);

    /* lắng nghe sự kiện khi CloudProvider thay đổi */
    useEffect(() => {
        window.addEventListener("cloud-accounts-updated", fetchAccounts);
        return () =>
            window.removeEventListener("cloud-accounts-updated", fetchAccounts);
    }, []);

    interface DirectoryEntry {
        path: string;
        isDirectory: boolean;
        size?: number;
    }

    type ExpandedState = Record<string, boolean>;
    type DirContentsState = Record<string, DirectoryEntry[]>;

    const toggleDir = async (p: string): Promise<void> => {
        setExpanded((prev: ExpandedState) => ({ ...prev, [p]: !prev[p] }));
        if (dirContents[p] || loadingPath === p) return; // đã có hoặc đang tải
        try {
            setLoadingPath(p);
            const children = (await api.listDirectory(p)) as DirectoryEntry[]; // <- IPC
            setDirContents((prev: DirContentsState) => ({
                ...prev,
                [p]: children,
            }));
        } finally {
            setLoadingPath(null);
        }
    };
    const renderEntry = (item: DirectoryEntry, depth = 0): React.ReactNode => {
        const isDir = item.isDirectory;
        const isExpanded = expanded[item.path];
        const children = dirContents[item.path] ?? [];
        const hasChild = children.length > 0;
        const isExcluded = excludedPaths.includes(item.path);

        const indentStyle = depth ? { paddingLeft: depth * 12 } : undefined;
        const rowClasses = isExcluded ? "opacity-50 line-through" : "";

        return (
            <li key={item.path} className="flex flex-col">
                {/* Hàng tiêu đề của file / folder */}
                <div
                    className={`flex items-start gap-2 rounded bg-gray-50 px-4 py-2 dark:bg-gray-700 dark:text-gray-400 ${rowClasses}`}
                    style={indentStyle}
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
                    {depth === 0 ? (
                        <button
                            onClick={() => handleRemove(item.path)}
                            className="flex-shrink-0 text-red-500 hover:text-red-600"
                            aria-label="Remove"
                        >
                            <Trash size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleExclude(item.path)}
                            className="flex-shrink-0 text-red-500 hover:text-red-600"
                            aria-label={isExcluded ? "Undo exclude" : "Exclude"}
                        >
                            {isExcluded ? (
                                <Undo size={14} />
                            ) : (
                                <Trash size={14} />
                            )}
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
                        <>
                            <ul className="scrollbar mb-2 max-h-48 space-y-2 overflow-auto pr-1">
                                {selectedItems.map((it) => renderEntry(it))}
                            </ul>
                            {/* 👉 Hiển thị tổng dung lượng */}
                            <p className="mb-4 text-right text-xs text-gray-500 dark:text-gray-400">
                                Total size:{" "}
                                <span className="font-medium">
                                    {formatBytes(totalSize)}
                                </span>
                            </p>
                        </>
                    )}

                    {/* Chọn thư mục */}
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={chooseFolder}
                        disabled={!hasAccount}
                    >
                        <FolderIcon className="mr-2 h-4 w-4" /> Choose Folder
                    </Button>

                    {/* Chọn file */}
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={chooseFiles}
                        disabled={!hasAccount}
                    >
                        <FileIcon className="mr-2 h-4 w-4" /> Choose File
                    </Button>

                    {/* Provider */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Cloud account
                        </label>
                        <Select value={selected} onValueChange={setSelected}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn tài khoản…" />
                            </SelectTrigger>
                            <SelectContent>
                                {hasAccount ? (
                                    accountList.map((acc) => (
                                        <SelectItem
                                            key={acc.value}
                                            value={acc.value}
                                        >
                                            {acc.label}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                                        No cloud accounts connected.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <Button
                        disabled={!canUpload}
                        className="w-full"
                        onClick={() => {
                            if (selected) {
                                handleUpload(JSON.parse(selected));
                                onOpenChange(false);
                            }
                        }}
                    >
                        <UploadIcon className="mr-2 h-4 w-4" /> Upload
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

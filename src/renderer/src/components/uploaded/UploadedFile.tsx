import {
    Pause,
    Play,
    Plus,
    Trash,
    Folder as FolderIcon,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import ggdrive from "@assets/ggdrive.svg";
import box from "@assets/box.svg";
import FileExtIcon from "../FileExtIcon";
import * as api from "../../api";

//@ts-ignore: api is a global object injected by the backend
const openInExplorer = (path: string): void => api.openInExplorer(path);

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
interface FormatBytes {
    (n: number | null | undefined): string;
}

const formatBytes: FormatBytes = (n) => {
    if (n == null) return "";
    if (n === 0) return "0B";
    const u = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    return `${(n / 1024 ** i).toFixed(i ? 1 : 0)}${u[i]}`;
};

const pickSize = (raw: Record<string, unknown> = {}): number =>
    Number(
        (
            raw as {
                size?: number;
                bytes?: number;
                byteSize?: number;
                fileSize?: number;
            }
        ).size ??
            (raw as { bytes?: number }).bytes ??
            (raw as { byteSize?: number }).byteSize ??
            (raw as { fileSize?: number }).fileSize ??
            0
    );

const PROVIDER_ICONS = {
    google: ggdrive,
    box: box,
};

function propagateMeta(
    node: TreeNode,
    parentProvider: unknown,
    parentUsername: unknown
): void {
    if (!node.provider) node.provider = parentProvider as string | undefined;
    if (!node.username) node.username = parentUsername as string | undefined;
    if (node.children) {
        Object.values(node.children).forEach((child) =>
            propagateMeta(child, node.provider, node.username)
        );
    }
}

function aggregateSize(node: {
    isDirectory?: boolean;
    children?: Record<string, unknown>;
    size?: number;
    raw?: Record<string, unknown>;
}): number {
    if (node.isDirectory) {
        if (node.children) {
            let total = 0;
            for (const child of Object.values(node.children)) {
                total += aggregateSize(
                    child as {
                        isDirectory?: boolean;
                        children?: Record<string, unknown>;
                        size?: number;
                        raw?: Record<string, unknown>;
                    }
                );
            }
            node.size = total;
            return total;
        }
        node.size = 0;
        return 0;
    }
    node.size = Number(node.size ?? pickSize(node.raw));
    return node.size;
}

const isWin = navigator?.userAgent.includes("Windows");
const SEP = isWin ? "\\" : "/";
// Define a type for tracked file items
interface TrackedFileItem {
    src: string;
    name?: string;
    path?: string;
    isDirectory?: boolean;
    provider?: string;
    username?: string;
    size?: number;
    bytes?: number;
    byteSize?: number;
    fileSize?: number;
    lastSync?: string;
    [key: string]: unknown;
}

// Define a type for tree nodes
interface TreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    provider?: string;
    username?: string;
    size?: number;
    lastSync?: string;
    raw?: Record<string, unknown>;
    children?: Record<string, TreeNode>;
}

function buildTree(list: TrackedFileItem[]): Record<string, TreeNode> {
    const root: { children?: Record<string, TreeNode> } = {};
    for (const item of list) {
        const hasLeadingSep = !isWin && item.src.startsWith(SEP);
        const parts = item.src.split(/[/\\]/).filter(Boolean);
        let cur: { children?: Record<string, TreeNode> } = root;
        let acc = "";
        parts.forEach((seg, idx) => {
            const prefix = idx === 0 && hasLeadingSep ? SEP : acc ? SEP : "";
            acc += prefix + seg;
            cur.children ??= {};
            if (!cur.children[seg]) {
                cur.children[seg] = {
                    name: seg,
                    path: acc,
                    isDirectory: idx < parts.length - 1 || !!item.isDirectory,
                    provider: item.provider,
                    username: item.username,
                    size:
                        idx === parts.length - 1
                            ? Number(
                                  item.size ??
                                      item.bytes ??
                                      item.byteSize ??
                                      item.fileSize ??
                                      0
                              )
                            : undefined,
                    lastSync:
                        idx === parts.length - 1 ? item.lastSync : undefined,
                    raw: idx === parts.length - 1 ? { ...item } : undefined,
                };
            } else {
                if (!cur.children[seg].provider)
                    cur.children[seg].provider = item.provider;
                if (!cur.children[seg].username)
                    cur.children[seg].username = item.username;
            }

            cur = cur.children[seg];
        });
    }
    if (root.children) {
        Object.values(root.children).forEach((n) =>
            propagateMeta(n, n.provider, n.username)
        );
    }

    return root.children ?? {};
}

function flattenUntrackedRoots(
    nodes: Record<string, TreeNode>
): Record<string, TreeNode> {
    const result = {};
    interface FlattenedTreeNode {
        path: string;
        raw?: Record<string, unknown>;
        children?: Record<string, TreeNode>;
        [key: string]: unknown;
    }

    type FlattenedTreeResult = Record<string, FlattenedTreeNode>;

    const lift = (node: FlattenedTreeNode): void => {
        if (node.raw || !node.children) {
            (result as FlattenedTreeResult)[node.path] = node;
        } else {
            Object.values(node.children).forEach((child) =>
                lift(child as unknown as FlattenedTreeNode)
            );
        }
    };
    (Object.values(nodes) as unknown as FlattenedTreeNode[]).forEach(lift);
    return result;
}

function compressPath(node: TreeNode): TreeNode {
    let cur = node;
    while (
        cur.isDirectory &&
        cur.children &&
        Object.keys(cur.children).length === 1 &&
        !cur.raw
    ) {
        const key = Object.keys(cur.children)[0];
        const child = cur.children[key];
        if (!child.provider) child.provider = cur.provider;
        if (!child.username) child.username = cur.username;
        cur = child;
    }
    return cur;
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */
type UploadedFileProps = {
    handlePullDown: () => void;
    trackedFiles: TrackedFileItem[];
    stopSyncPaths: string[];
    onToggleStopSync: (path: string) => void;
    onDeleteTrackedFile: (file: {
        src: string;
        provider?: string;
        username?: string;
    }) => void;
    onAddClick: () => void;
    filterAccount?: { type: string; username: string };
    hasCloud?: boolean;
    resumeSyncPaths?: string[];
};

export default function UploadedFile({
    handlePullDown,
    trackedFiles,
    stopSyncPaths,
    onToggleStopSync,
    onDeleteTrackedFile,
    onAddClick,
    filterAccount,
    hasCloud = false,
    resumeSyncPaths = [],
}: UploadedFileProps): React.ReactElement {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [, forceRerender] = useState(0);
    useEffect(() => {
        const id = setInterval(() => forceRerender((n) => n + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    const tree = useMemo(() => {
        const rawRoot = buildTree(trackedFiles);
        if (rawRoot) {
            Object.values(rawRoot).forEach(aggregateSize);
        }

        if (filterAccount) {
            for (const k of Object.keys(rawRoot)) {
                const filtered = filterTree(rawRoot[k], filterAccount);
                if (filtered) rawRoot[k] = filtered;
                else delete rawRoot[k];
            }
        }

        return flattenUntrackedRoots(rawRoot);
    }, [trackedFiles, filterAccount]);

    interface ExpandedState {
        [path: string]: boolean;
    }

    const toggle = (p: string): void =>
        setExpanded((prev: ExpandedState) => ({ ...prev, [p]: !prev[p] }));

    interface RenderNodeProps {
        name: string;
        path: string;
        isDirectory: boolean;
        children?: Record<string, TreeNode>;
        size?: number;
        lastSync?: string;
        provider?: string;
        username?: string;
    }

    const renderNode = (
        orig: TreeNode,
        depth: number = 0
    ): React.ReactElement => {
        const node: RenderNodeProps = compressPath(orig);
        const {
            name,
            path,
            isDirectory,
            children,
            size,
            lastSync,
            provider,
            username,
        } = node;
        const indent: React.CSSProperties = { paddingLeft: depth * 14 };
        const isStopped: boolean =
            stopSyncPaths.some((p) => path === p || path.startsWith(p + SEP)) &&
            !resumeSyncPaths.some(
                (r) => path === r || path.startsWith(r + SEP)
            );
        const Icon: React.ElementType = isDirectory
            ? FolderIcon
            : () => <FileExtIcon path={path} size={16} />;

        return (
            <li key={path} className="flex flex-col">
                {}
                <div
                    className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800 dark:text-gray-200"
                    style={indent}
                >
                    {}
                    <button
                        onClick={() => onToggleStopSync(path)}
                        aria-label="Toggle"
                        className="mt-1 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        {isStopped ? <Play size={16} /> : <Pause size={16} />}
                    </button>

                    {}
                    {isDirectory ? (
                        <button
                            onClick={() => toggle(path)}
                            className="mt-1 flex-shrink-0 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label="Expand / collapse"
                        >
                            {expanded[path] ? (
                                <ChevronDown size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}

                    {}
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <Icon
                                className={
                                    isDirectory ? "h-4 w-4 text-yellow-500" : ""
                                }
                            />
                            <span className="truncate font-medium">{name}</span>
                            {}
                            {size != null && (
                                <span className="ml-2 text-xs whitespace-nowrap text-gray-500">
                                    {formatBytes(size)}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => openInExplorer(path)}
                            title="Open in Explorer"
                            className="truncate text-xs text-blue-600 hover:underline focus:outline-none"
                        >
                            {path}
                        </button>
                        <p className="text-xs text-gray-500">
                            {lastSync
                                ? `Last sync ${formatDistanceToNow(
                                      new Date(lastSync),
                                      {
                                          addSuffix: true,
                                      }
                                  )}`
                                : "Never synced"}
                            {" • "}
                            {username ?? "—"}
                        </p>
                    </div>

                    {}
                    {provider && (
                        <img
                            src={
                                PROVIDER_ICONS[
                                    provider as keyof typeof PROVIDER_ICONS
                                ]
                            }
                            alt={provider}
                            className="mt-1 h-4 w-4"
                        />
                    )}
                    <button
                        onClick={() =>
                            onDeleteTrackedFile({
                                src: path,
                                provider,
                                username,
                            })
                        }
                        aria-label="Delete"
                        className="ml-2 rounded p-1 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                        <Trash size={16} />
                    </button>
                </div>

                {}
                {isDirectory && expanded[path] && children && (
                    <ul className="space-y-2">
                        {Object.values(children).map((c) =>
                            renderNode(c, depth + 1)
                        )}
                    </ul>
                )}
            </li>
        );
    };

    /* ------------------------------- Render UI ----------------------------- */
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
                disabled={!hasCloud}
            >
                Pull from Cloud
            </button>

            {/* File list */}
            {Object.keys(tree).length ? (
                <ul className="scrollbar max-h-[30vw] space-y-2 overflow-auto pr-2">
                    {Object.values(tree).map((n) => renderNode(n))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No files tracked yet.
                </p>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------ */
function filterTree(
    node: TreeNode,
    filter: { type: string; username: string }
): TreeNode | null {
    if (!filter) return node;

    const keptChildren: Record<string, TreeNode> = {};
    if (node.children) {
        Object.entries(node.children).forEach(([key, child]) => {
            const kept = filterTree(child, filter);
            if (kept) keptChildren[key] = kept;
        });
    }

    const hasKeptChild = Object.keys(keptChildren).length > 0;
    const matchSelf =
        node.provider === filter.type && node.username === filter.username;

    if (matchSelf || hasKeptChild) {
        const next = { ...node };
        if (hasKeptChild) next.children = keptChildren;
        else delete next.children;

        next.provider = filter.type;
        next.username = filter.username;

        return next;
    }
    return null;
}

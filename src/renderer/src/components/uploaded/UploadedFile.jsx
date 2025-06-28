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
import { useMemo, useState } from "react";
import ggdrive from "@assets/ggdrive.svg";
import box from "@assets/box.svg";
import FileExtIcon from "../FileExtIcon";
import * as api from "../../api";

const openInExplorer = (path) => api.openInExplorer(path);

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
const formatBytes = (n) => {
    if (n == null) return "";
    if (n === 0) return "0B";
    const u = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    return `${(n / 1024 ** i).toFixed(i ? 1 : 0)}${u[i]}`;
};

// --- NEW: helper để lấy dung lượng từ node.raw với nhiều key khác nhau ----
const pickSize = (raw = {}) =>
    Number(
        raw.size ?? raw.bytes ?? raw.byteSize ?? raw.fileSize ?? 0 // fallback
    );

const PROVIDER_ICONS = {
    google: ggdrive,
    box: box,
};

// UploadedFile.jsx
function propagateMeta(node, parentProvider, parentUsername) {
    // nếu thiếu thì thừa kế của cha
    if (!node.provider) node.provider = parentProvider;
    if (!node.username) node.username = parentUsername;
    if (node.children) {
        Object.values(node.children).forEach((child) =>
            propagateMeta(child, node.provider, node.username)
        );
    }
}
// --- FIX: aggregateSize giờ sẽ gắn đúng size cho cả file & folder ---------
function aggregateSize(node) {
    if (node.isDirectory) {
        let total = 0;
        if (node.children) {
            for (const child of Object.values(node.children)) {
                total += aggregateSize(child);
            }
        }
        if (total === 0 && node.size != null) return node.size;
        node.size = total;
        return total;
    }

    // File: lấy size từ chính node hoặc từ raw, đảm bảo là number
    node.size = Number(node.size ?? pickSize(node.raw));
    return node.size;
}
/**
 * Duyệt danh sách path đã theo dõi → dựng cây thư mục lồng nhau
 *   root.children = {
 *      "C:": { name, path, isDirectory, children: { ... } },
 *      ...
 *   }
 */
const isWin = navigator?.userAgent.includes("Windows");
const SEP = isWin ? "\\" : "/";
function buildTree(list) {
    const root = {};
    for (const item of list) {
        const parts = item.src.split(/[/\\]/);
        let cur = root;
        let acc = ""; // path tích luỹ
        parts.forEach((seg, idx) => {
            acc += (acc ? SEP : "") + seg;
            cur.children ??= {};
            if (!cur.children[seg]) {
                cur.children[seg] = {
                    name: seg,
                    path: acc,
                    isDirectory: idx < parts.length - 1 || item.isDirectory,
                    provider: item.provider,
                    username: item.username,
                    // --- FIX: đảm bảo leaf node nào cũng có size nếu có ---
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
                    raw:
                        idx === parts.length - 1
                            ? { ...item } // lưu cả object gốc để lấy thông tin sau
                            : undefined,
                };
            } else {
                // node đã tồn tại → bổ sung thông tin còn khuyết
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

/**
 * ⚡️ Quan trọng
 * Khi một node KHÔNG phải folder/file được track (raw === undefined)
 *     ⇒ kéo toàn bộ con của nó lên cùng cấp
 * Kết quả: chỉ những mục người dùng thực sự theo dõi (raw) mới xuất hiện ở
 * root của danh sách, đúng với mong muốn “Test” thay vì “Downloads/Test”.
 */
function flattenUntrackedRoots(nodes) {
    const result = {};
    const lift = (node) => {
        if (node.raw || !node.children) {
            // node được track (hoặc file lẻ) → giữ nguyên
            result[node.path] = node;
        } else {
            // node cha không được track → đẩy con lên
            Object.values(node.children).forEach(lift);
        }
    };
    Object.values(nodes).forEach(lift);
    return result;
}

/**
 * Ẩn bớt các nhánh dài chỉ có một con – giống như VSCode tree view
 */
function compressPath(node) {
    let cur = node;
    while (
        cur.isDirectory &&
        cur.children &&
        Object.keys(cur.children).length === 1 &&
        !cur.raw // đừng bỏ qua node gốc được track
    ) {
        const key = Object.keys(cur.children)[0];
        const child = cur.children[key];
        // ⭐ Thừa kế metadata nếu con còn thiếu
        if (!child.provider) child.provider = cur.provider;
        if (!child.username) child.username = cur.username;
        cur = child;
    }
    return cur;
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */
export default function UploadedFile({
    handlePullDown,
    trackedFiles,
    stopSyncPaths,
    onToggleStopSync,
    onDeleteTrackedFile,
    onAddClick,
    filterAccount,
    hasCloud = false,
}) {
    const [expanded, setExpanded] = useState({});

    /* --------------------- Chuẩn hoá dữ liệu để render --------------------- */
    const tree = useMemo(() => {
        // 1) dựng cây đầy đủ
        const rawRoot = buildTree(trackedFiles);
        if (rawRoot) {
            Object.values(rawRoot).forEach(aggregateSize);
        }

        // 2) nếu lọc cloud → cắt bỏ nhánh không khớp
        if (filterAccount) {
            for (const k of Object.keys(rawRoot)) {
                const filtered = filterTree(rawRoot[k], filterAccount);
                if (filtered)
                    rawRoot[k] = filtered; // chỉ giữ lại phần đã lọc
                else delete rawRoot[k];
            }
        }

        // 3) đẩy các node KHÔNG được track ra khỏi cấp gốc
        return flattenUntrackedRoots(rawRoot);
    }, [trackedFiles, filterAccount]);

    const toggle = (p) => setExpanded((prev) => ({ ...prev, [p]: !prev[p] }));

    /* -------------------------- UI – render 1 node ------------------------- */
    const renderNode = (orig, depth = 0) => {
        const node = compressPath(orig);
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
        const indent = { paddingLeft: depth * 14 };
        const isStopped = stopSyncPaths.some(
            (p) => path === p || path.startsWith(p + SEP)
        );
        const Icon = isDirectory
            ? FolderIcon
            : () => <FileExtIcon path={path} size={16} />;

        return (
            <li key={path} className="flex flex-col">
                {/* ── Hàng chính ─────────────────────────────────────────── */}
                <div
                    className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800 dark:text-gray-200"
                    style={indent}
                >
                    {/* pause / resume */}
                    <button
                        onClick={() => onToggleStopSync(path)}
                        aria-label="Toggle"
                        className="mt-1 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        {isStopped ? <Play size={16} /> : <Pause size={16} />}
                    </button>

                    {/* chevron */}
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

                    {/* icon + tên file/folder */}
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <Icon
                                className={
                                    isDirectory ? "h-4 w-4 text-yellow-500" : ""
                                }
                            />
                            <span className="truncate font-medium">{name}</span>
                            {/* --- size giờ luôn có mặt nếu có dữ liệu --- */}
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

                    {/* provider icon + delete */}
                    {provider && (
                        <img
                            src={PROVIDER_ICONS[provider]}
                            alt={provider}
                            className="mt-1 h-4 w-4"
                        />
                    )}
                    <button
                        onClick={() => onDeleteTrackedFile(path)}
                        aria-label="Delete"
                        className="ml-2 rounded p-1 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                        <Trash size={16} />
                    </button>
                </div>

                {/* ── Render con nếu là folder và đang expand ──────────────── */}
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
function filterTree(node, filter) {
    if (!filter) return node;

    // --- 1. Lọc children trước --------------------------------------------
    const keptChildren = {};
    if (node.children) {
        Object.entries(node.children).forEach(([key, child]) => {
            const kept = filterTree(child, filter);
            if (kept) keptChildren[key] = kept;
        });
    }

    const hasKeptChild = Object.keys(keptChildren).length > 0;
    const matchSelf =
        node.provider === filter.type && node.username === filter.username;

    // --- 2. Giữ node nếu bản thân khớp *hoặc* có con khớp ------------------
    if (matchSelf || hasKeptChild) {
        const next = { ...node };
        if (hasKeptChild) next.children = keptChildren;
        else delete next.children; // gọn gàng khi không có con

        // Bảo đảm metadata đúng để icon hiển thị chuẩn
        next.provider = filter.type;
        next.username = filter.username;

        return next;
    }
    return null;
}

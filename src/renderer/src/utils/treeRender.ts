import { isWin, SEP } from "@/lib/constants";

export const pickSize = (raw: Record<string, unknown> = {}): number =>
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

function propagateMeta(node: TreeNode, parentProvider: unknown, parentUsername: unknown): void {
  if (!node.provider) node.provider = parentProvider as string | undefined;
  if (!node.username) node.username = parentUsername as string | undefined;
  if (node.children) {
    Object.values(node.children).forEach((child) => propagateMeta(child, node.provider, node.username));
  }
}

export function aggregateSize(node: {
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
// Define a type for tracked file items
export interface TrackedFileItem {
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
export interface TreeNode {
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

export function buildTree(list: TrackedFileItem[]): Record<string, TreeNode> {
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
              ? Number(item.size ?? item.bytes ?? item.byteSize ?? item.fileSize ?? 0)
              : undefined,
          lastSync: idx === parts.length - 1 ? item.lastSync : undefined,
          raw: idx === parts.length - 1 ? { ...item } : undefined,
        };
      } else {
        if (!cur.children[seg].provider) cur.children[seg].provider = item.provider;
        if (!cur.children[seg].username) cur.children[seg].username = item.username;
      }

      cur = cur.children[seg];
    });
  }
  if (root.children) {
    Object.values(root.children).forEach((n) => propagateMeta(n, n.provider, n.username));
  }

  return root.children ?? {};
}

export function flattenUntrackedRoots(nodes: Record<string, TreeNode>): Record<string, TreeNode> {
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
      Object.values(node.children).forEach((child) => lift(child as unknown as FlattenedTreeNode));
    }
  };
  (Object.values(nodes) as unknown as FlattenedTreeNode[]).forEach(lift);
  return result;
}

export function compressPath(node: TreeNode): TreeNode {
  let cur = node;
  while (cur.isDirectory && cur.children && Object.keys(cur.children).length === 1 && !cur.raw) {
    const key = Object.keys(cur.children)[0];
    const child = cur.children[key];
    if (!child.provider) child.provider = cur.provider;
    if (!child.username) child.username = cur.username;
    cur = child;
  }
  return cur;
}

export function filterTree(node: TreeNode, filter: { type: string; username: string }): TreeNode | null {
  if (!filter) return node;

  const keptChildren: Record<string, TreeNode> = {};
  if (node.children) {
    Object.entries(node.children).forEach(([key, child]) => {
      const kept = filterTree(child, filter);
      if (kept) keptChildren[key] = kept;
    });
  }

  const hasKeptChild = Object.keys(keptChildren).length > 0;
  const matchSelf = node.provider === filter.type && node.username === filter.username;

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

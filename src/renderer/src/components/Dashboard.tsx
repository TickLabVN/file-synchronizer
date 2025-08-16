import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../api";
import Loading from "./Loading";
import Header from "./Header";
import CloudProvider from "./cloud/CloudProvider";
import UploadedFile from "./uploaded/UploadedFile";
import AddFilesPopup from "./uploaded/AddFilesPopup";
import type { Entry, TrackedFiles } from "@/types/entry.type";
import type { AccountInfo } from "@/types/account.type";
import { SEP } from "@/lib/constants";
import { mergeUnique, pruneExcluded } from "@/utils/path";
import type { SyncResult } from "@/types/sync.type";
import type { TrackedFileItem } from "@/utils/treeRender";

interface DashboardProps {
  auth: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ auth }) => {
  const [syncing, setSyncing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Entry[]>([]);
  const [stopSyncPaths, setStopSyncPaths] = useState<string[]>([]);
  const [resumeSyncPaths, setResumeSyncPaths] = useState<string[]>([]);
  const [trackedFiles, setTrackedFiles] = useState<TrackedFiles[]>([]);
  const [pulling, setPulling] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [excludedPaths, setExcludedPaths] = useState<string[]>([]);
  const [filterAccount, setFilterAccount] = useState<AccountInfo>();
  const [removedAccounts, setRemovedAccounts] = useState<AccountInfo[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<AccountInfo[]>([]);

  const displayedFiles = trackedFiles
    .filter((f) => !removedAccounts.some((a) => a.provider === f.provider && a.displayName === f.username))
    .map((file) => ({ ...file, src: file.path || file.name || "" })) as TrackedFileItem[];

  interface HandleExclude {
    (p: string): void;
  }

  const handleExclude: HandleExclude = useCallback(
    (p: string) =>
      setExcludedPaths((prev: string[]) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])),
    []
  );

  const handlePullDown = async (): Promise<void> => {
    if (cloudAccounts.length === 0) {
      toast.error("No cloud account connected.");
      return;
    }
    setPulling(true);
    try {
      for (const acc of cloudAccounts) {
        await api.useAccount(acc.provider, acc.id);
        await api.pull(acc.provider);
      }
      await loadTrackedFiles();
      toast.success("Pull down successful!");
    } catch (err) {
      console.error(err);
      toast.error(
        "Failed to pull: " +
          (err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : "Unknown error")
      );
    } finally {
      setPulling(false);
    }
  };

  const refreshStopLists = useCallback(async () => {
    try {
      const { stopSyncPaths = [], resumeSyncPaths = [] } = (await api.getSettings()) as {
        stopSyncPaths?: string[];
        resumeSyncPaths?: string[];
      };

      const compress = (list: string[]): string[] => {
        const sorted = [...list].filter((p) => !resumeSyncPaths.includes(p)).sort((a, b) => a.length - b.length);
        const res: string[] = [];
        for (const p of sorted) {
          if (!res.some((r) => p.startsWith(r + SEP))) res.push(p);
        }
        return res;
      };

      setStopSyncPaths(compress(stopSyncPaths));
      setResumeSyncPaths(resumeSyncPaths);
    } catch (err) {
      console.error("[refreshStopLists]", err);
    }
  }, []);

  useEffect(() => {
    refreshStopLists();
  }, [refreshStopLists]);

  const loadTrackedFiles = useCallback(async () => {
    try {
      const flatten = (arr: Array<Record<string, TrackedFiles>>): TrackedFiles[] =>
        arr.flatMap((m) => (m ? Object.values(m) : []));

      const [driveMap, boxMap] = await Promise.all([api.trackedFile("google"), api.trackedFile("box")]);

      setTrackedFiles([
        ...flatten(driveMap as Array<Record<string, TrackedFiles>>),
        ...flatten(boxMap as Array<Record<string, TrackedFiles>>),
      ]);
    } catch (err) {
      console.error("Failed to load tracked files", err);
      toast.error("Failed to load tracked files: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }, []);

  useEffect(() => {
    if (auth) {
      loadTrackedFiles();
    }
  }, [loadTrackedFiles, auth]);

  useEffect(() => {
    const handler = (): void => {
      loadTrackedFiles();
      refreshStopLists();
    };
    api.onTrackedFilesUpdated(handler);
  }, [loadTrackedFiles, refreshStopLists]);

  useEffect(() => {
    const cb = (): unknown => refreshStopLists();
    window.electron.ipcRenderer.on("app:settings-updated", cb);
    return () => window.electron.ipcRenderer.removeListener("app:settings-updated", cb);
  }, [refreshStopLists]);

  const handleDeleteTrackedFile = async (file: {
    src: string;
    provider?: string;
    username?: string;
  }): Promise<void> => {
    toast.info("Deleting tracked file...");
    try {
      const provider = file.provider ?? "";
      const username = file.username ?? "";
      const acc: AccountInfo | undefined = cloudAccounts.find(
        (a: AccountInfo) => a.provider === provider && (a.displayName === username || a.id === username)
      );
      const accountId: string = acc ? acc.id : username;

      await api.useAccount(provider, accountId);
      await api.deleteTrackedFile(provider, file.src);

      toast.success("Tracked file deleted successfully!");
      loadTrackedFiles();
      refreshStopLists();
    } catch (err) {
      console.error("Failed to delete tracked file", err);
      toast.error(
        "Failed to delete tracked file: " +
          (err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : "Unknown error")
      );
    }
  };

  interface IsActuallyStopped {
    (p: string): boolean;
  }

  const isActuallyStopped: IsActuallyStopped = (p: string): boolean =>
    stopSyncPaths.some((s: string) => p === s || p.startsWith(s + SEP)) &&
    !resumeSyncPaths.some((r: string) => p === r || p.startsWith(r + SEP));

  interface HandleToggleStopSync {
    (p: string): void;
  }

  const handleToggleStopSync: HandleToggleStopSync = (p: string) => {
    const isExactInStop: boolean = stopSyncPaths.includes(p);
    const isBlockedByAnc: boolean = isActuallyStopped(p) && !isExactInStop;
    const nextStop: string[] = [...stopSyncPaths];
    const nextResume: string[] = [...resumeSyncPaths];

    if (isExactInStop) {
      for (let i = nextStop.length - 1; i >= 0; i--) if (nextStop[i] === p) nextStop.splice(i, 1);
      for (let i = nextResume.length - 1; i >= 0; i--)
        if (nextResume[i] === p || nextResume[i].startsWith(p + SEP)) nextResume.splice(i, 1);
      toast.success("Resumed sync for " + p);
    } else if (isBlockedByAnc) {
      if (!nextResume.includes(p)) nextResume.push(p);
      toast.success("Resumed sync for " + p);
    } else {
      const coveredByParent: boolean = nextStop.some((s: string) => s !== p && p.startsWith(s + SEP));
      if (!coveredByParent) {
        for (let i = nextStop.length - 1; i >= 0; i--) {
          if (nextStop[i].startsWith(p + SEP)) nextStop.splice(i, 1);
        }
        nextStop.push(p);
      }

      for (let i = nextResume.length - 1; i >= 0; i--)
        if (nextResume[i] === p || nextResume[i].startsWith(p + SEP)) nextResume.splice(i, 1);
      toast.success("Stopped sync for " + p);
    }

    setStopSyncPaths(nextStop);
    setResumeSyncPaths(nextResume);
    api.setSettings({
      stopSyncPaths: nextStop,
      resumeSyncPaths: nextResume,
    });
  };

  const handleChooseFiles = async (): Promise<void> => {
    const items = await api.selectFiles();
    if (Array.isArray(items) && items.length > 0) {
      setSelectedItems((prev) => mergeUnique(prev, items));
      setExcludedPaths((prev) => pruneExcluded(prev, items));
    }
  };

  const handleChooseFolders = async (): Promise<void> => {
    const items = await api.selectFolders();
    if (Array.isArray(items) && items.length > 0) {
      setSelectedItems((prev) => mergeUnique(prev, items));
    }
  };

  interface HandleRemove {
    (p: string): void;
  }

  const handleRemove: HandleRemove = (p: string): void => {
    setSelectedItems((prev) => prev.filter((item) => item.path !== p));
    setExcludedPaths((prev) => prev.filter((x) => !x.startsWith(p)));
  };

  interface SyncTarget {
    type: string;
    id: string;
    username: string;
  }

  const handleSync = async (target: SyncTarget): Promise<void> => {
    if (!selectedItems.length) {
      toast.error("Please select files or folders to sync.");
      return;
    }
    if (!target) {
      toast.error("Please select a target account to sync.");
      return;
    }
    setSyncing(true);
    try {
      await api.useAccount(target.type, target.id);

      // B2: upload
      const payload: { paths: string[]; exclude: string[] } = {
        paths: selectedItems.map((it) => it.path),
        exclude: excludedPaths,
      };
      const result: SyncResult = await api.syncFiles(target.type, payload);
      if (result.success) {
        toast.success("All files synced successfully!");
        setSelectedItems([]);
        setExcludedPaths([]);
      } else {
        const failedPaths = result.failed ? [result.failed.path] : [];
        toast.error(`${failedPaths.length} file(s) failed to sync. Please check and try again.`);
        setSelectedItems((prev) => prev.filter((item) => failedPaths.includes(item.path)));
      }
      loadTrackedFiles();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        "Sync failed: " +
          (err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : "Unknown error")
      );
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    interface CloudAccountEventDetail {
      type: string;
      username: string;
    }

    const onRemoved = (e: Event): void => {
      const { type, username } = ((e as CustomEvent<CloudAccountEventDetail>).detail || {}) as CloudAccountEventDetail;
      setRemovedAccounts((prev) => [...prev, { provider: type, displayName: username, id: "", type: type }]);
      loadTrackedFiles();
    };

    interface CloudAccountEventDetail {
      type: string;
      username: string;
    }

    const onAdded = (e: Event): void => {
      const { type, username } = (e as CustomEvent<CloudAccountEventDetail>).detail || {};
      setRemovedAccounts((prev) => prev.filter((x) => !(x.provider === type && x.displayName === username)));
      loadTrackedFiles();
    };

    window.addEventListener("cloud-account-removed", onRemoved);
    window.addEventListener("cloud-account-added", onAdded);
    return () => {
      window.removeEventListener("cloud-account-removed", onRemoved);
      window.removeEventListener("cloud-account-added", onAdded);
    };
  }, [loadTrackedFiles]);

  const refreshCloudAccounts = useCallback(async () => {
    const drive: AccountInfo[] = await api.listAccounts("google");
    const google = await Promise.all(
      drive.map(async ({ id, displayName }) => {
        return {
          provider: "google",
          id: id, // khóa tra token
          displayName: displayName || id.split("@")[0],
        };
      })
    );

    const box: AccountInfo[] = await api.listAccounts("box");
    const boxAcc = await Promise.all(
      box.map(async ({ id, displayName }) => {
        const profile = await api.getProfile("box", id);
        return {
          provider: "box",
          id: id, // khóa tra token
          displayName: displayName || (profile ? profile.displayName : id),
        };
      })
    );

    setCloudAccounts([...google, ...boxAcc]);
  }, []);

  useEffect(() => {
    refreshCloudAccounts();
    window.addEventListener("cloud-accounts-updated", refreshCloudAccounts);
    return () => window.removeEventListener("cloud-accounts-updated", refreshCloudAccounts);
  }, [refreshCloudAccounts]);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex flex-1 bg-white dark:bg-gray-900">
        <main className="flex-1 overflow-auto p-6">
          <UploadedFile
            handlePullDown={handlePullDown}
            trackedFiles={displayedFiles}
            stopSyncPaths={stopSyncPaths}
            onToggleStopSync={handleToggleStopSync}
            onDeleteTrackedFile={handleDeleteTrackedFile}
            onAddClick={() => setShowAddPopup(true)}
            filterAccount={filterAccount}
            hasCloud={cloudAccounts.length > 0}
            resumeSyncPaths={resumeSyncPaths}
          />
        </main>
        <aside className="w-80 border-l border-gray-200 p-6 dark:border-gray-700">
          <CloudProvider onFilterChange={(filter) => setFilterAccount(filter ?? undefined)} />
        </aside>
      </div>
      {pulling && <Loading syncing={true} />}
      {syncing && <Loading syncing={syncing} />}
      <AddFilesPopup
        open={showAddPopup}
        onOpenChange={setShowAddPopup}
        chooseFiles={handleChooseFiles}
        chooseFolder={handleChooseFolders}
        handleUpload={async (account: { type: string; id: string }) => {
          const acc = cloudAccounts.find((a) => a.provider === account.type && a.id === account.id);
          if (acc) {
            await handleSync({ type: acc.provider, id: acc.id, username: acc.displayName || acc.id });
          } else {
            toast.error("Selected account not found.");
          }
        }}
        selectedItems={selectedItems}
        handleRemove={handleRemove}
        excludedPaths={excludedPaths}
        handleExclude={handleExclude}
      />
    </div>
  );
};

export default Dashboard;

import { Button } from "../ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import Login from "../Login";
import ModalConfirmDelete from "./ModalConfirmLogout";
import ggdrive from "@assets/ggdrive.svg";
import box from "@assets/box.svg";
import * as api from "../../api";

const PROVIDER_OPTIONS = [
  { id: "google", label: "Google Drive", icon: ggdrive },
  { id: "box", label: "Box", icon: box },
];

import type { ReactElement } from "react";
import type { AccountInfo } from "@/types/account.type";

interface CloudProviderProps {
  onFilterChange?: (filter: AccountInfo | null) => void;
}

interface HandleCardClickArg {
  provider: string; // "google" | "box" | "dropbox" | ...
  id: string; // email, login, userId...
  displayName?: string; // user's display name
  icon?: string; // URL to the icon image
  label?: string; // user-friendly label for the account
}

export default function CloudProvider({ onFilterChange }: CloudProviderProps): ReactElement {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [picked, setPicked] = useState<string>("");
  const [connected, setConnected] = useState<AccountInfo[]>([]);
  const [delTarget, setDelTarget] = useState<AccountInfo | null>(null);
  const [activeFilter, setActiveFilter] = useState<AccountInfo | null>(null);

  const handleCardClick = (acc: HandleCardClickArg): void => {
    const same = activeFilter && activeFilter.provider === acc.provider && activeFilter.id === acc.id;
    const next = same ? null : acc;
    setActiveFilter(next);
    onFilterChange?.(next);
  };

  useEffect(() => {
    let alive = true;
    const loadAccounts = async (): Promise<void> => {
      const list: AccountInfo[] = [];

      const gd: AccountInfo[] = await api.listAccounts("google");
      await Promise.allSettled(
        gd.map(async ({ id, displayName }) => {
          const uname = displayName ?? id.split("@")[0];
          list.push({
            provider: "google",
            id: id,
            icon: ggdrive,
            displayName: uname,
            label: `Drive – ${uname}`,
          });
        })
      );

      const bx: AccountInfo[] = await api.listAccounts("box");
      await Promise.allSettled(
        bx.map(async ({ id, displayName }) => {
          const uname = displayName ?? id;
          list.push({
            provider: "box",
            id: id,
            icon: box,
            displayName: uname,
            label: `Box – ${uname}`,
          });
        })
      );

      if (alive) setConnected(list);
    };

    loadAccounts();
    window.addEventListener("cloud-accounts-updated", loadAccounts);
    return () => {
      alive = false;
      window.removeEventListener("cloud-accounts-updated", loadAccounts);
    };
  }, []);

  const handleLoginSuccess = async (type: string, accountId: string, username?: string): Promise<void> => {
    const option = PROVIDER_OPTIONS.find((o) => o.id === type);
    if (!option) {
      console.error("Invalid provider type:", type);
      return;
    }
    const existing = connected.find((c) => c.provider === type && c.id === accountId);
    if (existing) {
      console.warn("Account already connected:", accountId);
      setShowLoginModal(false);
      setPicked("");
      return;
    }
    const uname: string = username || accountId.split("@")[0];
    const providerLabel: string = type === "google" ? "Drive" : "Box";
    const newAccount: AccountInfo = {
      provider: type,
      id: accountId,
      icon: option.icon,
      displayName: uname,
      label: `${providerLabel} – ${uname}`,
    };
    const next: AccountInfo[] = [...connected, newAccount];
    setConnected(next);

    window.dispatchEvent(new CustomEvent("cloud-accounts-updated"));
    window.dispatchEvent(
      new CustomEvent("cloud-account-added", {
        detail: { type, username: uname },
      })
    );

    await api.useAccount(type, accountId);

    setShowLoginModal(false);
    setPicked("");
  };

  const handleDelete = async (): Promise<void> => {
    if (!delTarget) return;
    try {
      await api.signOut(delTarget.provider, delTarget.id);
    } catch (e) {
      console.error("Revoke token fail", e);
    }

    const next = connected.filter((p) => !(p.provider === delTarget.provider && p.id === delTarget.id));
    setConnected(next);
    if (activeFilter && activeFilter.provider === delTarget.provider && activeFilter.id === delTarget.id) {
      setActiveFilter(null);
      onFilterChange?.(null);
    }
    window.dispatchEvent(new CustomEvent("cloud-accounts-updated"));
    window.dispatchEvent(new CustomEvent("cloud-account-removed", { detail: delTarget }));
    setDelTarget(null);
  };

  return (
    <Card className="w-full max-w-sm rounded-lg border-2 border-dashed dark:border-gray-600 dark:bg-gray-700">
      <CardHeader>
        <CardTitle>Cloud Providers</CardTitle>
      </CardHeader>

      <CardFooter className="flex-col gap-2">
        <Button className="w-full" onClick={() => setShowLoginModal(true)}>
          <Plus /> Add Cloud Provider
        </Button>
      </CardFooter>

      <div className="flex flex-col gap-2 px-6">
        {connected.map((c) => {
          return (
            <div
              key={`${c.provider}-${c.id}`}
              onClick={() => handleCardClick(c)}
              className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 dark:border-gray-600 ${
                activeFilter && activeFilter.provider === c.provider && activeFilter.id === c.id
                  ? "ring-2 ring-blue-500"
                  : "border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <img src={c.icon} alt="" className="h-5 w-5" />
                <div className="flex flex-col">
                  <span className="font-medium">{c.label}</span>
                </div>
              </div>
              <Trash
                size={16}
                className="text-destructive cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDelTarget(c);
                }}
              />
            </div>
          );
        })}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Login
            providerList={PROVIDER_OPTIONS}
            cloud={picked}
            handleCloudChoose={setPicked}
            onSuccess={handleLoginSuccess}
            onClose={() => {
              setShowLoginModal(false);
              setPicked("");
            }}
          />
        </div>
      )}

      {delTarget && <ModalConfirmDelete confirmDelete={handleDelete} cancelDelete={() => setDelTarget(null)} />}
    </Card>
  );
}

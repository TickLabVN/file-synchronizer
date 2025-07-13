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
interface CloudAccount {
    type: string;
    accountId: string;
    icon: string;
    username: string;
    label: string;
}

interface CloudProviderProps {
    onFilterChange?: (filter: CloudAccount | null) => void;
}

export default function CloudProvider({
    onFilterChange,
}: CloudProviderProps): ReactElement {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [picked, setPicked] = useState<string>(""); // radio in Login
    const [connected, setConnected] = useState<CloudAccount[]>([]); // [{type,accountId,...}]
    const [delTarget, setDelTarget] = useState<CloudAccount | null>(null); // card đang xoá
    const [activeFilter, setActiveFilter] = useState<CloudAccount | null>(null);
    interface HandleCardClickArg {
        type: string;
        accountId: string;
        icon: string;
        username: string;
        label: string;
    }

    const handleCardClick = (acc: HandleCardClickArg): void => {
        const same =
            activeFilter &&
            activeFilter.type === acc.type &&
            activeFilter.accountId === acc.accountId;
        const next = same ? null : acc; // bỏ chọn nếu bấm lại
        setActiveFilter(next);
        onFilterChange?.(next); // báo cho Dashboard
    };

    /* ---------- Khôi phục thẻ đã lưu ---------- */
    useEffect(() => {
        let alive = true;
        const loadAccounts = async (): Promise<void> => {
            const list: CloudAccount[] = [];

            /* ---------- GOOGLE ---------- */
            // @ts-ignore: api.listAccounts is a custom function
            const gd = await api.listAccounts().catch(() => []); // luôn trả mảng
            await Promise.allSettled(
                gd.map(async ({ id, displayName }) => {
                    try {
                        await api.useAccount(id);
                    } catch (e) {
                        console.warn("[Google] useAccount fail:", e);
                    }
                    const uname = displayName ?? id.split("@")[0];
                    list.push({
                        type: "google",
                        accountId: id,
                        icon: ggdrive,
                        username: uname,
                        label: `Drive – ${uname}`,
                    });
                })
            );

            /* ---------- BOX ---------- */
            // @ts-ignore: api.listAccounts is a custom function
            const bx = await api.listBoxAccounts().catch(() => []);
            await Promise.allSettled(
                bx.map(async ({ id, displayName }: { login: string }) => {
                    try {
                        await api.useBoxAccount(id);
                    } catch (e) {
                        console.warn("[Box] useBoxAccount fail:", e);
                    }
                    const uname = displayName ?? id;
                    list.push({
                        type: "box",
                        accountId: id,
                        icon: box,
                        username: uname,
                        label: `Box – ${uname}`,
                    });
                })
            );

            if (alive) setConnected(list);
        };

        // nạp lần đầu + khi có sự kiện bên ngoài
        loadAccounts();
        window.addEventListener("cloud-accounts-updated", loadAccounts);
        return () => {
            alive = false;
            window.removeEventListener("cloud-accounts-updated", loadAccounts);
        };
    }, []);

    const handleLoginSuccess = async (
        type: string,
        accountId: string,
        username?: string
    ): Promise<void> => {
        const option = PROVIDER_OPTIONS.find((o) => o.id === type);
        if (!option) {
            console.error("Invalid provider type:", type);
            return;
        }
        const existing = connected.find(
            (c) => c.type === type && c.accountId === accountId
        );
        if (existing) {
            console.warn("Account already connected:", accountId);
            setShowLoginModal(false);
            setPicked("");
            return;
        }
        const uname: string = username || accountId.split("@")[0];
        const providerLabel: string = type === "google" ? "Drive" : "Box";
        const newAccount: CloudAccount = {
            type,
            accountId,
            icon: option.icon,
            username: uname,
            label: `${providerLabel} – ${uname}`,
        };
        const next: CloudAccount[] = [...connected, newAccount];
        setConnected(next);

        window.dispatchEvent(new CustomEvent("cloud-accounts-updated"));
        window.dispatchEvent(
            new CustomEvent("cloud-account-added", {
                detail: { type, username: uname },
            })
        );

        if (type === "google") await api.useAccount(accountId);
        else await api.useBoxAccount(accountId);

        setShowLoginModal(false);
        setPicked("");
    };

    /* ---------- Xoá tài khoản ---------- */
    const handleDelete = async (): Promise<void> => {
        if (!delTarget) return;
        try {
            if (delTarget.type === "google")
                await api.signOut(delTarget.accountId);
            else await api.boxSignOut(delTarget.accountId);
        } catch (e) {
            console.error("Revoke token fail", e);
        }

        const next = connected.filter(
            (p) =>
                !(
                    p.type === delTarget.type &&
                    p.accountId === delTarget.accountId
                )
        );
        setConnected(next);
        if (
            activeFilter &&
            activeFilter.type === delTarget.type &&
            activeFilter.accountId === delTarget.accountId
        ) {
            setActiveFilter(null);
            onFilterChange?.(null);
        }
        window.dispatchEvent(new CustomEvent("cloud-accounts-updated"));
        window.dispatchEvent(
            new CustomEvent("cloud-account-removed", { detail: delTarget })
        );
        setDelTarget(null);
    };

    return (
        <Card className="w-full max-w-sm rounded-lg border-2 border-dashed dark:border-gray-600 dark:bg-gray-700">
            <CardHeader>
                <CardTitle>Cloud Providers</CardTitle>
            </CardHeader>

            <CardFooter className="flex-col gap-2">
                <Button
                    className="w-full"
                    onClick={() => setShowLoginModal(true)}
                >
                    <Plus /> Add Cloud Provider
                </Button>
            </CardFooter>

            <div className="flex flex-col gap-2 px-6">
                {connected.map((c) => {
                    return (
                        <div
                            key={`${c.type}-${c.accountId}`}
                            onClick={() => handleCardClick(c)}
                            className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 dark:border-gray-600 ${
                                activeFilter &&
                                activeFilter.type === c.type &&
                                activeFilter.accountId === c.accountId
                                    ? "ring-2 ring-blue-500"
                                    : "border-gray-300"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <img src={c.icon} alt="" className="h-5 w-5" />
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {c.label}
                                    </span>
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

            {delTarget && (
                <ModalConfirmDelete
                    confirmDelete={handleDelete}
                    cancelDelete={() => setDelTarget(null)}
                />
            )}
        </Card>
    );
}

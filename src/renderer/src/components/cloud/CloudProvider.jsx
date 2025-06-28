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

export default function CloudProvider({ onFilterChange }) {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [picked, setPicked] = useState(""); // radio in Login
    const [connected, setConnected] = useState([]); // [{type,accountId,...}]
    const [delTarget, setDelTarget] = useState(null); // card đang xoá
    const [activeFilter, setActiveFilter] = useState(null);
    const handleCardClick = (acc) => {
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
        const loadAccounts = async () => {
            const list = [];

            /* ---------- GOOGLE ---------- */
            const gd = await api.listAccounts().catch(() => []); // luôn trả mảng
            await Promise.allSettled(
                gd.map(async ({ email }) => {
                    try {
                        await api.useAccount(email);
                    } catch (e) {
                        console.warn("[Google] useAccount fail:", e);
                    }
                    let prof = null;
                    try {
                        prof = await api.getProfile(email);
                    } catch (e) {
                        console.warn("[Google] getProfile fail:", e);
                    }
                    const uname = prof?.name || email.split("@")[0];
                    list.push({
                        type: "google",
                        accountId: email,
                        icon: ggdrive,
                        username: uname,
                        label: `Drive – ${uname}`,
                    });
                })
            );

            /* ---------- BOX ---------- */
            const bx = await api.listBoxAccounts().catch(() => []);
            await Promise.allSettled(
                bx.map(async ({ login }) => {
                    try {
                        await api.useBoxAccount(login);
                    } catch (e) {
                        console.warn("[Box] useBoxAccount fail:", e);
                    }
                    let prof = null;
                    try {
                        prof = await api.getBoxProfile();
                    } catch (e) {
                        console.warn("[Box] getBoxProfile fail:", e);
                    }
                    const uname = prof?.name || login;
                    list.push({
                        type: "box",
                        accountId: login,
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

    /* ---------- Login thành công ---------- */
    const handleLoginSuccess = async (type, accountId, username) => {
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
        const uname = username || accountId.split("@")[0];
        const providerLabel = type === "google" ? "Drive" : "Box";
        const newAccount = {
            type,
            accountId,
            icon: option.icon,
            username: uname,
            label: `${providerLabel} – ${uname}`,
        };
        const next = [...connected, newAccount];
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
    const handleDelete = async () => {
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

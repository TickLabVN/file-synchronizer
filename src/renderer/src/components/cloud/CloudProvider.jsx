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

export default function CloudProvider() {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [picked, setPicked] = useState(""); // radio in Login
    const [connected, setConnected] = useState([]); // [{type,accountId,...}]
    const [delTarget, setDelTarget] = useState(null); // card đang xoá

    /* ---------- Khôi phục thẻ đã lưu ---------- */
    useEffect(() => {
        (async () => {
            const list = [];

            const gd = await api.listAccounts(); // [{email}]
            for (const { email } of gd) {
                await api.useAccount(email);
                const prof = await api.getProfile(email); // { name, email }
                const uname = prof?.name || email.split("@")[0];
                list.push({
                    type: "google",
                    accountId: email,
                    icon: ggdrive,
                    username: uname,
                    label: `Drive – ${uname}`,
                });
            }

            const bx = await api.listBoxAccounts(); // [{login}]
            for (const { login } of bx) {
                await api.useBoxAccount(login);
                const prof = await api.getBoxProfile(); // { name, login }
                const uname = prof?.name || login;
                list.push({
                    type: "box",
                    accountId: login,
                    icon: box,
                    username: uname,
                    label: `Box – ${uname}`,
                });
            }

            setConnected(list);
        })();
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
        const newAccount = {
            type,
            accountId,
            label: option.label,
            icon: option.icon,
            username: username || accountId,
        };
        const next = [...connected, newAccount];
        setConnected(next);

        window.dispatchEvent(new CustomEvent("cloud-accounts-updated"));

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
        window.dispatchEvent(new CustomEvent("cloud-accounts-updated"));
        setDelTarget(null);
    };

    return (
        <Card className="w-full max-w-sm">
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
                            className="flex items-center justify-between rounded-md border px-3 py-2"
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

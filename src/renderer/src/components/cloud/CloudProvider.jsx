import { Button } from "../ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import Login from "../Login";
import ggdrive from "@assets/ggdrive.svg";
import box from "@assets/box.svg";
import * as api from "../../api";
import ModalConfirmDelete from "./ModalConfirmLogout";
const PROVIDER_OPTIONS = [
    { id: "google", label: "Google Drive", icon: ggdrive },
    { id: "box", label: "Box", icon: box },
];
export default function CloudProvider() {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [cloud, setCloud] = useState("");
    const [connected, setConnected] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cloudID, setCloudID] = useState("");
    const onDeleteClick = (id) => {
        setCloudID(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        setShowDeleteModal(false);
        handleRemoveProvider(cloudID);
    };

    const cancelDelete = () => setShowDeleteModal(false);

    useEffect(() => {
        async function restoreProviders() {
            const restored = [];

            // Google Drive
            const gdTokens = await api.getTokens();
            if (gdTokens?.access_token) {
                const username = await api.getGDUserName();
                restored.push({
                    id: "google",
                    label: "Google Drive",
                    icon: ggdrive,
                    username,
                });
            }

            // Box
            const boxTokens = await api.getBoxTokens();
            if (boxTokens?.access_token) {
                const username = await api.getBoxUserName();
                restored.push({
                    id: "box",
                    label: "Box",
                    icon: box,
                    username,
                });
            }

            setConnected(restored);
        }

        restoreProviders();
    }, []);

    const handleCloudChoose = (id) => {
        setCloud(id);
    };
    const handleLoginSuccess = (id, username) => {
        const option = PROVIDER_OPTIONS.find((p) => p.id === id);
        if (!option) return;

        setConnected((prev) => {
            const exists = prev.some((p) => p.id === id);
            if (exists) {
                return prev.map((p) => (p.id === id ? { ...p, username } : p));
            }
            return [...prev, { ...option, username }];
        });

        setShowLoginModal(false);
        setCloud("");
    };

    const handleRemoveProvider = async (id) => {
        try {
            if (id === "google") await api.signOut();
            if (id === "box") await api.boxSignOut();
        } catch (e) {
            console.error("Token revoke failed", e);
        }

        setConnected((prev) => prev.filter((p) => p.id !== id));
        if (cloud === id) setCloud("");
    };
    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Cloud Providers</CardTitle>
            </CardHeader>

            <CardFooter className="flex-col gap-2">
                <Button
                    type="submit"
                    className="w-full"
                    onClick={() => setShowLoginModal(true)}
                >
                    <Plus /> Add Cloud Provider
                </Button>
            </CardFooter>
            <div className="flex flex-col gap-2 px-6">
                {connected.map((p) => (
                    <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                        <div className="flex items-center gap-2">
                            <img src={p.icon} alt="" className="h-5 w-5" />
                            <div className="flex flex-col">
                                <span className="font-medium">{p.label}</span>
                                <span className="text-muted-foreground text-xs">
                                    {p.username}
                                </span>
                            </div>
                        </div>
                        <Trash
                            size={16}
                            className="text-destructive cursor-pointer"
                            onClick={() => onDeleteClick(p.id)}
                        />
                    </div>
                ))}
            </div>
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Login
                        providerList={PROVIDER_OPTIONS}
                        onSuccess={handleLoginSuccess}
                        onClose={() => {
                            setShowLoginModal(false);
                            setCloud("");
                        }}
                        cloud={cloud}
                        handleCloudChoose={handleCloudChoose}
                    />
                </div>
            )}
            {showDeleteModal && (
                <ModalConfirmDelete
                    cancelDelete={cancelDelete}
                    confirmDelete={confirmDelete}
                />
            )}
        </Card>
    );
}

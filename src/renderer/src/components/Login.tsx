import { useState } from "react";
import * as api from "../api";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import type { AccountInfo } from "../types/account";
type Provider = {
    id: string;
    label: string;
    icon: string;
};

type LoginProps = {
    providerList: Provider[];
    onSuccess: (id: string, accountId: string, username: string) => void;
    onClose?: () => void;
    cloud: string;
    handleCloudChoose: (id: string) => void;
};

const Login: React.FC<LoginProps> = ({
    providerList,
    onSuccess,
    onClose,
    cloud,
    handleCloudChoose,
}) => {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async (id: string): Promise<void> => {
        if (!id) {
            toast.error("Please choose a cloud provider first!");
            setError("No cloud provider selected");
            return;
        }
        setStatus("loading");
        setError(null);
        try {
            const result: AccountInfo =
                id === "google"
                    ? ((await api.signIn()) as AccountInfo)
                    : ((await api.boxSignIn()) as AccountInfo);

            const accountId = result.id;
            const username = result.displayName ?? accountId;

            if (!accountId) throw new Error("No account identifier returned");

            onSuccess(id, accountId, username);
            setStatus("success");
        } catch (err: unknown) {
            console.error(err);
            setError(
                (err instanceof Error ? err.message : String(err)) ||
                    "An error occurred during sign-in"
            );
            setStatus("error");
        }
    };

    return (
        <div className="relative w-80 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-2 right-2 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            )}
            <h2 className="mb-4 text-xl">Sign in to cloud</h2>
            <ul className="space-y-3">
                {providerList.map(({ id, label, icon }) => {
                    const isSelected = cloud === id;
                    return (
                        <li key={id}>
                            <button
                                onClick={() => handleCloudChoose(id)}
                                disabled={status === "loading"}
                                className={`flex w-full cursor-pointer items-center rounded border px-4 py-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-600 ${
                                    isSelected
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                }`}
                            >
                                <img
                                    src={icon}
                                    alt={`${label} icon`}
                                    className="mr-2 h-6 w-6"
                                />
                                <span>{label}</span>
                            </button>
                        </li>
                    );
                })}
                <li>
                    <button
                        onClick={() => handleSignIn(cloud)}
                        disabled={!cloud || status === "loading"}
                        className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {status === "loading" ? "Signing in..." : "Sign In"}
                    </button>
                </li>
            </ul>
            {status === "error" && (
                <p className="mt-2 text-red-500">Error: {error}</p>
            )}
        </div>
    );
};

export default Login;

import { useEffect, useState } from "react";
import Loading from "./components/Loading";
import Dashboard from "./components/Dashboard";
import TitleBar from "./components/TitleBar";
import { toast, ToastContainer } from "react-toastify";
import * as api from "./api";

const App: React.FC = () => {
    const [auth, setAuth] = useState(false);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [provider, setProvider] = useState<{
        type: string;
        accountId: string;
    } | null>(null);

    useEffect(() => {
        async function init(): Promise<void> {
            try {
                const gdAccounts = (await api.listAccounts()) as {
                    email: string;
                }[]; // [{email}]
                const boxAccounts = (await api.listBoxAccounts()) as {
                    login: string;
                }[]; // [{login}]

                if (gdAccounts.length) {
                    const { email } = gdAccounts[0];
                    await api.useAccount(email);
                    setProvider({ type: "google", accountId: email });
                    const prof = (await api.getProfile(email)) as {
                        name?: string;
                    };
                    setUsername(prof?.name || email);
                    setAuth(true);
                } else if (boxAccounts.length) {
                    const { login } = boxAccounts[0];
                    await api.useBoxAccount(login);
                    setProvider({ type: "box", accountId: login });
                    const prof = (await api.getBoxProfile(login)) as {
                        name?: string;
                    };
                    setUsername(prof?.name || login);
                    setAuth(true);
                }
            } catch (err) {
                console.error("Init error:", err);
                if (err instanceof Error) {
                    toast.error(
                        "Failed to initialize application: " +
                            (err.message || "Unknown error")
                    );
                } else {
                    toast.error(
                        "Failed to initialize application: Unknown error"
                    );
                }
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (api.onUpdateAvailable) {
            api.onUpdateAvailable(
                (info: { version: string; releaseNotes?: string }) => {
                    console.log("Update available:", info);
                    setUpdating(true);
                }
            );
        } else {
            console.warn("onUpdateAvailable is not defined in API");
        }
        if (api.onUpdateDownloaded) {
            api.onUpdateDownloaded(
                (info: { version: string; releaseNotes?: string }) => {
                    console.log("Update downloaded:", info);
                    setUpdating(false);
                }
            );
        } else {
            console.warn("onUpdateDownloaded is not defined in API");
        }
    }, []);

    useEffect(() => {
        //@ts-ignore: window.electron is defined in preload script
        if (!window?.electron?.ipcRenderer) return;
        const onToast = (_: unknown, msg: string): void => void toast.info(msg);
        //@ts-ignore: window.electron is defined in preload script
        window.electron.ipcRenderer.on("app:toast", onToast);
        return () =>
            //@ts-ignore: window.electron is defined in preload script
            window.electron.ipcRenderer.removeListener("app:toast", onToast);
    }, []);

    useEffect(() => {
        //@ts-ignore: window.electron is defined in preload script
        if (!window?.electron?.ipcRenderer) return;
        const handler = (
            _: unknown,
            data: { type: string; accountId: string } | null
        ): void => {
            setProvider(data); // {type, accountId} | null
            if (!data) return setUsername("");

            if (data.type === "google") {
                //@ts-ignore: window.electron is defined in preload script
                api.getProfile(data.accountId).then((p) =>
                    setUsername(p?.name || data.accountId)
                );
            } else {
                //@ts-ignore: window.electron is defined in preload script
                api.getBoxProfile(data.accountId).then((p: { name?: string }) =>
                    setUsername(p?.name || data.accountId)
                );
            }
        };
        //@ts-ignore: window.electron is defined in preload script
        window.electron.ipcRenderer.on("ui:set-active-provider", handler);
        return () =>
            //@ts-ignore: window.electron is defined in preload script
            window.electron.ipcRenderer.removeListener(
                "ui:set-active-provider",
                handler
            );
    }, []);

    return (
        <>
            <ToastContainer
                position="bottom-left"
                autoClose={5000}
                pauseOnFocusLoss={false}
            />
            <div className="flex h-screen flex-col overflow-hidden">
                <div className="z-10">
                    <TitleBar />
                </div>
                <div className="flex-1 overflow-auto">
                    {loading || updating ? (
                        <Loading updating={updating} />
                    ) : (
                        <Dashboard
                            auth={auth}
                            provider={provider}
                            username={username}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default App;

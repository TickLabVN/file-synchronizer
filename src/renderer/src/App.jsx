import { useEffect, useState } from "react";
import Loading from "@components/Loading";
import Dashboard from "@components/Dashboard";
import TitleBar from "@components/TitleBar";
import { toast, ToastContainer } from "react-toastify";
import * as api from "./api";

const App = () => {
    const [auth, setAuth] = useState(false);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [provider, setProvider] = useState("");

    useEffect(() => {
        async function init() {
            try {
                const gdAccounts = await api.listAccounts(); // [{email}]
                const boxAccounts = await api.listBoxAccounts(); // [{login}]

                if (gdAccounts.length) {
                    const { email } = gdAccounts[0];
                    await api.useAccount(email);
                    setProvider({ type: "google", accountId: email });
                    const prof = await api.getProfile(email);
                    setUsername(prof?.name || email);
                    setAuth(true);
                } else if (boxAccounts.length) {
                    const { login } = boxAccounts[0];
                    await api.useBoxAccount(login);
                    setProvider({ type: "box", accountId: login });
                    const prof = await api.getBoxProfile();
                    setUsername(prof?.name || login);
                    setAuth(true);
                }
            } catch (err) {
                console.error("Init error:", err);
                toast.error(
                    "Failed to initialize application: " +
                        (err.message || "Unknown error")
                );
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (api.onUpdateAvailable) {
            api.onUpdateAvailable((info) => {
                console.log("Update available:", info);
                setUpdating(true);
            });
        } else {
            console.warn("onUpdateAvailable is not defined in API");
        }
        if (api.onUpdateDownloaded) {
            api.onUpdateDownloaded((info) => {
                console.log("Update downloaded:", info);
                setUpdating(false);
            });
        } else {
            console.warn("onUpdateDownloaded is not defined in API");
        }
    }, []);

    useEffect(() => {
        if (!window?.electron?.ipcRenderer) return;
        const onToast = (_, msg) => toast.info(msg, { toastId: msg });
        window.electron.ipcRenderer.on("app:toast", onToast);
        return () =>
            window.electron.ipcRenderer.removeListener("app:toast", onToast);
    }, []);

    useEffect(() => {
        if (!window?.electron?.ipcRenderer) return;
        const handler = (_, data) => {
            setProvider(data); // {type, accountId} | null
            if (!data) return setUsername("");

            if (data.type === "google") {
                api.getProfile(data.accountId).then((p) =>
                    setUsername(p?.name || data.accountId)
                );
            } else {
                api.getBoxProfile().then((p) =>
                    setUsername(p?.name || data.accountId)
                );
            }
        };
        window.electron.ipcRenderer.on("ui:set-active-provider", handler);
        return () =>
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
                            username={username}
                            provider={provider}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default App;

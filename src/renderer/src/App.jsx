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
                const tokens = await api.getTokens();
                if (tokens?.access_token) {
                    setAuth(true);
                    const name = await api.getGDUserName();
                    if (name) setUsername(name);
                    setProvider("google");
                } else {
                    const boxTokens = await api.getBoxTokens();
                    if (boxTokens?.access_token) {
                        setAuth(true);
                        const name = await api.getBoxUserName();
                        if (name) setUsername(name);
                        setProvider("box");
                    }
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

    const handleLogout = async () => {
        try {
            if (provider === "google") {
                await api.signOut();
            } else if (provider === "box") {
                await api.boxSignOut();
            }
            setAuth(false);
            setUsername("");
            window.location.reload();
        } catch (err) {
            console.error("Logout error:", err);
            toast.error(
                "Failed to log out: " + (err.message || "Unknown error")
            );
        }
    };

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
                            handleLogout={handleLogout}
                            handleLoginSuccess={(id, name) => {
                                setAuth(true);
                                setProvider(id);
                                setUsername(name);
                            }}
                            provider={provider}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default App;

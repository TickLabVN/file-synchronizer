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
    const [centralFolderPath, setCentralFolderPath] = useState("");
    const [savedCentralFolderPath, setSavedCentralFolderPath] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        async function init() {
            try {
                const tokens = await api.getTokens();
                if (tokens?.access_token) {
                    setAuth(true);
                    const name = await api.getGDUserName();
                    if (name) setUsername(name);
                }
                api.getCentralFolderConfig().then((stored) => {
                    if (stored) {
                        setSavedCentralFolderPath(stored);
                    }
                });
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

    const handleSelectFolder = async () => {
        try {
            const path = await api.selectCentralFolder();
            if (path) {
                setCentralFolderPath(path);
            }
        } catch (err) {
            console.error("Select folder error:", err);
            toast.error(
                "Failed to select central folder: " +
                    (err.message || "Unknown error")
            );
        }
    };

    const handleContinue = async () => {
        try {
            if (centralFolderPath) {
                await api.saveCentralFolderConfig(centralFolderPath);
                setSavedCentralFolderPath(centralFolderPath);
            }
        } catch (err) {
            console.error("Save central folder error:", err);
            toast.error(
                "Failed to save central folder: " +
                    (err.message || "Unknown error")
            );
        }
    };

    const handleLogout = async () => {
        try {
            await api.signOut();
            setSavedCentralFolderPath("");
            window.location.reload();
        } catch (err) {
            console.error("Logout error:", err);
            toast.error(
                "Failed to log out: " + (err.message || "Unknown error")
            );
        }
    };

    const handleChangeCentralFolder = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to change the central folder?"
        );
        if (confirmed) {
            try {
                const newPath = await api.selectCentralFolder();
                if (newPath) {
                    await api.saveCentralFolderConfig(newPath);
                    setSavedCentralFolderPath(newPath);
                    toast.success("Central folder changed successfully!");
                }
            } catch (err) {
                console.error("Change central folder error:", err);
                toast.error(
                    "Failed to change central folder: " +
                        (err.message || "Unknown error")
                );
            }
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
                <div className="fixed top-0 right-0 left-0 z-10">
                    <TitleBar />
                </div>
                <div className="flex-1 overflow-auto">
                    {loading || updating ? (
                        <Loading updating={updating} />
                    ) : (
                        <Dashboard
                            auth={auth}
                            username={username}
                            savedCentralFolderPath={savedCentralFolderPath}
                            handleLogout={handleLogout}
                            handleChangeCentralFolder={
                                handleChangeCentralFolder
                            }
                            handleSelectFolder={handleSelectFolder}
                            handleContinue={handleContinue}
                            handleLoginSuccess={(name) => {
                                setAuth(true);
                                setUsername(name);
                            }}
                            centralFolderPath={centralFolderPath}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default App;

import Login from "@components/Login";
import { useEffect, useState } from "react";
import Loading from "@components/Loading";
import ChooseCentralFolder from "@components/ChooseCentralFolder";
import Dashboard from "@components/Dashboard";
import TitleBar from "./components/TitleBar";

const App = () => {
    const [auth, setAuth] = useState(false);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [centralFolderPath, setCentralFolderPath] = useState("");
    const [savedCentralFolderPath, setSavedCentralFolderPath] = useState("");
    const [initialSyncing, setInitialSyncing] = useState(false);

    useEffect(() => {
        async function init() {
            try {
                const tokens = await window.api.getTokens();
                if (tokens?.access_token) {
                    setAuth(true);
                    const name = await window.api.getGDUserName();
                    if (name) setUsername(name);
                }
                window.api.getCentralFolderConfig().then((stored) => {
                    if (stored) {
                        setSavedCentralFolderPath(stored);
                    }
                });
            } catch (err) {
                console.error("Init error:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (auth && savedCentralFolderPath) {
            window.api
                .getSettings()
                .then(({ autoDeleteOnLaunch, autoUpdateOnLaunch }) => {
                    if (autoDeleteOnLaunch || autoUpdateOnLaunch) {
                        setInitialSyncing(true);
                        window.api
                            .syncOnLaunch()
                            .catch((e) =>
                                console.error("Sync-on-launch failed:", e)
                            )
                            .finally(() => setInitialSyncing(false));
                    }
                });
        }
    }, [auth, savedCentralFolderPath]);

    const handleSelectFolder = async () => {
        try {
            const path = await window.api.selectCentralFolder();
            if (path) {
                setCentralFolderPath(path);
            }
        } catch (err) {
            console.error("Select folder error:", err);
        }
    };

    const handleContinue = async () => {
        try {
            if (centralFolderPath) {
                await window.api.saveCentralFolderConfig(centralFolderPath);
                setSavedCentralFolderPath(centralFolderPath);
            }
        } catch (err) {
            console.error("Save central folder error:", err);
        }
    };

    const handleLogout = async () => {
        try {
            await window.api.signOut();
            window.location.reload();
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    const handleChangeCentralFolder = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to change the central folder?"
        );
        if (confirmed) {
            try {
                const newPath = await window.api.selectCentralFolder();
                if (newPath) {
                    await window.api.saveCentralFolderConfig(newPath);
                    setSavedCentralFolderPath(newPath);
                    alert("Central folder changed successfully!");
                }
            } catch (err) {
                console.error("Change central folder error:", err);
                alert("Failed to change central folder: " + err.message);
            }
        }
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <div className="fixed top-0 right-0 left-0 z-10">
                <TitleBar />
            </div>
            <div className="flex-1 overflow-auto">
                {loading || initialSyncing ? (
                    <Loading initialSyncing={initialSyncing} />
                ) : !auth ? (
                    <Login setAuth={setAuth} setUsername={setUsername} />
                ) : !username ? (
                    <div className="flex h-screen items-center justify-center">
                        <div className="text-lg text-red-600">
                            Can not retrieve username. Please log in again.
                        </div>
                    </div>
                ) : !savedCentralFolderPath ? (
                    <ChooseCentralFolder
                        username={username}
                        centralFolderPath={centralFolderPath}
                        handleSelectFolder={handleSelectFolder}
                        handleContinue={handleContinue}
                    />
                ) : (
                    <Dashboard
                        username={username}
                        savedCentralFolderPath={savedCentralFolderPath}
                        handleLogout={handleLogout}
                        handleChangeCentralFolder={handleChangeCentralFolder}
                    />
                )}
            </div>
        </div>
    );
};

export default App;

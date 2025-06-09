import Login from "@components/Login";
import { useEffect, useState } from "react";
import Loading from "@components/Loading";
import ChooseCentralFolder from "./components/ChooseCentralFolder";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faFile, faFolder } from "@fortawesome/free-solid-svg-icons";
import { faGoogleDrive } from "@fortawesome/free-brands-svg-icons";

const App = () => {
    const [auth, setAuth] = useState(false);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [centralFolderPath, setCentralFolderPath] = useState("");
    const [savedCentralFolderPath, setSavedCentralFolderPath] = useState("");

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

    if (loading) {
        return <Loading />;
    }

    if (!auth) {
        return <Login setAuth={setAuth} setUsername={setUsername} />;
    }

    if (!username) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-lg text-red-600">
                    Can not retrieve username. Please log in again.
                </div>
            </div>
        );
    }

    if (!savedCentralFolderPath) {
        return (
            <ChooseCentralFolder
                username={username}
                centralFolderPath={centralFolderPath}
                handleSelectFolder={handleSelectFolder}
                handleContinue={handleContinue}
            />
        );
    }

    return (
        <div>
            <div className="flex h-screen">
                <aside className="flex w-64 flex-col justify-between border-r bg-gray-100">
                    <div>
                        <div className="p-4 font-semibold">Users</div>
                        <ul>
                            <li className="cursor-pointer px-4 py-2 hover:bg-gray-200">
                                <FontAwesomeIcon icon={faGoogleDrive} />{" "}
                                {username}{" "}
                            </li>
                        </ul>
                    </div>
                    <button className="m-4 cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                        Log out
                    </button>
                </aside>

                <div className="flex flex-1 flex-col">
                    <header className="flex items-center justify-between border-b bg-white px-4 py-2">
                        <h1 className="font-bold">Dashboard</h1>
                    </header>

                    <main className="flex-1 bg-white p-6">
                        <div className="mb-6 flex items-center justify-between rounded border px-4 py-2">
                            <span className="overflow-hidden font-medium text-ellipsis">
                                Central path: {savedCentralFolderPath}
                            </span>
                            <button className="text-xl text-yellow-500">
                                <FontAwesomeIcon icon={faStar} />
                            </button>
                        </div>

                        <h2 className="mb-4 text-center text-lg">
                            Choose file or folder that you need to backup
                        </h2>

                        <div className="mb-6 flex items-center justify-center">
                            <input
                                type="text"
                                readOnly
                                placeholder="No file or folder selected"
                                className="w-2/3 rounded border border-gray-300 bg-gray-50 px-3 py-2"
                            />
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <div className="flex space-x-4">
                                <button className="w-40 cursor-pointer rounded bg-blue-500 py-2 text-white hover:bg-blue-600">
                                    Choose file{" "}
                                    <FontAwesomeIcon icon={faFile} />
                                </button>
                                <button className="w-40 cursor-pointer rounded bg-blue-500 py-2 text-white hover:bg-blue-600">
                                    Choose folder{" "}
                                    <FontAwesomeIcon icon={faFolder} />
                                </button>
                            </div>
                            <button className="w-40 cursor-pointer rounded bg-green-600 py-2 text-white hover:bg-green-700">
                                Sync to Drive
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;

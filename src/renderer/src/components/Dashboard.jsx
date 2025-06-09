import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faFile, faFolder } from "@fortawesome/free-solid-svg-icons";
import { faGoogleDrive } from "@fortawesome/free-brands-svg-icons";
import { useState } from "react";
import ModalConfirmLogout from "./ModalConfirmLogout";

const Dashboard = ({ username, savedCentralFolderPath, handleLogout }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const onLogoutClick = () => setShowLogoutModal(true);

    const confirmLogout = () => {
        setShowLogoutModal(false);
        handleLogout();
    };

    const cancelLogout = () => setShowLogoutModal(false);

    return (
        <div className="flex h-screen">
            <aside className="flex w-64 flex-col justify-between border-r bg-gray-100">
                <div>
                    <div className="border-b px-4 py-2 font-semibold">USER</div>
                    <ul>
                        <li className="border-radius mt-6 mr-1 ml-1 rounded-2xl bg-gray-400 px-4 py-2">
                            <FontAwesomeIcon icon={faGoogleDrive} />{" "}
                            {username}{" "}
                        </li>
                    </ul>
                </div>
                <button
                    className="m-4 cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                    onClick={onLogoutClick}
                >
                    Logout
                </button>
            </aside>

            {showLogoutModal && (
                <ModalConfirmLogout
                    confirmLogout={confirmLogout}
                    cancelLogout={cancelLogout}
                />
            )}

            <div className="flex flex-1 flex-col">
                <header className="flex items-center justify-between border-b bg-white px-4 py-2">
                    <h1 className="font-bold">DASHBOARD</h1>
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
                                Choose file <FontAwesomeIcon icon={faFile} />
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
    );
};

export default Dashboard;

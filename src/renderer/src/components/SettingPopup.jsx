import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import * as api from "../api";
import Toggle from "@components/Toggle";
import Loading from "@components/Loading";

const buttonLabels = {
    darkMode: "Dark mode",
    autoDeleteOnLaunch: "Auto delete on launch",
    autoUpdateOnLaunch: "Auto update on launch",
};

export default function SettingPopup({ onClose }) {
    const [setting, setSetting] = useState({
        darkMode: false,
        autoDeleteOnLaunch: false,
        autoUpdateOnLaunch: false,
        stopSyncPaths: [],
    });
    const [pulling, setPulling] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await api.getSettings();
                setSetting(settings);
                if (settings.darkMode) {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
            } catch (err) {
                console.error("Failed to fetch settings:", err);
                toast.error(
                    "Failed to load settings: " +
                        (err.message || "Unknown error")
                );
            }
        }
        fetchSettings();
    }, []);

    const toggle = (key) => async () => {
        const newValue = !setting[key];
        setSetting((prev) => ({ ...prev, [key]: newValue }));
        try {
            await api.updateSettings({ [key]: newValue });
            if (key === "darkMode") {
                if (newValue) {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
            }
            toast.success(`${buttonLabels[key]} updated successfully!`);
        } catch (err) {
            console.error(`Failed to update ${key}:`, err);
            toast.error(
                `Failed to update ${buttonLabels[key]}: ` +
                    (err.message || "Unknown error")
            );
        }
    };

    const handlePullDown = async () => {
        setPulling(true);
        try {
            await api.pullFromDrive();
            toast.success("Pull down successful!");
        } catch (err) {
            console.error(err);
            toast.error(
                "Failed to pull down from Drive:" +
                    (err.message || "Unknown error")
            );
        } finally {
            setPulling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-15 flex items-center justify-center bg-gray-900/20 dark:bg-gray-900/50">
            <div className="absolute inset-0 bg-black opacity-50" />

            <div className="relative w-80 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <FontAwesomeIcon icon={faCircleXmark} />
                </button>

                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Settings
                </h2>

                <div className="space-y-4">
                    {Object.keys(buttonLabels).map((key) => (
                        <Toggle
                            key={key}
                            label={buttonLabels[key]}
                            checked={setting[key]}
                            onChange={toggle(key)}
                        />
                    ))}

                    <button
                        className="w-full cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800"
                        onClick={handlePullDown}
                    >
                        Pull down from Drive
                    </button>
                    {pulling && <Loading syncing={true} />}
                </div>
            </div>
        </div>
    );
}

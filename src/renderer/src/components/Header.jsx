import { Moon, Sun } from "lucide-react";
import Toggle from "./Toggle";
import { useEffect, useState } from "react";
import * as api from "../api";
import { toast } from "react-toastify";
import icon from "@assets/icon.png";

const Header = () => {
    const [setting, setSetting] = useState({
        darkMode: false,
    });

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
        } catch (err) {
            console.error(`Failed to update ${key}:`, err);
            toast.error(
                `Failed to change to Dark mode: ` +
                    (err.message || "Unknown error")
            );
        }
    };

    return (
        <header className="flex items-center justify-between border-b bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center space-x-4">
                <img
                    src={icon}
                    alt="app-logo"
                    className="h-8 w-8 rounded-full"
                />
                <div className="flex flex-col">
                    <h1 className="flex items-center gap-2 text-xl font-medium dark:text-gray-400">
                        File Synchronizer
                    </h1>
                    <span className="text-xs text-gray-700 dark:text-gray-400">
                        Manage and synchronize your files across cloud providers
                    </span>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <Sun />
                <Toggle
                    checked={setting["darkMode"]}
                    onChange={toggle("darkMode")}
                />
                <Moon />
            </div>
        </header>
    );
};

export default Header;

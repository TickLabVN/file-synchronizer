import "./index.css";
// Supports weights 100-900
import "@fontsource-variable/roboto";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as api from "./api";

//@ts-ignore: window.api is defined in preload script
api.getSettings().then((settings) => {
    const { darkMode } = settings as { darkMode: boolean };
    if (darkMode) {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
    const rootElement = document.getElementById("root");
    if (rootElement) {
        createRoot(rootElement).render(
            <StrictMode>
                <App />
            </StrictMode>
        );
    } else {
        console.error('Root element with id "root" not found.');
    }
});

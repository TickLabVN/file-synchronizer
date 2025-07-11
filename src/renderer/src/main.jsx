import "./index.css";
// Supports weights 100-900
import "@fontsource-variable/roboto";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as api from "./api";

api.getSettings().then(({ darkMode }) => {
    if (darkMode) {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
    createRoot(document.getElementById("root")).render(
        <StrictMode>
            <App />
        </StrictMode>
    );
});

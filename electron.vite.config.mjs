import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
    },
    renderer: {
        resolve: {
            alias: {
                "@renderer": path.resolve(__dirname, "src/renderer/src"),
                "@components": path.resolve(
                    __dirname,
                    "src/renderer/src/components"
                ),
                "@assets": path.resolve(__dirname, "src/renderer/src/assets"),
            },
        },
        plugins: [react(), tailwindcss()],
    },
});

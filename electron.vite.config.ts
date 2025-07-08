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
                "@": path.resolve(__dirname, "src/renderer/src"),
                "@renderer": path.resolve(__dirname, "src/renderer/src"),
                "@components": path.resolve(
                    __dirname,
                    "src/renderer/src/components"
                ),
                "@assets": path.resolve(__dirname, "src/renderer/src/assets"),
                "@hooks": path.resolve(__dirname, "src/renderer/src/hooks"),
                "@api": path.resolve(__dirname, "src/renderer/src/api"),
            },
        },
        plugins: [react(), tailwindcss()],
    },
});

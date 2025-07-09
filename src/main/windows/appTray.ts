import { app, Tray, Menu, BrowserWindow, nativeImage } from "electron";
//@ts-ignore: Electron vites asset import
import icon from "../../../resources/icon.png?asset";

/**
 * Creates a system tray icon for the application.
 *
 * @param {BrowserWindow} mainWindow - The main application window.
 * @param {Function} [onQuit] - Optional callback function to execute before quitting.
 * @returns {Tray} The created tray instance.
 */
export default function createAppTray(
    mainWindow: BrowserWindow,
    onQuit?: () => void
): Tray {
    const tray = new Tray(nativeImage.createFromPath(icon));

    const contextMenu = Menu.buildFromTemplate([
        { label: "Open App", click: () => mainWindow.show() },
        {
            label: "Quit",
            click: () => {
                onQuit?.();
                app.quit();
            },
        },
    ]);

    tray.setToolTip("File Synchronizer");
    tray.setContextMenu(contextMenu);
    tray.on("click", () =>
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    );

    return tray;
}

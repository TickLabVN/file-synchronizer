import { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow): void {
    mainWindow = win;
}

export function getMainWindow(): BrowserWindow | null {
    return mainWindow;
}

/**
 * Broadcasts a message to all open windows.
 * @param channel The IPC channel to send the message on.
 * @param payload Optional data to send with the message.
 */
export function broadcast(channel: string, payload?: unknown): void {
    BrowserWindow.getAllWindows().forEach((w) =>
        w.webContents.send(channel, payload)
    );
}

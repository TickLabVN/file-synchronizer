import { app } from "electron";
import fs from "fs";
import path from "path";
import { autoSync } from "../handlers/sync";
import { allProviders } from "../lib/providerRegistry";
import { broadcast } from "../windows/WindowManager";

const BASE_INTERVAL = 5 * 60 * 1000;
const JITTER_RANGE = 30 * 1000;

/**
 * A function to calculate the next delay for the sync scheduler.
 * It returns a random delay based on a base interval with some jitter.
 * @returns {number} The next delay in milliseconds.
 */
function nextDelay(): number {
    return BASE_INTERVAL + (Math.random() * 2 - 1) * JITTER_RANGE;
}

/**
 * A function to sync all accounts on application launch.
 * It checks if there are any accounts registered with Google Drive or Box,
 * and if so, it performs a sync operation.
 * @returns {Promise<void>} A promise that resolves when the sync is complete.
 */
async function hasAccounts(): Promise<boolean> {
    for (const provider of allProviders()) {
        if ((await provider.listAccounts()).length) return true;
    }
    return false;
}

/**
 * A function to determine if the sync should be performed.
 * It checks if there are any Google Drive or Box tokens available
 * and if a central folder path is configured.
 * @returns {Promise<boolean>} True if sync should be performed, false otherwise.
 */
async function shouldSync(): Promise<boolean> {
    const cfgPath = path.join(app.getPath("userData"), "central-config.json");
    let centralFolderPath = null;
    try {
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        ({ centralFolderPath } = JSON.parse(raw));
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw err;
        }
    }
    return !!centralFolderPath && (await hasAccounts());
}

/**
 * Starts the sync scheduler that periodically checks if a sync should be performed
 * and executes the sync if necessary.
 */
export function startSyncScheduler(): void {
    const run = async (): Promise<void> => {
        if (await shouldSync()) {
            try {
                console.log("[Background] Starting sync...");
                await autoSync();
                console.log("[Background] sync completed");
                broadcast("app:tracked-files-updated");
            } catch (err) {
                console.error("[Background] sync error:", err);
            }
        }
        setTimeout(run, nextDelay());
    };
    run();
}

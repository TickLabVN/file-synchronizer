import { app } from "electron";
import fs from "fs";
import path from "path";
import { listGDTokens, listBoxTokens } from "../lib/credentials";
import { syncAllOnLaunch } from "../handlers/sync";
import { broadcast } from "../windows/WindowManager";

const BASE_INTERVAL = 5 * 60 * 1000;
const JITTER_RANGE = 30 * 1000;

function nextDelay(): number {
    return BASE_INTERVAL + (Math.random() * 2 - 1) * JITTER_RANGE;
}

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
    const anyGD = (await listGDTokens()).length > 0;
    const anyBX = (await listBoxTokens()).length > 0;
    return (anyGD || anyBX) && !!centralFolderPath;
}

export function startSyncScheduler(): void {
    const run = async (): Promise<void> => {
        if (await shouldSync()) {
            try {
                await syncAllOnLaunch();
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

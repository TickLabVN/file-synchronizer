import type { IpcMainInvokeEvent } from "electron";
import { getProvider, allProviders } from "../lib/providerRegistry";
import type { SyncOptions, SyncResult } from "../lib/ICloudProvider";

export async function syncFiles(
    _: IpcMainInvokeEvent,
    providerId: string,
    options: SyncOptions
): Promise<SyncResult> {
    const provider = getProvider(providerId);
    return provider.sync(options);
}

export async function pull(
    _: IpcMainInvokeEvent,
    providerId: string
): Promise<boolean> {
    const provider = getProvider(providerId);
    return provider.pull();
}

export async function autoSync(): Promise<void> {
    for (const provider of allProviders()) {
        try {
            await provider.autoSync();
        } catch (err: unknown) {
            console.error(
                `[sync] Failed to auto‑sync provider ${provider.id}:`,
                err
            );
        }
    }
}

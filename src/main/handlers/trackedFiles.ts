import { getProvider } from "../lib/providerRegistry";
import { IpcMainInvokeEvent } from "electron";

export async function trackFile(
    _: IpcMainInvokeEvent,
    providerId: string
): Promise<void> {
    const provider = getProvider(providerId);
    await provider.getTrackedFiles();
}

export async function deleteTrackedFile(
    _: IpcMainInvokeEvent,
    providerId: string,
    src: string
): Promise<boolean> {
    const provider = getProvider(providerId);
    return await provider.deleteTrackedFile(src);
}

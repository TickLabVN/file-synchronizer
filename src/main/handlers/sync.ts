import type { IpcMainInvokeEvent } from "electron";
import { getProvider, allProviders } from "../lib/providerRegistry";
import type { SyncOptions, SyncResult } from "../lib/ICloudProvider";

/**
 * Synchronizes files with the specified cloud provider.
 * @param _ - The IPC event (not used).
 * @param providerId - The ID of the cloud provider to sync with.
 * @param options - Options for the sync operation.
 * @return A promise that resolves to the result of the sync operation.
 */
export async function syncFiles(_: IpcMainInvokeEvent, providerId: string, options: SyncOptions): Promise<SyncResult> {
  const provider = getProvider(providerId);
  return provider.sync(options);
}

/**
 * Pulls the latest changes from all registered cloud providers.
 * @param _ - The IPC event (not used).
 * @param providerId - The ID of the cloud provider to pull from.
 * @return A promise that resolves to a boolean indicating success or failure.
 */
export async function pull(_: IpcMainInvokeEvent, providerId: string): Promise<boolean> {
  const provider = getProvider(providerId);
  return provider.pull();
}

/**
 * Automatically synchronizes files with all registered cloud providers.
 * @param _ - The IPC event (not used).
 * @param providerId - The ID of the cloud provider to push to.
 * @return A promise that resolves to a boolean indicating success or failure.
 */
export async function autoSync(): Promise<void> {
  for (const provider of allProviders()) {
    try {
      const accounts = await provider.listAccounts();
      for (const { id } of accounts) {
        await provider.useAccount(id);
        await provider.autoSync();
      }
    } catch (err: unknown) {
      console.error(`[sync] Failed to auto‑sync provider ${provider.id}:`, err);
    }
  }
}

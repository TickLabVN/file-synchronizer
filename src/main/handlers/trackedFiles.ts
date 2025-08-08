import { getProvider } from "../lib/providerRegistry";
import { IpcMainInvokeEvent } from "electron";

/**
 * Tracks files of a specific provider.
 * This function retrieves the tracked files for the given provider ID.
 * @param {IpcMainInvokeEvent} _ - The IPC event object (not used).
 * @param {string} providerId - The ID of the provider whose files are to be tracked.
 * @returns {Promise<void>} A promise that resolves when the tracked files are retrieved.
 */
export async function trackedFile(_: IpcMainInvokeEvent, providerId: string): Promise<unknown> {
  const provider = getProvider(providerId);
  return provider.getTrackedFiles();
}

/**
 * Deletes a tracked file for a specific provider.
 * This function removes a file from the tracked files of the given provider ID.
 * @param {IpcMainInvokeEvent} _ - The IPC event object (not used).
 * @param {string} providerId - The ID of the provider whose file is to be deleted.
 * @param {string} src - The source path of the file to be deleted.
 * @returns {Promise<boolean>} A promise that resolves to true if the file was successfully deleted, false otherwise.
 */
export async function deleteTrackedFile(_: IpcMainInvokeEvent, providerId: string, src: string): Promise<boolean> {
  const provider = getProvider(providerId);
  return await provider.deleteTrackedFile(src);
}

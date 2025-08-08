import { AccountInfo, AuthAccount } from "../lib/ICloudProvider";
import { getProvider } from "../lib/providerRegistry";
import { IpcMainInvokeEvent } from "electron";

/**
 * Handles user sign-in for a specified provider.
 * @param {IpcMainInvokeEvent} _ - The IPC event object.
 * @param {string} providerId - The ID of the authentication provider.
 * @returns {Promise<AccountInfo>} A promise that resolves to the account information of the signed-in user.
 */
export async function signIn(_: IpcMainInvokeEvent, providerId: string): Promise<AccountInfo> {
  const provider = getProvider(providerId);
  const acc: AuthAccount = await provider.signIn();
  if (!acc) {
    throw new Error("Sign-in failed or was cancelled.");
  }
  return { provider: providerId, ...acc };
}

/**
 * Lists all accounts associated with a specified provider.
 * @param {IpcMainInvokeEvent} _ - The IPC event object.
 * @param {string} providerId - The ID of the authentication provider.
 * @returns {Promise<AccountInfo[]>} A promise that resolves to an array of account information objects.
 */
export async function listAccounts(_: IpcMainInvokeEvent, providerId: string): Promise<AccountInfo[]> {
  const provider = getProvider(providerId);
  const accounts = await provider.listAccounts();
  return accounts.map((a) => ({
    provider: providerId,
    ...a,
  }));
}

/**
 * Uses a specified account for the given provider.
 * @param {IpcMainInvokeEvent} _ - The IPC event object.
 * @param {string} providerId - The ID of the authentication provider.
 * @param {string} accountId - The ID of the account to use.
 * @returns {Promise<boolean>} A promise that resolves to true if the account was successfully used, false otherwise.
 */
export async function useAccount(_: IpcMainInvokeEvent, providerId: string, accountId: string): Promise<boolean> {
  const provider = getProvider(providerId);
  return await provider.useAccount(accountId);
}

/**
 * Signs out a specified account from the given provider.
 * @param {IpcMainInvokeEvent} _ - The IPC event object.
 * @param {string} providerId - The ID of the authentication provider.
 * @param {string} accountId - The ID of the account to sign out.
 * @returns {Promise<boolean>} A promise that resolves to true if the sign-out was successful, false otherwise.
 */
export async function signOut(_: IpcMainInvokeEvent, providerId: string, accountId: string): Promise<boolean> {
  const provider = getProvider(providerId);
  return await provider.signOut(accountId);
}

/**
 * Retrieves the profile information for a specified account from the given provider.
 * @param {IpcMainInvokeEvent} _ - The IPC event object.
 * @param {string} providerId - The ID of the authentication provider.
 * @param {string} accountId - The ID of the account whose profile is to be retrieved.
 * @returns {Promise<AccountInfo>} A promise that resolves to the account profile information.
 */
export async function getProfile(_: IpcMainInvokeEvent, providerId: string, accountId: string): Promise<AccountInfo> {
  const provider = getProvider(providerId);
  const profile = await provider.getProfile(accountId);
  return { provider: providerId, ...profile };
}

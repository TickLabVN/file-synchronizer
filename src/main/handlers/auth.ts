import { getProvider } from "../lib/providerRegistry";
import { IpcMainInvokeEvent } from "electron";

export async function signIn(
    _: IpcMainInvokeEvent,
    providerId: string
): Promise<void> {
    const provider = getProvider(providerId);
    await provider.signIn();
}

export async function listAccounts(
    _: IpcMainInvokeEvent,
    providerId: string
): Promise<string[]> {
    const provider = getProvider(providerId);
    const accounts = await provider.listAccounts();
    return accounts.map((account) => account.id);
}

export async function useAccount(
    _: IpcMainInvokeEvent,
    providerId: string,
    accountId: string
): Promise<boolean> {
    const provider = getProvider(providerId);
    return await provider.useAccount(accountId);
}

export async function signOut(
    _: IpcMainInvokeEvent,
    providerId: string,
    accountId: string
): Promise<boolean> {
    const provider = getProvider(providerId);
    return await provider.signOut(accountId);
}

export async function getProfile(
    _: IpcMainInvokeEvent,
    providerId: string,
    accountId: string
): Promise<string> {
    const provider = getProvider(providerId);
    const profile = await provider.getProfile(accountId);
    return profile.displayName || "Unknown User";
}

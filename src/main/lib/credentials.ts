import keytar from "keytar";
import { store } from "./constants";

/**
 * CredentialStore is a utility class for managing credentials securely using keytar.
 * It allows adding, listing, retrieving, and deleting credentials associated with a service.
 *
 * @template T - The type of tokens stored in the credential store.
 */
export class CredentialStore<T = unknown> {
    /**
     * Creates an instance of CredentialStore.
     *
     * @param serviceName - The name of the service for which credentials are stored.
     * @param cacheKey - The key used to cache account names in the store.
     */
    constructor(
        private readonly serviceName: string,
        private readonly cacheKey: string
    ) {}

    /**
     * Creates a new instance of CredentialStore.
     *
     * @param serviceName - The name of the service for which credentials are stored.
     * @param tokens - The initial tokens to be stored in the credential store.
     * @returns A new instance of CredentialStore.
     */
    async add(account: string, tokens: T): Promise<void> {
        await keytar.setPassword(
            this.serviceName,
            account,
            JSON.stringify(tokens)
        );
        this._pushCache(account);
    }

    /**
     * Lists all stored credentials for the service.
     *
     * @returns A promise that resolves to an array of objects containing account names and their associated tokens.
     */
    async list(): Promise<{ account: string; tokens: T }[]> {
        try {
            const items = await keytar.findCredentials(this.serviceName);
            if (items.length) {
                store.set(
                    this.cacheKey,
                    items.map((i) => i.account)
                );
                return items.map((i) => ({
                    account: i.account,
                    tokens: JSON.parse(i.password),
                }));
            }
        } catch (e) {
            console.error(
                `[CredentialStore] keytar error (${this.serviceName})`,
                e
            );
        }
        const cached = store.get(this.cacheKey, []) as string[];
        return Promise.all(
            cached.map(async (account) => ({
                account,
                tokens: (await this.get(account)) as T,
            }))
        );
    }

    /**
     * Retrieves the tokens associated with a specific account.
     *
     * @param account - The account name for which to retrieve tokens.
     * @returns A promise that resolves to the tokens associated with the account, or null if not found.
     */
    async get(account: string): Promise<T | null> {
        const raw = await keytar.getPassword(this.serviceName, account);
        return raw ? (JSON.parse(raw) as T) : null;
    }

    /**
     * Deletes the credentials associated with a specific account.
     *
     * @param account - The account name for which to delete credentials.
     * @returns A promise that resolves when the credentials are deleted.
     */
    async delete(account: string): Promise<void> {
        await keytar.deletePassword(this.serviceName, account);
        this._pullCache(account);
    }

    /**
     * Pushes an account to the cache.
     * This method ensures that the account is added to the cache if it does not already exist.
     * @param account - The account name to be added to the cache.
     * @private
     */
    private _pushCache(account: string): void {
        const arr = store.get(this.cacheKey, []) as string[];
        if (!arr.includes(account)) store.set(this.cacheKey, [...arr, account]);
    }

    /**
     * Pulls an account from the cache.
     * This method removes the specified account from the cache.
     * @param account - The account name to be removed from the cache.
     * @private
     */
    private _pullCache(account: string): void {
        const arr = (store.get(this.cacheKey, []) as string[]).filter(
            (a) => a !== account
        );
        store.set(this.cacheKey, arr);
    }
}

import keytar from "keytar";
import { store } from "./constants";

export class CredentialStore<T = unknown> {
    constructor(
        private readonly serviceName: string,
        private readonly cacheKey: string
    ) {}

    async add(account: string, tokens: T): Promise<void> {
        await keytar.setPassword(
            this.serviceName,
            account,
            JSON.stringify(tokens)
        );
        this._pushCache(account);
    }

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

    async get(account: string): Promise<T | null> {
        const raw = await keytar.getPassword(this.serviceName, account);
        return raw ? (JSON.parse(raw) as T) : null;
    }

    async delete(account: string): Promise<void> {
        await keytar.deletePassword(this.serviceName, account);
        this._pullCache(account);
    }

    /* ---------- helpers ---------- */
    private _pushCache(account: string): void {
        const arr = store.get(this.cacheKey, []) as string[];
        if (!arr.includes(account)) store.set(this.cacheKey, [...arr, account]);
    }

    private _pullCache(account: string): void {
        const arr = (store.get(this.cacheKey, []) as string[]).filter(
            (a) => a !== account
        );
        store.set(this.cacheKey, arr);
    }
}

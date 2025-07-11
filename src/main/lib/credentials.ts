import keytar from "keytar";
import { constants } from "./constants.js";
const { store } = constants;

const GD_SERVICE = "com.filesynchronizer.googledrive";
const BOX_SERVICE = "com.filesynchronizer.box";

function addToList(key: string, id: string): void {
    const arr = store.get(key, []) as string[];
    if (!arr.includes(id)) store.set(key, [...arr, id]);
}

function removeFromList(key: string, id: string): void {
    const arr = (store.get(key, []) as string[]).filter((x) => x !== id);
    store.set(key, arr);
}

/** ---------------- GOOGLE DRIVE ---------------- */
function emailFromIdToken(id_token): string {
    const payload = JSON.parse(
        Buffer.from(id_token.split(".")[1], "base64").toString()
    );
    return payload.email;
}

export async function addGDTokens(tokens): Promise<string> {
    const email = emailFromIdToken(tokens.id_token);
    await keytar.setPassword(GD_SERVICE, email, JSON.stringify(tokens));
    addToList("gdAccounts", email);
    return email;
}

export async function listGDTokens(): Promise<
    { email: string; tokens: unknown }[]
> {
    try {
        const items = await keytar.findCredentials(GD_SERVICE);
        if (items.length) {
            store.set(
                "gdAccounts",
                items.map((i) => i.account)
            );
            return items.map(({ account, password }) => ({
                email: account,
                tokens: JSON.parse(password),
            }));
        }
    } catch (e) {
        console.error("[GD] keytar error → fallback", e);
    }
    const cached = store.get("gdAccounts", []) as string[];
    return await Promise.all(
        cached.map(async (email) => ({
            email,
            tokens: await getGDTokens(email),
        }))
    );
}

export async function getGDTokens(email): Promise<unknown> {
    const raw = await keytar.getPassword(GD_SERVICE, email);
    return raw ? JSON.parse(raw) : null;
}

export async function deleteGDTokens(email): Promise<void> {
    await keytar.deletePassword(GD_SERVICE, email);
    removeFromList("gdAccounts", email);
}

/** ---------------- BOX ---------------- */
export async function addBoxTokens(
    tokens: unknown,
    login: string /* login = user e-mail */
): Promise<string> {
    await keytar.setPassword(BOX_SERVICE, login, JSON.stringify(tokens));
    addToList("boxAccounts", login);
    return login;
}

export async function listBoxTokens(): Promise<
    { login: string; tokens: unknown }[]
> {
    try {
        const items = await keytar.findCredentials(BOX_SERVICE);
        if (items.length) {
            store.set(
                "boxAccounts",
                items.map((i) => i.account)
            );
            return items.map(({ account, password }) => ({
                login: account,
                tokens: JSON.parse(password),
            }));
        }
    } catch (e) {
        console.error("[BOX] keytar error → fallback", e);
    }
    const cached = store.get("boxAccounts", []) as string[];
    return await Promise.all(
        cached.map(async (login) => ({
            login,
            tokens: await getBoxTokens(login),
        }))
    );
}

export async function getBoxTokens(login): Promise<unknown> {
    const raw = await keytar.getPassword(BOX_SERVICE, login);
    return raw ? JSON.parse(raw) : null;
}

export async function deleteBoxTokens(login): Promise<void> {
    await keytar.deletePassword(BOX_SERVICE, login);
    removeFromList("boxAccounts", login);
}

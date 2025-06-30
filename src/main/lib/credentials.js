import keytar from "keytar";
import { constants } from "./constants.js";
const { store } = constants;

const GD_SERVICE = "com.filesynchronizer.googledrive";
const BOX_SERVICE = "com.filesynchronizer.box";

function addToList(key, id) {
    const arr = store.get(key, []);
    if (!arr.includes(id)) store.set(key, [...arr, id]);
}
function removeFromList(key, id) {
    const arr = store.get(key, []).filter((x) => x !== id);
    store.set(key, arr);
}

/** ---------------- GOOGLE DRIVE ---------------- */
function emailFromIdToken(id_token) {
    const payload = JSON.parse(
        Buffer.from(id_token.split(".")[1], "base64").toString()
    );
    return payload.email;
}

export async function addGDTokens(tokens) {
    const email = emailFromIdToken(tokens.id_token);
    await keytar.setPassword(GD_SERVICE, email, JSON.stringify(tokens));
    addToList("gdAccounts", email);
    return email;
}

export async function listGDTokens() {
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
    const cached = store.get("gdAccounts", []);
    return (
        await Promise.all(
            cached.map(async (email) => ({
                email,
                tokens: await getGDTokens(email),
            }))
        )
    ).filter((x) => x.tokens);
}

export async function getGDTokens(email) {
    const raw = await keytar.getPassword(GD_SERVICE, email);
    return raw ? JSON.parse(raw) : null;
}

export async function deleteGDTokens(email) {
    await keytar.deletePassword(GD_SERVICE, email);
    removeFromList("gdAccounts", email);
}

/** ---------------- BOX ---------------- */
export async function addBoxTokens(tokens, login /* login = user e-mail */) {
    await keytar.setPassword(BOX_SERVICE, login, JSON.stringify(tokens));
    addToList("boxAccounts", login);
    return login;
}

export async function listBoxTokens() {
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
    const cached = store.get("boxAccounts", []);
    return (
        await Promise.all(
            cached.map(async (login) => ({
                login,
                tokens: await getBoxTokens(login),
            }))
        )
    ).filter((x) => x.tokens);
}

export async function getBoxTokens(login) {
    const raw = await keytar.getPassword(BOX_SERVICE, login);
    return raw ? JSON.parse(raw) : null;
}

export async function deleteBoxTokens(login) {
    await keytar.deletePassword(BOX_SERVICE, login);
    removeFromList("boxAccounts", login);
}

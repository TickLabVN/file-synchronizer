import { BrowserWindow } from "electron";
import fetch from "node-fetch";
import { constants } from "../lib/constants";
import {
    addGDTokens,
    listGDTokens,
    getGDTokens,
    deleteGDTokens,
    addBoxTokens,
    listBoxTokens,
    getBoxTokens,
    deleteBoxTokens,
} from "../lib/credentials";
import icon from "../../../resources/icon.png?asset";

const { BACKEND_URL, store } = constants;

export async function handleSignIn() {
    const authUrl = `${BACKEND_URL}/auth/google`;

    return new Promise((resolve, reject) => {
        const authWin = new BrowserWindow({
            width: 500,
            height: 600,
            modal: true,
            title: "Sign in to Google Drive",
            icon: icon,
            parent: BrowserWindow.getFocusedWindow(),
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
            },
        });

        let handled = false;

        function handleRedirect(url) {
            if (url.startsWith("myapp://oauth")) {
                handled = true;
                const code = new URL(url).searchParams.get("code");
                if (!code) {
                    reject(new Error("No code returned"));
                    authWin.close();
                    return;
                }
                fetch(`${BACKEND_URL}/auth/google/token?code=${code}`)
                    .then((res) => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(async (tokens) => {
                        const payload = JSON.parse(
                            Buffer.from(
                                tokens.id_token.split(".")[1],
                                "base64"
                            ).toString()
                        );
                        const email = await addGDTokens(tokens);
                        store.set("gdActive", email);
                        await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(tokens),
                        });
                        resolve({ email, name: payload.name, tokens });
                    })
                    .catch((err) => reject(err))
                    .finally(() => authWin.close());
            }
        }

        authWin.webContents.on("will-redirect", (event, url) => {
            handleRedirect(url);
        });
        authWin.webContents.on("will-navigate", (event, url) => {
            handleRedirect(url);
        });

        authWin.on("closed", () => {
            if (!handled) {
                reject(new Error("Authentication window was closed by user"));
            }
        });

        authWin.loadURL(authUrl);
    });
}

export async function listAccounts() {
    return await listGDTokens(); // [{ email, tokens }]
}

export async function useAccount(_, email) {
    const tokens = await getGDTokens(email);
    if (!tokens) throw new Error("No saved Google Drive tokens for " + email);
    await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens),
    });
    store.set("gdActive", email);
    return true;
}

export async function handleSignOut(_, email) {
    await deleteGDTokens(email);
    if (store.get("gdActive") === email) {
        store.delete("gdActive");
    }
    return true;
}

export async function getGoogleProfile(_, email) {
    const tokens = await getGDTokens(email);
    if (!tokens?.id_token) return null;

    const payload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
    );
    return { name: payload.name || payload.email, email: payload.email };
}

export async function handleBoxSignIn() {
    const authUrl = `${BACKEND_URL}/auth/box`;

    return new Promise((resolve, reject) => {
        const authWin = new BrowserWindow({
            width: 500,
            height: 600,
            modal: true,
            title: "Sign in to Box",
            icon: icon,
            parent: BrowserWindow.getFocusedWindow(),
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                partition: `box-auth-${Date.now()}`, // Unique partition for Box auth
            },
        });

        let handled = false;

        function handleRedirect(url) {
            if (url.startsWith("myapp://oauth")) {
                handled = true;
                const code = new URL(url).searchParams.get("code");
                if (!code) {
                    reject(new Error("No code returned"));
                    authWin.close();
                    return;
                }
                fetch(`${BACKEND_URL}/auth/box/token?code=${code}`)
                    .then((res) => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(async (tokens) => {
                        await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(tokens),
                        });
                        const res = await fetch(`${BACKEND_URL}/auth/box/me`);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const data = await res.json();
                        const login = data.login;

                        await addBoxTokens(tokens, login);
                        store.set("boxActive", login);

                        resolve({ login, name: data.name, tokens });
                    })
                    .catch((err) => reject(err))
                    .finally(() => authWin.close());
            }
        }

        authWin.webContents.on("will-redirect", (event, url) => {
            handleRedirect(url);
        });
        authWin.webContents.on("will-navigate", (event, url) => {
            handleRedirect(url);
        });

        authWin.on("closed", () => {
            if (!handled) {
                reject(new Error("Authentication window was closed by user"));
            }
        });

        authWin.loadURL(authUrl);
    });
}

// --- Multi-account helpers cho renderer ---
export async function listBoxAccounts() {
    return await listBoxTokens(); // [{ login, tokens }]
}

export async function useBoxAccount(_, login) {
    const tokens = await getBoxTokens(login);
    if (!tokens) throw new Error("No saved Box tokens for " + login);
    await fetch(`${BACKEND_URL}/auth/box/set-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens),
    });
    store.set("boxActive", login);
    return true;
}

export async function handleBoxSignOut(_, login) {
    await deleteBoxTokens(login);
    if (store.get("boxActive") === login) {
        store.delete("boxActive");
    }
    return true;
}

export async function getBoxProfile() {
    // Backend đã biết “active tokens” ⇒ chỉ cần /me
    const res = await fetch(`${BACKEND_URL}/auth/box/me`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json(); // { name, login, ... }
}

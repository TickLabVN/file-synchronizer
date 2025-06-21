import { BrowserWindow } from "electron";
import fetch from "node-fetch";
import { constants } from "../lib/constants";
import {
    setTokenKeytar,
    getTokenKeytar,
    deleteTokenKeytar,
} from "../lib/credentials";
import icon from "../../../resources/icon.png?asset";

const { BACKEND_URL } = constants;

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
                        await setTokenKeytar(tokens);
                        await fetch(`${BACKEND_URL}/auth/google/set-tokens`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(tokens),
                        });
                        resolve(tokens);
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

export async function getTokens() {
    return await getTokenKeytar();
}

export async function getUserName() {
    const tokens = await getTokens();
    if (!tokens?.id_token) return null;
    const payload = tokens.id_token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    return decoded.name;
}

export async function handleSignOut() {
    await deleteTokenKeytar();
    return true;
}

import { BrowserWindow, session } from "electron";
import icon from "../../../resources/icon.png?asset";
import "dotenv/config";
import { constants } from "../lib/constants";
import fetchUserName from "../utils/fetchUserName";

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SCOPES, oauth2Client, store } =
    constants;

// Handle the request to sign in to Google Drive
export async function handleSignIn() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
    });

    return new Promise((resolve, reject) => {
        const authWin = new BrowserWindow({
            width: 500,
            height: 600,
            icon: icon,
            title: "Sign in to Google Drive",
            parent: BrowserWindow.getFocusedWindow(),
            modal: true,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
            },
        });
        const filter = { urls: [`${REDIRECT_URI}/*`] };
        let handled = false;

        function onBeforeRequestHandler(details, callback) {
            try {
                const code = new URL(details.url).searchParams.get("code");
                if (code) {
                    handled = true;
                    session.defaultSession.webRequest.onBeforeRequest(
                        filter,
                        null
                    );
                    authWin.removeAllListeners("closed");

                    const params = new URLSearchParams({
                        client_id: CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        code,
                        redirect_uri: REDIRECT_URI,
                        grant_type: "authorization_code",
                    });

                    fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: params.toString(),
                    })
                        .then((res) => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            return res.json();
                        })
                        .then((tokens) => {
                            store.set("google-drive-tokens", tokens);
                            oauth2Client.setCredentials(tokens);
                            resolve(tokens);
                        })
                        .catch((err) => reject(err))
                        .finally(() => authWin.close());
                    return;
                }
                callback({ cancel: false });
            } catch (err) {
                session.defaultSession.webRequest.onBeforeRequest(filter, null);
                reject(err);
                authWin.close();
            }
        }

        session.defaultSession.webRequest.onBeforeRequest(
            filter,
            onBeforeRequestHandler
        );

        authWin.on("closed", () => {
            session.defaultSession.webRequest.onBeforeRequest(filter, null);
            if (!handled) {
                reject(new Error("Authentication window was closed by user"));
            }
        });

        authWin.loadURL(authUrl);
    });
}

// Handle the request to get saved tokens
export async function getTokens() {
    return store.get("google-drive-tokens") || null;
}

// Listen for token changes and save them
oauth2Client.on("tokens", (tokens) => {
    const current = store.get("google-drive-tokens", {});
    store.set("google-drive-tokens", { ...current, ...tokens });
});

// Handle the request to get the user's display name
export async function getUserName() {
    if (!oauth2Client.credentials.access_token) return null;
    const name = await fetchUserName(oauth2Client);
    store.set("google-drive-username", name);
    return name;
}

// Handle signing out of Google Drive
export async function handleSignOut() {
    store.delete("google-drive-tokens");
    store.delete("google-drive-username");
    return true;
}

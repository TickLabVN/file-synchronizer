import dotenv from "dotenv";
dotenv.config();

const { DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET } = process.env;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

const REDIRECT_URI = `${BACKEND_URL}/auth/dropbox/callback`;

if (!DROPBOX_CLIENT_ID || !DROPBOX_CLIENT_SECRET) {
    console.error("Missing Dropbox OAuth credentials");
    process.exit(1);
}

export const DROPBOX = {
    clientId: DROPBOX_CLIENT_ID,
    clientSecret: DROPBOX_CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
};

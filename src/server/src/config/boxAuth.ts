import BoxSDK from "box-node-sdk";
import dotenv from "dotenv";
dotenv.config();

const {
    BOX_CLIENT_ID,
    BOX_CLIENT_SECRET,
    BACKEND_URL = "http://localhost:3000",
} = process.env as Record<string, string | undefined>;

if (!BOX_CLIENT_ID || !BOX_CLIENT_SECRET) {
    console.error("Missing Box OAuth credentials");
    process.exit(1);
}

export const SCOPES: string = [].join(" ");

export const REDIRECT_URI: string = `${BACKEND_URL}/auth/box/callback`;

export const sdk = new BoxSDK({
    clientID: BOX_CLIENT_ID,
    clientSecret: BOX_CLIENT_SECRET,
});

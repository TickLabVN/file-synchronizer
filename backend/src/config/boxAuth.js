import BoxSDK from "box-node-sdk";
import dotenv from "dotenv";
dotenv.config();

const { BOX_CLIENT_ID, BOX_CLIENT_SECRET } = process.env;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

if (!BOX_CLIENT_ID || !BOX_CLIENT_SECRET) {
    console.error("Missing Box OAuth credentials");
    process.exit(1);
}

export const SCOPES = [].join(" ");

export const REDIRECT_URI = `${BACKEND_URL}/auth/box/callback`;

export const sdk = new BoxSDK({
    clientID: BOX_CLIENT_ID,
    clientSecret: BOX_CLIENT_SECRET,
});

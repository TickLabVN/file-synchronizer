import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Missing OAuth credentials");
    process.exit(1);
}

export const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "openid",
    "email",
    "profile",
];

const REDIRECT_URI = `${BACKEND_URL}/auth/google/callback`;

export const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

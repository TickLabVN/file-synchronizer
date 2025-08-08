import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BACKEND_URL = "http://localhost:3000",
} = process.env as Record<string, string | undefined>;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("Missing OAuth credentials");
  process.exit(1);
}

export const SCOPES: string[] = ["https://www.googleapis.com/auth/drive.file", "openid", "email", "profile"];

export const REDIRECT_URI: string = `${BACKEND_URL}/auth/google/callback`;

export const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

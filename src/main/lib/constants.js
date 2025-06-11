import "dotenv/config";
import { google } from "googleapis";
import Store from "electron-store";

// Ensure the environment variables are set
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Initialize the OAuth2 client with the credentials
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Create an instance of electron-store to manage settings
const store = new Store();

// Create an instance of electron-store to manage settings
const mapping = store.get("driveMapping", {});

export const constants = {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    SCOPES,
    oauth2Client,
    store,
    mapping,
};

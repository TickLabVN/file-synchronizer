import { google, drive_v3 } from "googleapis";
import axios from "axios";
import { constants } from "../lib/constants";
import "dotenv/config";

const { BACKEND_URL } = constants;

// * Function to get Google Drive client with OAuth2 credentials
/**
 * Retrieves a Google Drive client instance using OAuth2 credentials.
 * This function fetches the OAuth tokens from the backend and sets them
 * on an OAuth2 client, which is then used to create a Google Drive API client.
 * @returns {Promise<google.drive_v3.Drive>} A Google Drive client instance
 */
export default async function getDriveClient(): Promise<drive_v3.Drive> {
    const res = await axios.get(`${BACKEND_URL}/auth/google/refresh-tokens`);
    const tokens = res.data;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);

    return google.drive({ version: "v3", auth: oauth2Client });
}

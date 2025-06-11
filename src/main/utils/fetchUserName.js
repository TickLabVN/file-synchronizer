import { google } from "googleapis";

// * Fetch the user's display name from Google Drive
/**
 * Fetches the user's display name from Google Drive using the provided OAuth2 client.
 *
 * @param {object} oauth2Client - The OAuth2 client instance authenticated with Google Drive.
 */
export default async function fetchUserName(oauth2Client) {
    const drv = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drv.about.get({ fields: "user(displayName)" });
    return res.data.user.displayName;
}

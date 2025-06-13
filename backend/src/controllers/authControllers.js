import { oauth2Client, SCOPES } from "../config/googleAuth.js";

// Redirects user to Google's consent page
export const auth = (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        state: req.query.state || "",
    });
    res.redirect(url);
};

// Handles OAuth callback and returns code to client app
export const callback = (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.error("No code in callback");
        return res.status(400).send("Missing code");
    }
    res.redirect(`myapp://oauth?code=${encodeURIComponent(code)}`);
};

// Exchanges authorization code for tokens
export const getToken = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: "Missing code" });
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        res.json(tokens);
    } catch (err) {
        console.error("Token exchange error", err);
        res.status(500).json({ error: "Token exchange failed" });
    }
};

// Sets tokens on the OAuth2 client (from stored credentials)
export const setTokens = (req, res) => {
    const tokens = req.body;
    if (!tokens) {
        return res.status(400).json({ error: "Missing tokens" });
    }
    oauth2Client.setCredentials(tokens);
    res.sendStatus(200);
};

// Refreshes access token using refresh token
export const refreshTokens = async (req, res) => {
    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        res.json(credentials);
    } catch (err) {
        console.error("Error in /auth/get-tokens:", err);
        res.status(500).json({ error: "Failed to fetch tokens" });
    }
};

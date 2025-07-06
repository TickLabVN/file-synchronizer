import { oauth2Client, SCOPES } from "../config/driveAuth";
import { Request, Response } from "express";

// Redirects user to Google's consent page
export const auth = (req: Request, res: Response): void => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        state: typeof req.query.state === "string" ? req.query.state : "",
    });
    res.redirect(url);
};

// Handles OAuth callback and returns code to client app
export const callback = (req: Request, res: Response): Response | void => {
    const code = Array.isArray(req.query.code)
        ? req.query.code[0]
        : req.query.code;
    if (typeof code !== "string" || !code)
        return res.status(400).send("Missing code");
    res.redirect(`myapp://oauth?code=${encodeURIComponent(code)}`);
};

// Exchanges authorization code for tokens
export const getToken = async (
    req: Request,
    res: Response
): Promise<Response | void> => {
    const code = Array.isArray(req.query.code)
        ? req.query.code[0]
        : req.query.code;
    if (typeof code !== "string" || !code)
        return res.status(400).send("Missing code");
    try {
        const { tokens } = await oauth2Client.getToken(code);
        res.json(tokens);
    } catch (err) {
        console.error("Token exchange error", err);
        res.status(500).json({ error: "Token exchange failed" });
    }
};

// Sets tokens on the OAuth2 client (from stored credentials)
export const setTokens = (req: Request, res: Response): Response | void => {
    const tokens = req.body;
    if (!tokens) {
        return res.status(400).json({ error: "Missing tokens" });
    }
    oauth2Client.setCredentials(tokens);
    res.sendStatus(200);
};

// Refreshes access token using refresh token
export const refreshTokens = async (
    req: Request,
    res: Response
): Promise<Response | void> => {
    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        res.json(credentials);
    } catch (err) {
        console.error("Error in /auth/google/refresh-tokens:", err);
        res.status(500).json({ error: "Failed to fetch tokens" });
    }
};

import { Request, Response, RequestHandler, NextFunction } from "express";
import { oauth2Client, SCOPES } from "../config/driveAuth.js";

// Redirects user to Google's consent page
// This is called when the user wants to connect their Google Drive account
export const auth: RequestHandler = (req: Request, res: Response): void => {
    const url: Record<string, string> = {
        scope: SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
    };

    if (req.query.state) {
        url.state = req.query.state as string;
    }

    const authUrl: string = oauth2Client.generateAuthUrl(url);
    if (!authUrl) {
        console.error("Failed to generate Google Drive authorization URL");
        res.status(500).send(
            "Failed to generate Google Drive authorization URL"
        );
        return;
    }
    res.redirect(authUrl);
};

// Handles OAuth callback and returns code to client app
// This is called after user authorizes the app
export const callback: RequestHandler = (req: Request, res: Response): void => {
    const code = Array.isArray(req.query.code)
        ? req.query.code[0]
        : req.query.code;

    if (typeof code !== "string" || !code) {
        res.status(400).send("Missing code");
        return;
    }

    res.redirect(`myapp://oauth?code=${encodeURIComponent(code)}`);
};

// Exchanges authorization code for tokens
// This is used to get access and refresh tokens after user authorizes the app
export const getToken: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const code = Array.isArray(req.query.code)
        ? req.query.code[0]
        : req.query.code;

    if (typeof code !== "string" || !code) {
        res.status(400).send("Missing code");
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        res.json(tokens);
    } catch (err) {
        next(err);
    }
};

// Sets tokens on the OAuth2 client (from stored credentials)
// This is used to initialize the client with tokens
export const setTokens: RequestHandler = (
    req: Request,
    res: Response
): void => {
    const tokens = req.body;
    if (!tokens) {
        console.error("No tokens provided in request body");
        res.status(400).send("No tokens provided");
        return;
    }
    oauth2Client.setCredentials(tokens);
    res.sendStatus(200);
};

// Refreshes access token using refresh token
// This is used when the access token has expired
export const refreshTokens: RequestHandler = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        res.json(credentials);
    } catch (err) {
        next(err);
    }
};

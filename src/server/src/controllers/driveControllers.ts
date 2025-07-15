import { Request, Response, RequestHandler, NextFunction } from "express";
import { oauth2Client, SCOPES } from "../config/driveAuth.js";

/**
 * Redirects user to Google Drive's authorization page
 * This is called when the user wants to connect their Google Drive account
 * @param req - Express request object
 * @param res - Express response object
 * @return void
 */
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

/**
 * Handles OAuth callback and redirects to client app with code
 * This is called after user authorizes the app
 * @param req - Express request object
 * @param res - Express response object
 * @returns void
 */
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

/**
 * Exchanges authorization code for access and refresh tokens
 * This is used to get tokens after user authorizes the app
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns void
 */
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

/**
 * Sets the tokens in the OAuth2 client
 * This is used to set tokens after user authorizes the app
 * @param req - Express request object
 * @param res - Express response object
 * @returns void
 */
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

/**
 * Refreshes access tokens using the refresh token
 * This is used to refresh tokens when they expire
 * @param _req - Express request object (not used)
 * @param res - Express response object
 * @param next - Express next function
 * @returns void
 */
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

import { Request, Response, RequestHandler, NextFunction } from "express";
import { sdk, SCOPES, REDIRECT_URI } from "../config/boxAuth.js";

interface Tokens {
    accessToken: string;
    refreshToken: string;
    accessTokenTTLMS: number;
}

interface TokenInfo extends Tokens {
    acquiredAtMS: number;
}

// Initialize token info and Box client
// These will be set after user authorizes the app
let tokenInfo: TokenInfo | null = null;
let boxClient: ReturnType<typeof sdk.getPersistentClient> | null = null;

// Redirects user to Box's authorization page
// This is called when the user wants to connect their Box account
export const auth: RequestHandler = (req: Request, res: Response): void => {
    const params: Record<string, string> = {
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
    };
    if (req.query.state) {
        params.state = req.query.state as string;
    }
    const url: string = sdk.getAuthorizeURL(params);
    if (!url) {
        console.error("Failed to generate Box authorization URL");
        res.status(500).send("Failed to generate authorization URL");
        return;
    }
    res.redirect(url);
};

// Handles OAuth callback and redirects to client app with code
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

// Exchanges authorization code for access and refresh tokens
// This is used to get tokens after user authorizes the app
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
        const { accessToken, refreshToken, accessTokenTTLMS }: Tokens =
            (await sdk.getTokensAuthorizationCodeGrant(code, null)) as Tokens;

        res.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: Math.floor(accessTokenTTLMS / 1000),
        });
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
    const { access_token, refresh_token, expires_in = 3600 } = req.body || {};
    if (!access_token || !refresh_token) {
        res.status(400).json({ error: "Missing access or refresh token" });
        return;
    }

    tokenInfo = {
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenTTLMS: expires_in * 1000,
        acquiredAtMS: Date.now(),
    } as TokenInfo;

    const tokenStore = {
        read: async () => tokenInfo,
        write: async (updated: Tokens) => {
            tokenInfo = {
                ...updated,
                acquiredAtMS: Date.now(),
            } as TokenInfo;
        },
        clear: async () => {
            tokenInfo = null;
        },
    };

    boxClient = sdk.getPersistentClient(tokenInfo, tokenStore);

    res.sendStatus(200);
};

// Refreshes access token using refresh token
// This is used when the access token has expired
export const refreshTokens: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { refresh_token } = req.body || {};

    if (!refresh_token) {
        res.status(400).json({ error: "Missing refresh token" });
        return;
    }

    try {
        const { accessToken, refreshToken, accessTokenTTLMS }: Tokens =
            (await sdk.getTokensRefreshGrant(refresh_token)) as Tokens;

        res.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: Math.floor(accessTokenTTLMS / 1000),
        });
    } catch (err) {
        next(err);
    }
};

// Gets current user's information
// This is used to fetch user details after authentication
export const me: RequestHandler = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!boxClient) {
            console.error("Box client not initialized");
            res.status(500).json({ error: "Box client not initialized" });
            return;
        }
        const me: unknown = await boxClient.users.get(
            boxClient.CURRENT_USER_ID
        );
        if (!me || typeof me !== "object") {
            console.error("Invalid user data from Box");
            res.status(500).json({ error: "Invalid user data" });
            return;
        }
        res.json(me);
    } catch (err) {
        next(err);
    }
};

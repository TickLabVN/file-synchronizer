import { Request, Response } from "express";
import { sdk, SCOPES, REDIRECT_URI } from "../config/boxAuth";
interface Tokens {
    accessToken: string;
    refreshToken: string;
    accessTokenTTLMS: number;
}

// Redirects user to Box's authorization page
export const auth = (req: Request, res: Response): void => {
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
    }
    res.redirect(url);
};

// Handles OAuth callback and redirects to client app with code
export const callback = (req: Request, res: Response): Response | void => {
    const code = Array.isArray(req.query.code)
        ? req.query.code[0]
        : req.query.code;
    if (typeof code !== "string" || !code)
        return res.status(400).send("Missing code");
    res.redirect(`myapp://oauth?code=${encodeURIComponent(code)}`);
};

// Exchanges authorization code for access and refresh tokens
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
        const { accessToken, refreshToken, accessTokenTTLMS }: Tokens =
            (await sdk.getTokensAuthorizationCodeGrant(code, null)) as Tokens;

        res.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: Math.floor(accessTokenTTLMS / 1000),
        });
    } catch (err) {
        console.error("Box token exchange error", err);
        res.status(500).json({ error: "Token exchange failed" });
    }
};

// Sets tokens on the OAuth2 client (from stored credentials)
interface TokenInfo extends Tokens {
    acquiredAtMS: number;
}

let tokenInfo: TokenInfo | null = null;
let boxClient: ReturnType<typeof sdk.getPersistentClient> | null = null;

export const setTokens = (req: Request, res: Response): Response | void => {
    const { access_token, refresh_token, expires_in = 3600 } = req.body || {};
    if (!access_token || !refresh_token)
        return res.status(400).json({ error: "Missing tokens" });
    tokenInfo = {
        access_token,
        refresh_token,
        acquiredAtMS: Date.now(),
        expires_in: expires_in,
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenTTLMS: expires_in * 1000,
    } as unknown as TokenInfo;

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

    return res.sendStatus(200);
};

export const me = async (
    _req: Request,
    res: Response
): Promise<Response | void> => {
    try {
        if (!boxClient)
            return res.status(400).json({ error: "Client not ready" });
        const me = await boxClient.users.get(boxClient.CURRENT_USER_ID);
        return res.json(me);
    } catch (e) {
        console.error("Box me error:", e);
        return res.status(500).json({ error: "Failed to get user" });
    }
};

// Refreshes access token using refresh token
export const refreshTokens = async (
    req: Request,
    res: Response
): Promise<Response | void> => {
    const { refresh_token } = req.body || {};
    if (!refresh_token)
        return res.status(400).json({ error: "Missing refresh token" });
    try {
        const { accessToken, refreshToken, accessTokenTTLMS } =
            await sdk.getTokensRefreshGrant(refresh_token);

        res.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: Math.floor(accessTokenTTLMS / 1000),
        });
    } catch (err) {
        console.error("Box refresh error", err);
        if (
            err &&
            typeof err === "object" &&
            "statusCode" in err &&
            "message" in err
        ) {
            const statusCode =
                (err as { statusCode?: number }).statusCode || 500;
            const message =
                (err as { message?: string }).message || "Unknown error";
            res.status(statusCode).json({ error: message });
        } else {
            res.status(500).json({ error: "Unknown error" });
        }
    }
};

import { sdk, SCOPES, REDIRECT_URI } from "../config/boxAuth.js";

// Redirects user to Box's authorization page
export const auth = (req, res) => {
    const url = sdk.getAuthorizeURL({
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        state: req.query.state || "",
        scope: SCOPES,
    });
    res.redirect(url);
};

// Handles OAuth callback and redirects to client app with code
export const callback = (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code");
    res.redirect(`myapp://oauth?code=${encodeURIComponent(code)}`);
};

// Exchanges authorization code for access and refresh tokens
export const getToken = async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
        const { accessToken, refreshToken, accessTokenTTLMS } =
            await sdk.getTokensAuthorizationCodeGrant(code, null, REDIRECT_URI);

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
let tokenInfo;
let boxClient;

export const setTokens = (req, res) => {
    const { access_token, refresh_token, expires_in } = req.body || {};
    if (!access_token || !refresh_token)
        return res.status(400).json({ error: "Missing tokens" });
    const ttlSec = expires_in || 3600;
    tokenInfo = {
        accessToken: access_token,
        refreshToken: refresh_token,
        acquiredAtMS: Date.now(),
        accessTokenTTLMS: ttlSec * 1000,
    };

    const tokenStore = {
        read: async () => tokenInfo,
        write: async (updated) => {
            tokenInfo = updated;
        },
        clear: async () => {
            tokenInfo = null;
        },
    };

    boxClient = sdk.getPersistentClient(tokenInfo, tokenStore);

    return res.sendStatus(200);
};

export const me = async (_req, res) => {
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
export const refreshTokens = async (req, res) => {
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
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

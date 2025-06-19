import { DROPBOX } from "../config/dropboxAuth.js";
import querystring from "querystring";
import fetch from "node-fetch";

export const authDropbox = (req, res) => {
    const params = querystring.stringify({
        response_type: "code",
        client_id: DROPBOX.clientId,
        redirect_uri: DROPBOX.redirectUri,
        state: req.query.state || "",
        token_access_type: "offline",
    });
    res.redirect(`${DROPBOX.authUrl}?${params}`);
};

export const callbackDropbox = (req, res) => {
    const { code, error, state } = req.query;
    if (error) {
        return res.status(400).send(`Error: ${error}`);
    }
    res.redirect(
        `myapp://oauth?provider=dropbox&code=${encodeURIComponent(code)}&state=${state || ""}`
    );
};

export const getDropboxToken = async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const body = querystring.stringify({
        code,
        grant_type: "authorization_code",
        client_id: DROPBOX.clientId,
        client_secret: DROPBOX.clientSecret,
        redirect_uri: DROPBOX.redirectUri,
    });

    try {
        const response = await fetch(DROPBOX.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        const tokens = await response.json();
        if (tokens.error) throw tokens;
        res.json(tokens);
    } catch (err) {
        console.error("Dropbox token exchange error", err);
        res.status(500).json({ error: "Token exchange failed" });
    }
};

export const refreshDropboxToken = async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token)
        return res.status(400).json({ error: "Missing refresh_token" });

    const body = querystring.stringify({
        grant_type: "refresh_token",
        refresh_token,
        client_id: DROPBOX.clientId,
        client_secret: DROPBOX.clientSecret,
    });

    try {
        const response = await fetch(DROPBOX.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        const tokens = await response.json();
        if (tokens.error) throw tokens;
        res.json(tokens);
    } catch (err) {
        console.error("Dropbox refresh token error", err);
        res.status(500).json({ error: "Refresh token failed" });
    }
};

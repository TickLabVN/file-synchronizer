import { Request, Response, RequestHandler, NextFunction } from "express";
import { sdk, SCOPES, REDIRECT_URI } from "../config/boxAuth.js";

/**
 * Box OAuth2 tokens interface
 * This is used to define the structure of tokens returned by Box
 */
interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenTTLMS: number;
}

/**
 * Token info interface
 * This extends Tokens to include the time when tokens were acquired
 */
interface TokenInfo extends Tokens {
  acquiredAtMS: number;
}

/**
 * Box OAuth2 client token information
 * This is used to store the current token state
 */
let tokenInfo: TokenInfo | null = null;
let boxClient: ReturnType<typeof sdk.getPersistentClient> | null = null;

/**
 * Redirects user to Box's authorization page
 * This is called when the user wants to connect their Box account
 * @param req - Express request object
 * @param res - Express response object
 * @return void
 */
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

/**
 * Handles OAuth callback and redirects to client app with code
 * This is called after user authorizes the app
 * @param req - Express request object
 * @param res - Express response object
 * @returns void
 */
export const callback: RequestHandler = (req: Request, res: Response): void => {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

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
export const getToken: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

  if (typeof code !== "string" || !code) {
    res.status(400).send("Missing code");
    return;
  }

  try {
    const { accessToken, refreshToken, accessTokenTTLMS }: Tokens = (await sdk.getTokensAuthorizationCodeGrant(
      code,
      null
    )) as Tokens;

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.floor(accessTokenTTLMS / 1000),
    });
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
export const setTokens: RequestHandler = (req: Request, res: Response): void => {
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

/**
 * Refreshes access tokens using the refresh token
 * This is used to refresh tokens when they expire
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns void
 */
export const refreshTokens: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { refresh_token } = req.body || {};

  if (!refresh_token) {
    res.status(400).json({ error: "Missing refresh token" });
    return;
  }

  try {
    const { accessToken, refreshToken, accessTokenTTLMS }: Tokens = (await sdk.getTokensRefreshGrant(
      refresh_token
    )) as Tokens;

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.floor(accessTokenTTLMS / 1000),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Gets the current user's information from Box
 * This is used to get user details after authorization
 * @param _req - Express request object (not used)
 * @param res - Express response object
 * @param next - Express next function
 * @returns void
 */
export const me: RequestHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!boxClient) {
      console.error("Box client not initialized");
      res.status(500).json({ error: "Box client not initialized" });
      return;
    }
    const me: unknown = await boxClient.users.get(boxClient.CURRENT_USER_ID);
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

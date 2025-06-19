import { Router } from "express";
import {
    auth,
    callback,
    getToken,
    setTokens,
    refreshTokens,
} from "../controllers/driveControllers.js";

import {
    authDropbox,
    callbackDropbox,
    getDropboxToken,
    refreshDropboxToken,
} from "../controllers/dropboxControllers.js";

const router = Router();

router.get("/google", auth);
router.get("/google/callback", callback);
router.get("/token", getToken);
router.post("/set-tokens", setTokens);
router.get("/get-tokens", refreshTokens);

router.get("/dropbox", authDropbox);
router.get("/dropbox/callback", callbackDropbox);
router.get("/dropbox/token", getDropboxToken);
router.post("/dropbox/refresh-token", refreshDropboxToken);

export default router;

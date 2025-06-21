import { Router } from "express";
import {
    auth,
    callback,
    getToken,
    setTokens,
    refreshTokens,
} from "../controllers/driveControllers.js";

const router = Router();

router.get("/", auth);
router.get("/callback", callback);
router.get("/token", getToken);
router.post("/set-tokens", setTokens);
router.get("/refresh-tokens", refreshTokens);

export default router;

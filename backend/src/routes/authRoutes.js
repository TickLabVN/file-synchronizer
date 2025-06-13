import { Router } from "express";
import {
    auth,
    callback,
    getToken,
    setTokens,
    refreshTokens,
} from "../controllers/authControllers.js";

const router = Router();

router.get("/google", auth);
router.get("/google/callback", callback);
router.get("/token", getToken);
router.post("/set-tokens", setTokens);
router.get("/get-tokens", refreshTokens);

export default router;

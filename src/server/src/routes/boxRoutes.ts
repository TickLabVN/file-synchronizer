import { Router } from "express";
import {
    auth,
    callback,
    getToken,
    setTokens,
    refreshTokens,
    me,
} from "../controllers/boxControllers.js";

const router: Router = Router();

router.get("/", auth);
router.get("/callback", callback);
router.get("/token", getToken);
router.post("/set-tokens", setTokens);
router.post("/refresh-tokens", refreshTokens);
router.get("/me", me);

export default router;

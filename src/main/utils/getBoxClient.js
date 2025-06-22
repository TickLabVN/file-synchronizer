import axios from "axios";
import { constants } from "../lib/constants";
import "dotenv/config";
import BoxSDK from "box-node-sdk";
import { getBoxTokenKeytar, setBoxTokenKeytar } from "../lib/credentials";
const { BACKEND_URL } = constants;
export async function getBoxClient() {
    const stored = await getBoxTokenKeytar();
    if (!stored?.refresh_token) {
        throw new Error("No Box refresh token available");
    }

    const { data: tokens } = await axios.post(
        `${BACKEND_URL}/auth/box/refresh-tokens`,
        { refresh_token: stored.refresh_token }
    );

    await setBoxTokenKeytar(tokens);

    await axios.post(`${BACKEND_URL}/auth/box/set-tokens`, tokens);

    return BoxSDK.getBasicClient(tokens.access_token);
}

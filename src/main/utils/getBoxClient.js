import axios from "axios";
import { constants } from "../lib/constants";
import "dotenv/config";
import BoxSDK from "box-node-sdk";
import { getBoxTokens, addBoxTokens } from "../lib/credentials"; // <── helpers đa-tài-khoản

const { BACKEND_URL, store } = constants;

export async function getBoxClient() {
    const login = store.get("boxActive");
    if (!login) throw new Error("No active Box account selected");

    let stored = await getBoxTokens(login);
    if (!stored?.refresh_token) {
        throw new Error(`No refresh token for Box account ${login}`);
    }

    const { data: tokens } = await axios.post(
        `${BACKEND_URL}/auth/box/refresh-tokens`,
        { refresh_token: stored.refresh_token }
    );

    await addBoxTokens(tokens, login);

    await axios.post(`${BACKEND_URL}/auth/box/set-tokens`, tokens);

    return BoxSDK.getBasicClient(tokens.access_token);
}

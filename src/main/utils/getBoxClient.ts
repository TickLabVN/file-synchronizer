import axios from "axios";
import { constants } from "../lib/constants";
import "dotenv/config";
import BoxSDK from "box-node-sdk";
import { getBoxTokens, addBoxTokens } from "../lib/credentials"; // <── helpers đa-tài-khoản
const { BACKEND_URL, store } = constants;
type BoxClient = ReturnType<typeof BoxSDK.getBasicClient>;

export async function getBoxClient(): Promise<BoxClient> {
    const login = store.get("boxActive");
    if (!login) throw new Error("No active Box account selected");

    const stored = (await getBoxTokens(login)) as { refresh_token?: string };
    if (!stored.refresh_token) {
        throw new Error(`No refresh token for Box account ${login}`);
    }

    const {
        data: tokens,
    }: { data: { access_token: string; refresh_token: string } } =
        await axios.post(`${BACKEND_URL}/auth/box/refresh-tokens`, {
            refresh_token: stored.refresh_token,
        });

    await addBoxTokens(tokens, String(login));

    await axios.post(`${BACKEND_URL}/auth/box/set-tokens`, tokens);

    return BoxSDK.getBasicClient(tokens.access_token);
}

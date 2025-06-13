import keytar from "keytar";

const SERVICE = "com.filesynchronizer.googledrive";
const ACCOUNT = "user-tokens";

export async function setTokenKeytar(tokens) {
    await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
}

export async function getTokenKeytar() {
    const stored = await keytar.getPassword(SERVICE, ACCOUNT);
    return stored ? JSON.parse(stored) : null;
}

export async function deleteTokenKeytar() {
    await keytar.deletePassword(SERVICE, ACCOUNT);
}

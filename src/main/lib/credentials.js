import keytar from "keytar";

const SERVICE = "com.filesynchronizer.googledrive";
const BOX_SERVICE = "com.filesynchronizer.box";
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

export async function setBoxTokenKeytar(tokens) {
    await keytar.setPassword(BOX_SERVICE, ACCOUNT, JSON.stringify(tokens));
}

export async function getBoxTokenKeytar() {
    const stored = await keytar.getPassword(BOX_SERVICE, ACCOUNT);
    return stored ? JSON.parse(stored) : null;
}

export async function deleteBoxTokenKeytar() {
    await keytar.deletePassword(BOX_SERVICE, ACCOUNT);
}

import keytar from "keytar";

const GD_SERVICE = "com.filesynchronizer.googledrive";
const BOX_SERVICE = "com.filesynchronizer.box";

/** ---------------- GOOGLE DRIVE ---------------- */
function emailFromIdToken(id_token) {
    const payload = JSON.parse(
        Buffer.from(id_token.split(".")[1], "base64").toString()
    );
    return payload.email;
}

export async function addGDTokens(tokens) {
    const email = emailFromIdToken(tokens.id_token);
    await keytar.setPassword(GD_SERVICE, email, JSON.stringify(tokens));
    return email;
}

export async function listGDTokens() {
    const items = await keytar.findCredentials(GD_SERVICE);
    return items.map(({ account, password }) => ({
        email: account,
        tokens: JSON.parse(password),
    }));
}

export async function getGDTokens(email) {
    const raw = await keytar.getPassword(GD_SERVICE, email);
    return raw ? JSON.parse(raw) : null;
}

export async function deleteGDTokens(email) {
    await keytar.deletePassword(GD_SERVICE, email);
}

/** ---------------- BOX ---------------- */
export async function addBoxTokens(tokens, login /* login = user e-mail */) {
    await keytar.setPassword(BOX_SERVICE, login, JSON.stringify(tokens));
    return login;
}

export async function listBoxTokens() {
    const items = await keytar.findCredentials(BOX_SERVICE);
    return items.map(({ account, password }) => ({
        login: account,
        tokens: JSON.parse(password),
    }));
}

export async function getBoxTokens(login) {
    const raw = await keytar.getPassword(BOX_SERVICE, login);
    return raw ? JSON.parse(raw) : null;
}

export async function deleteBoxTokens(login) {
    await keytar.deletePassword(BOX_SERVICE, login);
}

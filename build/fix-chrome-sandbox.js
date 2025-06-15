import fs from "fs";
import path from "path";

export default async function afterPack(context) {
    const sandbox = path.join(context.appOutDir, "chrome-sandbox");
    try {
        fs.chownSync(sandbox, 0, 0);
        fs.chmodSync(sandbox, 0o4755);
        console.log("chrome-sandbox permissions fixed");
    } catch (e) {
        console.warn("Failed to fix chrome-sandbox permissions:", e);
    }
}

import path from "path";
import { constants } from "../lib/constants";
const { boxMapping } = constants;

export default async function cleanupBox(srcPath, client) {
    const toRemove = Object.keys(boxMapping).filter(
        (p) => p === srcPath || p.startsWith(srcPath + path.sep)
    );
    for (const p of toRemove) {
        const rec = boxMapping[p];
        if (rec) {
            try {
                if (rec.isFolder) {
                    await client.folders.delete(rec.id, { recursive: true });
                } else {
                    await client.files.delete(rec.id);
                }
                console.log(`Deleted on Drive (cleanup): ${p} => ID=${rec.id}`);
            } catch (err) {
                console.error(`Failed to delete ${p} on Drive:`, err);
            }
        }
        delete boxMapping[p];
    }
}

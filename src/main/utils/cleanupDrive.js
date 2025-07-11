import path from "path";
import { constants } from "../lib/constants";
const { mapping } = constants;

export async function cleanupDrive(srcPath, drive) {
    const toRemove = Object.keys(mapping).filter(
        (p) => p === srcPath || p.startsWith(srcPath + path.sep)
    );
    for (const p of toRemove) {
        const rec = mapping[p];
        if (rec) {
            try {
                await drive.files.delete({ fileId: rec.id });
                console.log(`Deleted on Drive (cleanup): ${p} => ID=${rec.id}`);
            } catch (err) {
                console.error(`Failed to delete ${p} on Drive:`, err);
            }
        }
        delete mapping[p];
    }
}

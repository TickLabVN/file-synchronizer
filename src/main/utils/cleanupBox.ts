import path from "path";
import { constants } from "../lib/constants";
const { boxMapping } = constants;

interface BoxMappingRecord {
    id: string;
    isFolder: boolean;
    // add other properties if needed
}

export default async function cleanupBox(
    srcPath: string,
    client: {
        folders: {
            delete: (
                id: string,
                options: { recursive: boolean }
            ) => Promise<void>;
        };
        files: { delete: (id: string) => Promise<void> };
    }
): Promise<void> {
    const toRemove = Object.keys(boxMapping as object).filter(
        (p) => p === srcPath || p.startsWith(srcPath + path.sep)
    );
    for (const p of toRemove) {
        const rec = (boxMapping as Record<string, BoxMappingRecord>)[p];
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
        delete (boxMapping as Record<string, BoxMappingRecord>)[p];
    }
}

import path from "path";
import { constants } from "../lib/constants";
const { mapping } = constants;

type MappingType = { [key: string]: { id: string } }; // Adjust the value type as needed

interface DriveType {
    files: {
        delete: (options: { fileId: string }) => Promise<void>;
    };
}

export async function cleanupDrive(
    srcPath: string,
    drive: DriveType
): Promise<void> {
    const typedMapping = mapping as MappingType;
    const toRemove = Object.keys(typedMapping).filter(
        (p) => p === srcPath || p.startsWith(srcPath + path.sep)
    );
    for (const p of toRemove) {
        const rec = typedMapping[p];
        if (rec) {
            try {
                await drive.files.delete({ fileId: rec.id });
                console.log(`Deleted on Drive (cleanup): ${p} => ID=${rec.id}`);
            } catch (err) {
                console.error(`Failed to delete ${p} on Drive:`, err);
            }
        }
        delete typedMapping[p];
    }
}

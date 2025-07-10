import path from "path";
import { constants } from "../lib/constants";
import { drive_v3 } from "googleapis";
const { driveMapping } = constants;

type MappingType = { [key: string]: { id: string } }; // Adjust the value type as needed

export async function cleanupDrive(
    srcPath: string,
    drive: drive_v3.Drive
): Promise<void> {
    const typedMapping = driveMapping as MappingType;
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

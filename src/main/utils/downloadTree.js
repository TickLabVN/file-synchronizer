import path from "path";
import fs from "fs";
import { constants } from "../lib/constants";
const { mapping } = constants;

// * This function downloads a tree structure from Google Drive to a local directory.
/**
 * Download a tree structure from Google Drive to a local directory.
 * It recursively downloads folders and files, creating the necessary local directories.
 * If a file already exists, it skips downloading that file.
 * @param {string} parentId - The ID of the parent folder in Google Drive.
 * @param {string} localDir - The local directory where the files and folders will be downloaded.
 * @param {object} drive - The authenticated Google Drive API client.
 */
export default async function downloadTree(parentId, localDir, drive) {
    await fs.promises.mkdir(localDir, { recursive: true });
    const entries = Array.isArray(arguments[3]) ? arguments[3] : [];
    let pageToken = null;
    do {
        const { data } = await drive.files.list({
            q: `'${parentId}' in parents and trashed=false`,
            fields: "nextPageToken, files(id, name, mimeType, appProperties)",
            pageToken,
        });

        for (const file of data.files) {
            const orig = file.appProperties?.originalPath;
            const origOs = file.appProperties?.os;
            const isSameOs = origOs === process.platform;
            let targetPath;
            if (orig && isSameOs) {
                targetPath = orig;
            } else {
                targetPath = path.join(localDir, file.name);
            }
            const isFolder =
                file.mimeType === "application/vnd.google-apps.folder";
            mapping[targetPath] = { id: file.id, parentId };
            entries.push({ path: targetPath, id: file.id, parentId });
            if (isFolder) {
                await downloadTree(file.id, targetPath, drive, entries);
            } else {
                await fs.promises.mkdir(path.dirname(targetPath), {
                    recursive: true,
                });
                if (!isSameOs) {
                    try {
                        await fs.promises.access(targetPath, fs.constants.F_OK);
                        continue;
                        // eslint-disable-next-line no-empty
                    } catch {}
                }

                const dest = fs.createWriteStream(targetPath);
                const res = await drive.files.get(
                    { fileId: file.id, alt: "media" },
                    { responseType: "stream" }
                );
                await new Promise((resolve, reject) => {
                    res.data.on("end", resolve).on("error", reject).pipe(dest);
                });
            }
        }
        pageToken = data.nextPageToken;
    } while (pageToken);

    return entries;
}

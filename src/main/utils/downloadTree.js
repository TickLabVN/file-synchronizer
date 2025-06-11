import path from "path";
import fs from "fs";

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

    let pageToken = null;
    do {
        const { data } = await drive.files.list({
            q: `'${parentId}' in parents and trashed=false`,
            fields: "nextPageToken, files(id, name, mimeType)",
            pageToken,
        });

        for (const file of data.files) {
            const targetPath = path.join(localDir, file.name);
            const isFolder =
                file.mimeType === "application/vnd.google-apps.folder";

            if (isFolder) {
                await downloadTree(file.id, targetPath, drive);
            } else {
                try {
                    await fs.promises.access(targetPath, fs.constants.F_OK);
                    continue;
                    // eslint-disable-next-line no-empty
                } catch {}

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
}

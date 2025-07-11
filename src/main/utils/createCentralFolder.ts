import { app } from "electron";
import path from "path";
import fs from "fs";

// Default central folder name
const DEFAULT_FOLDER_NAME = "__ticklabfs_central";

// Path to config file storing central folder
const cfgPath = path.join(app.getPath("userData"), "central-config.json");

/**
 * Creates a central folder for the application if it does not already exist.
 * The path to the central folder is stored in a central-config.json file.
 *
 * @returns {Promise<string>} The path to the central folder.
 */
export default async function createCentralFolder(): Promise<string> {
    try {
        // Read the existing config file
        const raw = await fs.promises.readFile(cfgPath, "utf-8");
        const { centralFolderPath } = JSON.parse(raw);

        // Check if the central folder already exists
        if (centralFolderPath && fs.existsSync(centralFolderPath)) {
            return centralFolderPath;
        }
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw err;
        }
    }

    // Create the central folder in the user data directory
    const centralFolderPath = path.join(
        app.getPath("userData"),
        DEFAULT_FOLDER_NAME
    );
    await fs.promises.mkdir(centralFolderPath, { recursive: true });

    // Save the new path to the config file
    await fs.promises.writeFile(
        cfgPath,
        JSON.stringify({ centralFolderPath }, null, 2)
    );

    return centralFolderPath;
}

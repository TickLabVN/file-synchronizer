import GoogleDriveProvider from "../providers/GoogleDrive.Provider";
import BoxProvider from "../providers/Box.Provider";
import { registerProvider } from "../lib/providerRegistry";

export default async function provider(): Promise<void> {
    registerProvider(new GoogleDriveProvider());
    registerProvider(new BoxProvider());
}

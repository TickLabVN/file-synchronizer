import GoogleDriveProvider from "../providers/GoogleDrive.Provider";
import BoxProvider from "../providers/Box.Provider";
import { registerProvider } from "../lib/providerRegistry";

/**
 * Registers cloud providers for the application.
 * This function initializes the cloud providers and registers them,
 * allowing them to be used within the application.
 * @returns {Promise<void>} A promise that resolves when the providers are registered.
 */
export default async function provider(): Promise<void> {
  registerProvider(new GoogleDriveProvider());
  registerProvider(new BoxProvider());
}

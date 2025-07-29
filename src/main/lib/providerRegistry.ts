import type { ICloudProvider } from "./ICloudProvider";

const providers = new Map<string, ICloudProvider>();

/**
 * Registers a cloud provider.
 * @param p The cloud provider to register.
 * @throws Error if a provider with the same id already exists.
 */
export function registerProvider(p: ICloudProvider): void {
  providers.set(p.id, p);
}

/**
 * Gets a cloud provider by its id.
 * @param id The id of the provider to retrieve.
 * @returns The cloud provider with the specified id.
 */
export function getProvider(id: string): ICloudProvider {
  const p = providers.get(id);
  if (!p) throw new Error(`Provider with id "${id}" not found`);
  return p;
}

/**
 * Select all registered cloud providers.
 * @returns An array of all registered cloud providers.
 */
export function allProviders(): ICloudProvider[] {
  return [...providers.values()];
}

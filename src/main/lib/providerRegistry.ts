import type { ICloudProvider } from "./ICloudProvider";

const providers = new Map<string, ICloudProvider>();

export function registerProvider(p: ICloudProvider): void {
    providers.set(p.id, p);
}

export function getProvider(id: string): ICloudProvider {
    const p = providers.get(id);
    if (!p) throw new Error(`Provider with id "${id}" not found`);
    return p;
}

export function allProviders(): ICloudProvider[] {
    return [...providers.values()];
}

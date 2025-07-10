import { RemoteMeta } from "./types";

class MappingStore {
    private data = new Map<string, RemoteMeta>();

    get(path: string): RemoteMeta | undefined {
        return this.data.get(path);
    }
    set(path: string, meta: RemoteMeta): void {
        this.data.set(path, meta);
    }
    delete(path: string): void {
        this.data.delete(path);
    }
    deleteSubtree(root: string): void {
        for (const k of this.keys())
            if (k === root || k.startsWith(root + "/")) this.data.delete(k);
    }
    keys(): string[] {
        return [...this.data.keys()];
    }
    touch(path: string): void {
        const m = this.get(path);
        if (m) m.lastSync = new Date().toISOString();
    }
}

export const mappingStore = new MappingStore();

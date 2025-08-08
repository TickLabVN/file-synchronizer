import path from "path";
import { mappingStore } from "./mappingStore";

/**
 * A utility function to pick root paths for a given account and provider.
 * It filters the mapping store to find paths that belong to the specified account and provider,
 * and ensures that only the shortest unique paths are returned.
 * @param {string} account - The account identifier.
 * @param {string} provider - The provider identifier.
 * @returns {string[]} An array of unique root paths for the specified account and provider.
 */
export default function pickRootPaths(account: string, provider: string): string[] {
  const all = [...mappingStore.keys()]
    .filter((p) => {
      const r = mappingStore.get(p);
      return r && r.account === account && r.provider === provider;
    })
    .sort((a, b) => a.length - b.length);

  const roots: string[] = [];
  for (const p of all) {
    if (!roots.some((r) => p.startsWith(r + path.sep))) roots.push(p);
  }
  return roots;
}

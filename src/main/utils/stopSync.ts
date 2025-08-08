import path from "path";
import { store } from "../lib/constants";

/**
 * Loads the stop and resume lists from the configuration store.
 * It retrieves the paths where sync should be stopped and resumed.
 * @returns {Object} An object containing stop and resume paths.
 */
export function loadStopLists(): { stop: string[]; resume: string[] } {
  const { stopSyncPaths = [], resumeSyncPaths = [] } = store.get("settings", {}) as Record<string, string[]>;
  return { stop: stopSyncPaths, resume: resumeSyncPaths };
}

/**
 * Checks if a given path is in the stop list and not in the resume list.
 * It determines if sync should be stopped for the specified path.
 * @param {string} p - The path to check.
 * @param {string[]} stop - The list of paths where sync should be stopped.
 * @param {string[]} resume - The list of paths where sync should be resumed.
 * @returns {boolean} True if sync should be stopped for the path, false otherwise.
 */
export function isStopped(p: string, stop: string[], resume: string[]): boolean {
  const SEP = path.sep;
  const inStop = stop.some((s) => p === s || p.startsWith(s + SEP));
  const inResume = resume.some((r) => p === r || p.startsWith(r + SEP));
  return inStop && !inResume;
}

export function mergeUnique<T extends { path: string }>(prev: T[], next: T[]): T[] {
  const existed = new Set(prev.map((it) => it.path));
  return [...prev, ...next.filter((it) => !existed.has(it.path))];
}

export function pruneExcluded(prevExcluded: string[], newItems: Array<{ path: string }>): string[] {
  if (!newItems?.length) return prevExcluded;
  return prevExcluded.filter((ex) => {
    return !newItems.some((it) => ex === it.path || ex.startsWith(it.path + "/") || ex.startsWith(it.path + "\\"));
  });
}

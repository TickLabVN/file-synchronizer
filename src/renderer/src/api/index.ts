declare global {
    interface Window {
        api: {
            /* ---------- Auth ---------- */
            signIn: (providerId: string) => Promise<unknown>;
            listAccounts: (providerId: string) => Promise<unknown>;
            useAccount: (
                providerId: string,
                accountId: string
            ) => Promise<unknown>;
            getProfile: (
                providerId: string,
                accountId: string
            ) => Promise<unknown>;
            signOut: (
                providerId: string,
                accountId: string
            ) => Promise<unknown>;

            /* ---------- File system ---------- */
            selectFiles: () => Promise<unknown>;
            selectFolders: () => Promise<unknown>;
            listDirectory: (path: string) => Promise<unknown>;
            openInExplorer: (path: string) => Promise<unknown>;

            /* ---------- Settings ---------- */
            getSettings: () => Promise<unknown>;
            setSettings: (settings: unknown) => Promise<unknown>;

            /* ---------- Sync ---------- */
            syncFiles: (
                providerId: string,
                options: unknown
            ) => Promise<unknown>;
            pull: (providerId: string) => Promise<unknown>;
            autoSync: () => Promise<unknown>;

            /* ---------- Tracked files ---------- */
            trackedFile: (providerId: string) => Promise<unknown>;
            deleteTrackedFile: (
                providerId: string,
                src: string
            ) => Promise<unknown>;

            /* ---------- Events từ main ---------- */
            onUpdateAvailable: (cb: unknown) => void;
            onUpdateDownloaded: (cb: unknown) => void;
            onTrackedFilesUpdated: (cb: unknown) => void;
        };
    }
}

type Provider = "google" | "box";
const G: Provider = "google";
const B: Provider = "box";

/* ------------------------------------------------------------------ */
/*                          Authentication                           */
/* ------------------------------------------------------------------ */
export const signIn = (): Promise<unknown> => window.api.signIn(G);
export const boxSignIn = (): Promise<unknown> => window.api.signIn(B);

export const listAccounts = (): Promise<unknown> => window.api.listAccounts(G);
export const listBoxAccounts = (): Promise<unknown> =>
    window.api.listAccounts(B);

export const useAccount = (email: string): Promise<unknown> =>
    window.api.useAccount(G, email);
export const useBoxAccount = (login: string): Promise<unknown> =>
    window.api.useAccount(B, login);

export const getProfile = (email: string): Promise<unknown> =>
    window.api.getProfile(G, email);
export const getBoxProfile = (login: string): Promise<unknown> =>
    window.api.getProfile(B, login);

export const signOut = (email: string): Promise<unknown> =>
    window.api.signOut(G, email);
export const boxSignOut = (login: string): Promise<unknown> =>
    window.api.signOut(B, login);

/* ------------------------------------------------------------------ */
/*                           File system                              */
/* ------------------------------------------------------------------ */
export const selectFiles = (): Promise<unknown> => window.api.selectFiles();
export const selectFolders = (): Promise<unknown> => window.api.selectFolders();
export const listDirectory = (path: string): Promise<unknown> =>
    window.api.listDirectory(path);
export const openInExplorer = (path: string): Promise<unknown> =>
    window.api.openInExplorer(path);

/* ------------------------------------------------------------------ */
/*                             Settings                               */
/* ------------------------------------------------------------------ */
export const getSettings = (): Promise<unknown> => window.api.getSettings();
/* Giữ tên cũ `updateSettings` để JSX hiện tại không phải đổi */
export const updateSettings = (settings: unknown): Promise<unknown> =>
    window.api.setSettings(settings);

/* ------------------------------------------------------------------ */
/*                               Sync                                 */
/* ------------------------------------------------------------------ */
export const syncFiles = (options: unknown): Promise<unknown> =>
    window.api.syncFiles(G, options);
export const syncBoxFiles = (options: unknown): Promise<unknown> =>
    window.api.syncFiles(B, options);

export const pullFromDrive = (): Promise<unknown> => window.api.pull(G);
export const pullFromBox = (): Promise<unknown> => window.api.pull(B);

export const syncOnLaunch = (): Promise<unknown> => window.api.autoSync();
export const syncBoxOnLaunch = (): Promise<unknown> => window.api.autoSync();

/* ------------------------------------------------------------------ */
/*                          Tracked files                             */
/* ------------------------------------------------------------------ */
export const getTrackedFiles = (): Promise<unknown> =>
    window.api.trackedFile(G);
export const getTrackedFilesBox = (): Promise<unknown> =>
    window.api.trackedFile(B);

export const deleteTrackedFile = (src: string): Promise<unknown> =>
    window.api.deleteTrackedFile(G, src);
export const deleteTrackedFileBox = (src: string): Promise<unknown> =>
    window.api.deleteTrackedFile(B, src);

/* ------------------------------------------------------------------ */
/*                             Events                                 */
/* ------------------------------------------------------------------ */
export const onUpdateAvailable = (cb: unknown): void =>
    window.api.onUpdateAvailable(cb);
export const onUpdateDownloaded = (cb: unknown): void =>
    window.api.onUpdateDownloaded(cb);
export const onTrackedFilesUpdated = (cb: unknown): void =>
    window.api.onTrackedFilesUpdated(cb);

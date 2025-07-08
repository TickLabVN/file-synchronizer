// Extend the Window interface to include the 'api' property
declare global {
    interface Window {
        api: {
            signIn: () => unknown;
            listAccounts: () => unknown;
            useAccount: (email: unknown) => unknown;
            getProfile: (email: unknown) => unknown;
            signOut: (email: unknown) => unknown;
            boxSignIn: () => unknown;
            listBoxAccounts: () => unknown;
            useBoxAccount: (login: unknown) => unknown;
            getBoxProfile: (login: unknown) => unknown;
            boxSignOut: (login: unknown) => unknown;
            selectFiles: () => unknown;
            selectFolders: () => unknown;
            selectStopSyncFiles: () => unknown;
            listDirectory: (path: unknown) => unknown;
            openInExplorer: (path: unknown) => unknown;
            getSettings: () => unknown;
            updateSettings: (settings: unknown) => unknown;
            syncFiles: (paths: unknown) => unknown;
            syncOnLaunch: () => unknown;
            pullFromDrive: () => unknown;
            syncBoxFiles: (paths: unknown) => unknown;
            syncBoxOnLaunch: () => unknown;
            pullFromBox: () => unknown;
            onUpdateAvailable: (cb: unknown) => unknown;
            onUpdateDownloaded: (cb: unknown) => unknown;
            getTrackedFiles: () => unknown;
            onTrackedFilesUpdated: (cb: unknown) => unknown;
            deleteTrackedFile: (file: unknown) => unknown;
            getTrackedFilesBox: () => unknown;
            deleteTrackedFileBox: (file: unknown) => unknown;
        };
    }
}

// API for authentication
export const signIn = (): unknown => window.api.signIn();
export const listAccounts = (): unknown => window.api.listAccounts();
export const useAccount = (email: unknown): unknown =>
    window.api.useAccount(email);
export const getProfile = (email: unknown): unknown =>
    window.api.getProfile(email);
export const signOut = (email: unknown): unknown => window.api.signOut(email);
// API for Box authentication
export const boxSignIn = (): unknown => window.api.boxSignIn();
export const listBoxAccounts = (): unknown => window.api.listBoxAccounts();
export const useBoxAccount = (login: unknown): unknown =>
    window.api.useBoxAccount(login);
export const getBoxProfile = (login: unknown): unknown =>
    window.api.getBoxProfile(login);
export const boxSignOut = (login: unknown): unknown =>
    window.api.boxSignOut(login);

// API for file and folder selection
export const selectFiles = (): unknown => window.api.selectFiles();
export const selectFolders = (): unknown => window.api.selectFolders();
export const selectStopSyncFiles = (): unknown =>
    window.api.selectStopSyncFiles();
export const listDirectory = (path: unknown): unknown =>
    window.api.listDirectory(path);
export const openInExplorer = (path: unknown): unknown =>
    window.api.openInExplorer(path);

// API for settings management
export const getSettings = (): unknown => window.api.getSettings();
export const updateSettings = (settings: unknown): unknown =>
    window.api.updateSettings(settings);

// API for sync related functions
export const syncFiles = (paths: unknown): unknown =>
    window.api.syncFiles(paths);
export const syncOnLaunch = (): unknown => window.api.syncOnLaunch();
export const pullFromDrive = (): unknown => window.api.pullFromDrive();
export const syncBoxFiles = (paths: unknown): unknown =>
    window.api.syncBoxFiles(paths);
export const syncBoxOnLaunch = (): unknown => window.api.syncBoxOnLaunch();
export const pullFromBox = (): unknown => window.api.pullFromBox();

// API for update related functions
export const onUpdateAvailable = (cb: unknown): unknown =>
    window.api.onUpdateAvailable(cb);
export const onUpdateDownloaded = (cb: unknown): unknown =>
    window.api.onUpdateDownloaded(cb);

// API for tracked files
export const getTrackedFiles = (): unknown => window.api.getTrackedFiles();
export const onTrackedFilesUpdated = (cb: unknown): unknown =>
    window.api.onTrackedFilesUpdated(cb);
export const deleteTrackedFile = (file: unknown): unknown =>
    window.api.deleteTrackedFile(file);
export const getTrackedFilesBox = (): unknown =>
    window.api.getTrackedFilesBox();
export const deleteTrackedFileBox = (file: unknown): unknown =>
    window.api.deleteTrackedFileBox(file);

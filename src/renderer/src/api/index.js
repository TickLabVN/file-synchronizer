// API for authentication
export const signIn = () => window.api.signIn();
export const listAccounts = () => window.api.listAccounts();
export const useAccount = (email) => window.api.useAccount(email);
export const getProfile = (email) => window.api.getProfile(email);
export const signOut = (email) => window.api.signOut(email);
// API for Box authentication
export const boxSignIn = () => window.api.boxSignIn();
export const listBoxAccounts = () => window.api.listBoxAccounts();
export const useBoxAccount = (login) => window.api.useBoxAccount(login);
export const getBoxProfile = (login) => window.api.getBoxProfile(login);
export const boxSignOut = (login) => window.api.boxSignOut(login);

// API for file and folder selection
export const selectFiles = () => window.api.selectFiles();
export const selectFolders = () => window.api.selectFolders();
export const selectStopSyncFiles = () => window.api.selectStopSyncFiles();

// API for settings management
export const getSettings = () => window.api.getSettings();
export const updateSettings = (settings) => window.api.updateSettings(settings);

// API for sync related functions
export const syncFiles = (paths) => window.api.syncFiles(paths);
export const syncOnLaunch = () => window.api.syncOnLaunch();
export const pullFromDrive = () => window.api.pullFromDrive();
export const syncBoxFiles = (paths) => window.api.syncBoxFiles(paths);
export const syncBoxOnLaunch = () => window.api.syncBoxOnLaunch();
export const pullFromBox = () => window.api.pullFromBox();

// API for update related functions
export const onUpdateAvailable = (cb) => window.api.onUpdateAvailable(cb);
export const onUpdateDownloaded = (cb) => window.api.onUpdateDownloaded(cb);

// API for tracked files
export const getTrackedFiles = () => window.api.getTrackedFiles();
export const onTrackedFilesUpdated = (cb) =>
    window.api.onTrackedFilesUpdated(cb);
export const deleteTrackedFile = (file) => window.api.deleteTrackedFile(file);
export const getTrackedFilesBox = () => window.api.getTrackedFilesBox();
export const deleteTrackedFileBox = (file) =>
    window.api.deleteTrackedFileBox(file);

// API for connect with Drive
export const signIn = () => window.api.signIn();
export const getTokens = () => window.api.getTokens();
export const getGDUserName = () => window.api.getGDUserName();
export const signOut = () => window.api.signOut();

// API for central folder management
export const selectCentralFolder = () => window.api.selectCentralFolder();
export const getCentralFolderConfig = () => window.api.getCentralFolderConfig();
export const saveCentralFolderConfig = (path) =>
    window.api.saveCentralFolderConfig(path);

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

// API for update related functions
export const onUpdateAvailable = (cb) => window.api.onUpdateAvailable(cb);
export const onUpdateDownloaded = (cb) => window.api.onUpdateDownloaded(cb);

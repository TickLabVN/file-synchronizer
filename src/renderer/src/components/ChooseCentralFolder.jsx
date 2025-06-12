const ChooseCentralFolder = ({
    username,
    centralFolderPath,
    handleSelectFolder,
    handleContinue,
}) => {
    return (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 dark:bg-gray-800">
            <div className="space-y-6 p-6">
                <h1 className="text-center text-2xl font-semibold dark:text-white">
                    Welcome,{" "}
                    <span className="text-blue-600 dark:text-blue-400">
                        {username}
                    </span>
                </h1>

                <p className="text-center text-gray-700 dark:text-gray-300">
                    Please choose a central folder to sync your files with
                    Google Drive. This folder will be used to store all your
                    synced files and folders. Make sure to select a folder that
                    is easily accessible.
                </p>

                <div className="flex items-center justify-center space-x-4">
                    <label className="flex-shrink-0 font-medium dark:text-gray-200">
                        Central Folder:
                    </label>
                    <input
                        type="text"
                        value={centralFolderPath}
                        placeholder="Choose a central folder to sync files"
                        readOnly
                        className="w-72 rounded border border-gray-300 bg-gray-50 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        required
                    />
                    <button
                        onClick={handleSelectFolder}
                        className="cursor-pointer rounded bg-blue-500 px-4 py-2 font-medium text-white transition hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        Choose Folder
                    </button>
                </div>
            </div>
            {centralFolderPath && (
                <button
                    className="mx-auto cursor-pointer rounded bg-green-700 px-4 py-2 font-medium text-white transition hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800"
                    onClick={handleContinue}
                >
                    Continue
                </button>
            )}
        </div>
    );
};

export default ChooseCentralFolder;

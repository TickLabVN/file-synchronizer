const ModalConfirmDelete = ({ cancelDelete, confirmDelete }) => {
    return (
        <div className="fixed inset-0 z-15 flex items-center justify-center dark:bg-gray-900/50">
            <div className="absolute inset-0 bg-black opacity-50" />

            <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold dark:text-gray-200">
                    Confirm Delete Cloud Provider
                </h2>
                <p className="mb-6 dark:text-gray-200">
                    Do you want to delete this cloud provider?
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={cancelDelete}
                        className="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                        No
                    </button>
                    <button
                        onClick={confirmDelete}
                        className="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-600 dark:text-gray-200 dark:hover:bg-red-700"
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalConfirmDelete;

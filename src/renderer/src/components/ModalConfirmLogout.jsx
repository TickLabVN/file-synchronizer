const ModalConfirmLogout = ({ cancelLogout, confirmLogout }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black opacity-50" />

            {/* Modal box */}
            <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold">Confirm Logout</h2>
                <p className="mb-6">Do you want to Logout?</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={cancelLogout}
                        className="cursor-pointer rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                    >
                        No
                    </button>
                    <button
                        onClick={confirmLogout}
                        className="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalConfirmLogout;
